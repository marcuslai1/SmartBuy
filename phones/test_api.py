from decimal import Decimal
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from phones.models import Phone
from django.utils.timezone import make_aware
from datetime import datetime


class RecommendationAPITest(APITestCase):
    def setUp(self):
        # Create two baseline phones used for most tests
        Phone.objects.create(
            model="TestPhone A", slug="testphone-a", brand="TestBrand",
            source_url="http://example.com/a", warranty="1",
            soc_score=9, ram_gb=8, storage_gb=128, battery_mah=5000,
            display_in=6.5, refresh_hz=120, ppi=400, charging_w=30,
            main_mp=50, front_mp=20, res_w=1080, res_h=2400, bt_ver=5.2,
            has_nfc=True, has_fast_charging=True, has_5g=True,
            has_wireless_charging=False, has_reverse_wireless_charging=False,
            has_ois=True, has_stereo_speakers=True, has_aptx=False, has_ldac=False,
            price_sgd=399.00, price_url="http://price.com/a",
            scraped_at=make_aware(datetime.now())
        )
        Phone.objects.create(
            model="TestPhone B", slug="testphone-b", brand="TestBrand",
            source_url="http://example.com/b", warranty="2",
            soc_score=6, ram_gb=4, storage_gb=64, battery_mah=4000,
            display_in=6.0, refresh_hz=60, ppi=300, charging_w=15,
            main_mp=12, front_mp=8, res_w=720, res_h=1600, bt_ver=4.2,
            has_nfc=False, has_fast_charging=False, has_5g=False,
            has_wireless_charging=False, has_reverse_wireless_charging=False,
            has_ois=False, has_stereo_speakers=False, has_aptx=False, has_ldac=False,
            price_sgd=149.00, price_url="http://price.com/b",
            scraped_at=make_aware(datetime.now())
        )

    # Check default budget mode returns both phones with scores
    def test_default_budget_mode(self):
        url = reverse("recommendation")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        self.assertIn("smartbuy_score", response.data[0])
        self.assertIn("raw_score", response.data[0])
        self.assertIn("score", response.data[0])

    # Ensure filtering by brand returns correct results
    def test_filter_by_brand(self):
        url = reverse("recommendation")
        response = self.client.get(url, {"brand": "TestBrand"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

    # Verify max_price filter excludes phones above threshold
    def test_filter_by_max_price(self):
        url = reverse("recommendation")
        response = self.client.get(url, {"max_price": 200})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["slug"], "testphone-b")

    # Check flagship mode sorts by flagship score descending
    def test_mode_flagship_sorting(self):
        url = reverse("recommendation")
        response = self.client.get(url, {"mode": "flagship"})
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data[0]["score"], response.data[1]["score"])

    # Ensure invalid mode falls back to budget mode
    def test_invalid_mode_defaults_to_budget(self):
        url = reverse("recommendation")
        response = self.client.get(url, {"mode": "nonsense"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

    # Check midrange mode sorts by midrange score descending
    def test_mode_midrange_sorting(self):
        url = reverse("recommendation")
        response = self.client.get(url, {"mode": "midrange"})
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data[0]["score"], response.data[1]["score"])

    def test_filter_returns_empty(self):
        url = reverse("recommendation")
        response = self.client.get(url, {"max_price": 50})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    # Check brand filter works case-insensitively
    def test_brand_filter_case_insensitive(self):
        url = reverse("recommendation")
        resp_upper = self.client.get(url, {"brand": "TestBrand"})
        resp_lower = self.client.get(url, {"brand": "testbrand"})
        self.assertEqual(resp_upper.status_code, 200)
        self.assertEqual(resp_lower.status_code, 200)
        self.assertEqual(len(resp_upper.data), 2)
        self.assertEqual(len(resp_lower.data), 2)

    # Confirm multiple filters combine correctly
    def test_all_filters_combined(self):
        url = reverse("recommendation")
        params = {"brand": "TestBrand", "max_price": 200}
        response = self.client.get(url, params)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["slug"], "testphone-b")

    # Ensure unknown brand returns empty list
    def test_nonexistent_brand_returns_empty(self):
        url = reverse("recommendation")
        response = self.client.get(url, {"brand": "NonexistentBrand"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    # Validate all returned scores are within [0,1]
    def test_scores_normalized_range(self):
        url = reverse("recommendation")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        for phone in response.data:
            self.assertGreaterEqual(phone["score"], 0)
            self.assertLessEqual(phone["score"], 1)

    # Ensure results are sorted descending by score
    def test_results_sorted_by_score_desc(self):
        url = reverse("recommendation")
        response = self.client.get(url, {"mode": "midrange"})
        self.assertEqual(response.status_code, 200)
        scores = [phone["score"] for phone in response.data]
        self.assertEqual(scores, sorted(scores, reverse=True))

    # Invalid max_price (non-numeric) should return HTTP 400
    def test_invalid_max_price_returns_400(self):
        url = reverse("recommendation")
        response = self.client.get(url, {"max_price": "notanumber"})
        self.assertEqual(response.status_code, 400)

    # Numeric brand input should not match, return empty list
    def test_numeric_brand_returns_empty(self):
        url = reverse("recommendation")
        response = self.client.get(url, {"brand": "12345"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    # Check brand priority ordering in ranking (Apple > Google > Samsung > Unknown)
    def test_camera_pipeline_prior_affects_rank(self):
        url = reverse("recommendation")
        for brand in ("UnknownCo", "Samsung", "Google", "Apple"):
            Phone.objects.create(
                model=f"Cam-{brand}", slug=f"cam-{brand}".lower(), brand=brand,
                source_url="http://x", warranty="1",
                soc_score=6, ram_gb=8, storage_gb=128, battery_mah=4500,
                display_in=6.1, refresh_hz=120, ppi=400, charging_w=30,
                main_mp=50, front_mp=12, res_w=1080, res_h=2400, bt_ver=5.2,
                has_nfc=True, has_fast_charging=True, has_5g=True,
                has_wireless_charging=False, has_reverse_wireless_charging=False,
                has_ois=True, has_stereo_speakers=False, has_aptx=False, has_ldac=False,
                price_sgd=399.00, price_url="http://x",
                scraped_at=make_aware(datetime.now())
            )
        resp = self.client.get(url, {"mode": "midrange"})
        self.assertEqual(resp.status_code, 200)
        names = [p["slug"] for p in resp.data if p["slug"].startswith("cam-")]
        self.assertEqual(names, ["cam-apple", "cam-google", "cam-samsung", "cam-unknownco"])

    # Verify IP rating improves raw score
    def test_ip_parsing_and_scoring(self):
        url = reverse("recommendation")
        base = dict(
            source_url="http://x", warranty="1",
            soc_score=6, ram_gb=8, storage_gb=128, battery_mah=4500,
            display_in=6.1, refresh_hz=120, ppi=400, charging_w=30,
            main_mp=50, front_mp=12, res_w=1080, res_h=2400, bt_ver=5.2,
            has_nfc=True, has_fast_charging=True, has_5g=True,
            has_wireless_charging=False, has_reverse_wireless_charging=False,
            has_ois=False, has_stereo_speakers=False, has_aptx=False, has_ldac=False,
            brand="TestBrand", price_sgd=299.00, price_url="http://x",
            scraped_at=make_aware(datetime.now())
        )
        Phone.objects.create(model="NoIP", slug="noip", **base)
        Phone.objects.create(model="IP 67", slug="ip67", **base)
        Phone.objects.filter(slug="ip67").update(ip_rating="ip 67")
        r = self.client.get(url, {"mode": "midrange"})
        self.assertEqual(r.status_code, 200)
        rows = {p["slug"]: p for p in r.data if p["slug"] in {"noip", "ip67"}}
        self.assertGreater(rows["ip67"]["raw_score"], rows["noip"]["raw_score"])

    # Check durability score respects glass family + Mohs caps
    def test_durability_glass_family_caps(self):
        url = reverse("recommendation")
        common = dict(
            source_url="http://x", warranty="1",
            soc_score=6, ram_gb=8, storage_gb=128, battery_mah=4500,
            display_in=6.1, refresh_hz=120, ppi=400, charging_w=30,
            main_mp=50, front_mp=12, res_w=1080, res_h=2400, bt_ver=5.2,
            has_nfc=False, has_fast_charging=False, has_5g=False,
            has_wireless_charging=False, has_reverse_wireless_charging=False,
            has_ois=False, has_stereo_speakers=False, has_aptx=False, has_ldac=False,
            brand="TestBrand", price_sgd=299.00, price_url="http://x",
            scraped_at=make_aware(datetime.now())
        )
        Phone.objects.create(
            model="GG3 Mohs6.5", slug="gg3", glass_type="Gorilla Glass 3", **common
        )
        Phone.objects.filter(slug="gg3").update(mohs=6.5)
        Phone.objects.create(
            model="Victus2 Mohs6.5", slug="victus2", glass_type="Gorilla Glass Victus 2", **common
        )
        Phone.objects.filter(slug="victus2").update(mohs=6.5)
        r = self.client.get(url, {"mode": "midrange"})
        self.assertEqual(r.status_code, 200)
        rows = {p["slug"]: p for p in r.data if p["slug"] in {"gg3", "victus2"}}
        self.assertGreater(rows["victus2"]["raw_score"], rows["gg3"]["raw_score"])

    # Ensure charging wattage contributes positively to raw score
    def test_charging_w_string_parsing(self):
        url = reverse("recommendation")
        Phone.objects.create(
            model="ChargeStr", slug="charge-str", brand="X",
            source_url="http://x", warranty="1",
            soc_score=5, ram_gb=8, storage_gb=128, battery_mah=5000,
            display_in=6.5, refresh_hz=120, ppi=400, charging_w=67,
            main_mp=50, front_mp=16, res_w=1080, res_h=2400, bt_ver=5.2,
            has_nfc=False, has_fast_charging=True, has_5g=False,
            has_wireless_charging=False, has_reverse_wireless_charging=False,
            has_ois=False, has_stereo_speakers=False, has_aptx=False, has_ldac=False,
            price_sgd=299.00, price_url="http://x",
            scraped_at=make_aware(datetime.now())
        )
        r = self.client.get(url, {"mode": "midrange"})
        self.assertEqual(r.status_code, 200)
        row = next(p for p in r.data if p["slug"] == "charge-str")
        self.assertGreater(row["raw_score"], 0)

    # Confirm OLED phones with unknown resolution still get baseline score
    def test_oled_unknown_resolution_baseline(self):
        url = reverse("recommendation")
        Phone.objects.create(
            model="OLED-UnknownRes", slug="oled-unk", brand="X",
            source_url="http://x", warranty="1",
            soc_score=5, ram_gb=8, storage_gb=128, battery_mah=4500,
            display_in=6.5, refresh_hz=120, ppi=0, charging_w=30,
            main_mp=50, front_mp=16, res_w=None, res_h=None, bt_ver=5.2,
            has_nfc=False, has_fast_charging=False, has_5g=False,
            has_wireless_charging=False, has_reverse_wireless_charging=False,
            has_ois=False, has_stereo_speakers=False, has_aptx=False, has_ldac=False,
            display_type="OLED", price_sgd=299.00, price_url="http://x",
            scraped_at=make_aware(datetime.now())
        )
        r = self.client.get(url, {"mode": "midrange"})
        self.assertEqual(r.status_code, 200)
        row = next(p for p in r.data if p["slug"] == "oled-unk")
        self.assertGreater(row["raw_score"], 0)

    # Verify extras (5G/NFC/stereo) increase raw score
    def test_extras_contribute_to_raw_score(self):
        url = reverse("recommendation")
        base = dict(
            brand="X", source_url="http://x", warranty="1",
            soc_score=5, ram_gb=8, storage_gb=128, battery_mah=4500,
            display_in=6.5, refresh_hz=90, ppi=350, charging_w=20,
            main_mp=50, front_mp=16, res_w=1080, res_h=2400, bt_ver=5.0,
            has_wireless_charging=False, has_reverse_wireless_charging=False,
            has_ois=False, has_aptx=False, has_ldac=False,
            price_sgd=299.00, price_url="http://x",
            scraped_at=make_aware(datetime.now())
        )
        Phone.objects.create(
            model="NoExtras", slug="noextras",
            has_5g=False, has_nfc=False, has_stereo_speakers=False, **base
        )
        Phone.objects.create(
            model="AllExtras", slug="allextras",
            has_5g=True, has_nfc=True, has_stereo_speakers=True, **base
        )
        r = self.client.get(url, {"mode": "midrange"})
        self.assertEqual(r.status_code, 200)
        rows = {p["slug"]: p for p in r.data if p["slug"] in {"noextras", "allextras"}}
        self.assertGreater(rows["allextras"]["raw_score"], rows["noextras"]["raw_score"])

    # Ensure score_breakdown field exists and has expected keys
    def test_score_breakdown_present_and_keys(self):
        url = reverse("recommendation")
        r = self.client.get(url, {"mode": "budget"})
        self.assertEqual(r.status_code, 200)
        self.assertGreaterEqual(len(r.data), 1)
        expected = {"soc", "ram", "storage", "display", "camera", "battery",
                    "charging", "extras", "durability", "protection"}
        for row in r.data:
            self.assertIn("score_breakdown", row)
            self.assertTrue(expected.issubset(set(row["score_breakdown"].keys())))

    # Confirm normalization logic works when only one phone is returned
    def test_single_result_normalization_edge(self):
        Phone.objects.create(
            model="Solo", slug="solo", brand="SoloBrand",
            source_url="http://x", warranty="1",
            soc_score=7, ram_gb=8, storage_gb=256, battery_mah=5000,
            display_in=6.5, refresh_hz=120, ppi=400, charging_w=30,
            main_mp=50, front_mp=16, res_w=1080, res_h=2400, bt_ver=5.2,
            has_nfc=True, has_fast_charging=True, has_5g=True,
            has_wireless_charging=False, has_reverse_wireless_charging=False,
            has_ois=True, has_stereo_speakers=False, has_aptx=False, has_ldac=False,
            ip_rating="IP67", display_type="OLED",
            price_sgd=499.00, price_url="http://x",
            scraped_at=make_aware(datetime.now())
        )
        url = reverse("recommendation")
        r = self.client.get(url, {"brand": "SoloBrand", "mode": "midrange"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)
        self.assertGreaterEqual(r.data[0]["score"], 0.0)
        self.assertLessEqual(r.data[0]["score"], 1.0)

    # Ensure cheaper phone is ranked first in case of score tie
    def test_tie_breakers_price_cheaper_wins_on_tie(self):
        base = dict(
            source_url="http://x", warranty="1",
            soc_score=6, ram_gb=8, storage_gb=128, battery_mah=5000,
            display_in=6.5, refresh_hz=120, ppi=400, charging_w=30,
            main_mp=50, front_mp=16, res_w=1080, res_h=2400, bt_ver=5.2,
            has_nfc=True, has_fast_charging=True, has_5g=True,
            has_wireless_charging=False, has_reverse_wireless_charging=False,
            has_ois=True, has_stereo_speakers=False, has_aptx=False, has_ldac=False,
            ip_rating="IP67", display_type="OLED",
            scraped_at=make_aware(datetime.now())
        )
        Phone.objects.create(**dict(base, model="TieCheaper", slug="tie-cheaper", brand="Gamma", price_sgd=350.00))
        Phone.objects.create(**dict(base, model="TiePricier", slug="tie-pricier", brand="Gamma", price_sgd=450.00))
        url = reverse("recommendation")
        r = self.client.get(url, {"mode": "midrange"})
        self.assertEqual(r.status_code, 200)
        ties = [row["slug"] for row in r.data if row["slug"].startswith("tie-")]
        self.assertEqual(ties, ["tie-cheaper", "tie-pricier"])

    # Check that decimal strings are valid for max_price filtering
    def test_max_price_accepts_decimal_string(self):
        url = reverse("recommendation")
        r = self.client.get(url, {"max_price": "299.00"})
        self.assertEqual(r.status_code, 200)
        slugs = [row["slug"] for row in r.data]
        self.assertIn("testphone-b", slugs)
        self.assertNotIn("testphone-a", slugs)

    # Confirm ≥12MP ultrawide gets bonus in camera scoring
    def test_camera_main_mp_ultrawide_bonus_from_string(self):
        base = dict(
            brand="UWBrand", source_url="http://x", warranty="1",
            soc_score=6, ram_gb=8, storage_gb=128, battery_mah=4500,
            display_in=6.1, refresh_hz=120, ppi=400, charging_w=30,
            main_mp=50, front_mp=12, res_w=1080, res_h=2400, bt_ver=5.2,
            has_nfc=True, has_fast_charging=True, has_5g=True,
            has_wireless_charging=False, has_reverse_wireless_charging=False,
            has_ois=False, has_stereo_speakers=False, has_aptx=False, has_ldac=False,
            ip_rating=None, display_type="OLED",
            price_sgd=299.00, price_url="http://x",
            scraped_at=make_aware(datetime.now())
        )
        Phone.objects.create(model="UW>=12", slug="uw12", camera_main_mp="50MP + 12MP + 5MP", **base)
        Phone.objects.create(model="UW<12", slug="uw8", camera_main_mp="50MP + 8MP + 5MP", **base)
        url = reverse("recommendation")
        r = self.client.get(url, {"mode": "midrange"})
        self.assertEqual(r.status_code, 200)
        rows = {p["slug"]: p for p in r.data if p["slug"] in {"uw12", "uw8"}}
        self.assertGreater(rows["uw12"]["raw_score"], rows["uw8"]["raw_score"])
