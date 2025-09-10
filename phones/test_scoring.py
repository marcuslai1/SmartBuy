import unittest
from django.test import TestCase
from .scoring import (
    _get, _soc_base_pts, _ram_base_pts, _rom_base_pts, _display_base_pts,
    _camera_raw_score, _battery_base_pts, _charging_base_pts,
    calculate_raw_score, calculate_smartbuy_score,
    _normalize_ip, _ip_score,
    _durability_score, _has_useful_ultrawide,
    _resolve_ppi, _resolve_refresh, _resolve_charging_w, _resolve_ip, _resolve_glass
)

class TestScoring(unittest.TestCase):
    # Test safe getter works for dicts, objects, and defaults
    def test_get_dict_and_object(self):
        class Dummy: val = 42
        self.assertEqual(_get({"val": 10}, "val"), 10)
        self.assertEqual(_get(Dummy(), "val"), 42)
        self.assertEqual(_get({}, "missing", 99), 99)

    # Test SoC tier points return expected values
    def test_soc_base_pts_tiers(self):
        self.assertEqual(_soc_base_pts(9.5), 2.0)
        self.assertEqual(_soc_base_pts(8.1), 1.6)
        self.assertEqual(_soc_base_pts(7.1), 1.3)
        self.assertEqual(_soc_base_pts(6.0), 1.0)
        self.assertEqual(_soc_base_pts(5.0), 0.75)
        self.assertEqual(_soc_base_pts(4.0), 0.5)
        self.assertEqual(_soc_base_pts(3.9), 0.0)

    # Test RAM tiers give correct base points
    def test_ram_base_pts(self):
        self.assertEqual(_ram_base_pts(20), 2.0)
        self.assertEqual(_ram_base_pts(16), 1.75)
        self.assertEqual(_ram_base_pts(12), 1.5)
        self.assertEqual(_ram_base_pts(8), 1.0)
        self.assertEqual(_ram_base_pts(6), 0.5)
        self.assertEqual(_ram_base_pts(4), 0.0)

    # Test storage (ROM) tiers give correct points
    def test_rom_base_pts(self):
        self.assertEqual(_rom_base_pts(1024), 2.0)
        self.assertEqual(_rom_base_pts(512), 1.75)
        self.assertEqual(_rom_base_pts(256), 1.50)
        self.assertEqual(_rom_base_pts(128), 1.0)
        self.assertEqual(_rom_base_pts(64), 0.5)
        self.assertEqual(_rom_base_pts(32), 0)

    # Test display scoring with resolution, refresh, OLED, and PPI
    def test_display_base_pts_examples(self):
        self.assertAlmostEqual(_display_base_pts(1080, 120, True, 420), 1.6, places=2)
        self.assertAlmostEqual(_display_base_pts(1080, 90,  True, 380), 1.1, places=2)
        self.assertAlmostEqual(_display_base_pts(1080, 60,  True, 380), 1.0, places=2)
        self.assertAlmostEqual(_display_base_pts(720,  60,  False,300), 0.65, places=2)
        self.assertAlmostEqual(_display_base_pts(1440, 60,  False,300), 1.05, places=2)
        self.assertAlmostEqual(_display_base_pts(1080, 120, True, 320), 1.2, places=2)

    # Test brand priors and camera score with OIS, UW, selfie bonus
    def test_camera_raw_score_and_brand_prior(self):
        base = _camera_raw_score(108, True, True, "samsung", 3)
        self.assertGreater(base, 5.0)
        self.assertLessEqual(base, 10.0)

        g = _camera_raw_score(100, True, True, "google", 3)
        neutral = _camera_raw_score(100, True, True, "unknown", 3)
        self.assertGreater(g, neutral)

    # Test upper bound calculation for camera raw score
    def test_camera_upper_bound(self):
        score = _camera_raw_score(200, True, True, "apple", 6)
        self.assertLessEqual(score, 10.0)
        self.assertAlmostEqual(score, 6.8375, places=4)

    # Test ultrawide usefulness detection logic
    def test_has_useful_ultrawide(self):
        self.assertFalse(_has_useful_ultrawide("200 MP & 8 MP & 2 MP"))
        self.assertTrue(_has_useful_ultrawide("48MP + 12MP + 12MP"))

    # Test battery mAh to points conversion
    def test_battery_base_pts(self):
        self.assertEqual(_battery_base_pts(6100), 2.0)
        self.assertEqual(_battery_base_pts(5500), 1.75)
        self.assertEqual(_battery_base_pts(5000), 1.5)
        self.assertEqual(_battery_base_pts(4500), 1.0)
        self.assertEqual(_battery_base_pts(3500), 0.5)
        self.assertEqual(_battery_base_pts(2500), 0.0)

    # Test charging wattage to points conversion
    def test_charging_base_pts(self):
        self.assertEqual(_charging_base_pts(80), 2.0)
        self.assertEqual(_charging_base_pts(50), 2.0)
        self.assertEqual(_charging_base_pts(40), 1.5)
        self.assertEqual(_charging_base_pts(30), 1.0)
        self.assertEqual(_charging_base_pts(20), 0.75)
        self.assertEqual(_charging_base_pts(15), 0.0)

    # Test durability score with different glass and Mohs hardness
    def test_durability_score_caps_and_unknowns(self):
        self.assertAlmostEqual(_durability_score("Victus 2", 6.0), 0.95, places=2)
        self.assertAlmostEqual(_durability_score("Gorilla Glass 3", 6.5), 0.55, places=2)
        self.assertAlmostEqual(_durability_score(None, 6.0), 0.45, places=2)

    # Test IP normalization and scoring values
    def test_ip_normalization_and_score(self):
        self.assertEqual(_normalize_ip("ip68"), "IP68")
        self.assertEqual(_normalize_ip("IP 67"), "IP67")
        self.assertEqual(_normalize_ip("ip64/68"), "IP64")
        self.assertIsNone(_normalize_ip("none"))
        self.assertIsNone(_normalize_ip(None))
        self.assertAlmostEqual(_ip_score("IP68"), 0.90)
        self.assertAlmostEqual(_ip_score("IP52"), 0.20)
        self.assertAlmostEqual(_ip_score("unknown"), 0.10)

    # Test field resolvers for PPI, refresh, charging W, IP, and glass
    def test_field_resolvers(self):
        phone = {
            "ppi": 401,
            "refresh_hz": 120,
            "charging_w": "67W",
            "ip_rating": "ip67",
            "display_protection": "Gorilla Glass 5"
        }
        self.assertEqual(_resolve_ppi(phone), 401)
        self.assertEqual(_resolve_refresh(phone), 120)
        self.assertEqual(_resolve_charging_w(phone), 67)
        self.assertEqual(_resolve_ip(phone), "IP67")
        self.assertIn("Gorilla Glass 5", (_resolve_glass(phone) or ""))

    # Test raw score calculation returns correct ranges and keys
    def test_calculate_raw_score_shape_and_ranges(self):
        sample = {
            "soc_score": 8.7, "ram_gb": 12, "storage_gb": 512,
            "battery_mah": 5200, "main_mp": 108, "charging_w": 66,
            "ppi": 395, "refresh_hz": 120, "display_type": "oled",
            "has_5g": True, "has_nfc": True, "has_ois": True,
            "has_telephoto": False, "has_stereo_speakers": True,
            "ip_rating": "IP67", "brand": "Samsung"
        }
        raw, breakdown = calculate_raw_score(sample)
        self.assertGreater(raw, 6.0)
        self.assertLessEqual(raw, 10.0)
        for key in ("soc","ram","storage","display","camera","battery","charging","extras","durability","protection"):
            self.assertIn(key, breakdown)
            self.assertGreaterEqual(breakdown[key], 0.0)
            self.assertLessEqual(breakdown[key], 10.0)

    # Test smartbuy score calculation and price edge cases
    def test_calculate_smartbuy_score_and_price_edge_cases(self):
        phone = {
            "soc_score": 8.7, "ram_gb": 12, "storage_gb": 512,
            "battery_mah": 5200, "main_mp": 108, "charging_w": 66,
            "ppi": 395, "refresh_hz": 120, "display_type": "oled",
            "has_5g": True, "has_nfc": True, "has_ois": True,
            "has_telephoto": False, "has_stereo_speakers": True,
            "ip_rating": "IP67", "brand": "Samsung", "price_sgd": 349
        }
        smartbuy, raw, breakdown = calculate_smartbuy_score(phone)
        self.assertGreater(smartbuy, 1.0)
        self.assertGreater(raw, 0.0)
        self.assertLessEqual(raw, 10.0)
        self.assertIsInstance(breakdown, dict)

        # zero price: smartbuy 0.0, raw unchanged
        phone_zero = dict(phone, price_sgd=0)
        s2, r2, _ = calculate_smartbuy_score(phone_zero)
        self.assertEqual(s2, 0.0)
        self.assertAlmostEqual(r2, raw, places=6)

        # invalid price: smartbuy 0.0, raw returned for reference
        phone_bad = dict(phone, price_sgd="N/A")
        s3, r3, _ = calculate_smartbuy_score(phone_bad)
        self.assertEqual(s3, 0.0)
        self.assertGreater(r3, 0.0)

    # Test handling of missing fields and case insensitivity
    def test_missing_fields_defaults_and_case_insensitivity(self):
        phone = {
            "ram_gb": 8,
            "storage_gb": 128,
            "battery_mah": 5000,
            "main_mp": 50,
            "charging_w": 33,
            "refresh_hz": 90,
            "ppi": 300,
            "brand": "xiaomi",
            "display_type": "OLED",
            "ip_rating": "ip68",
            "price_sgd": 299
        }
        smartbuy, raw, breakdown = calculate_smartbuy_score(phone)
        self.assertGreater(raw, 0)
        self.assertGreater(smartbuy, 0)
        self.assertEqual(_resolve_ip(phone), "IP68")

    # Test extremely low price inflates smartbuy score
    def test_extremely_low_price_inflates_smartbuy(self):
        phone = {
            "soc_score": 9, "ram_gb": 16, "storage_gb": 512,
            "battery_mah": 6000, "main_mp": 200, "charging_w": 100,
            "ppi": 500, "refresh_hz": 144, "display_type": "oled",
            "has_5g": True, "has_nfc": True, "has_ois": True,
            "has_telephoto": True, "has_stereo_speakers": True,
            "ip_rating": "IP68", "brand": "Samsung", "price_sgd": 1.0
        }
        smartbuy, raw, _ = calculate_smartbuy_score(phone)
        self.assertGreaterEqual(smartbuy, 500)
        self.assertGreater(raw, 0)

if __name__ == '__main__':
    unittest.main()
