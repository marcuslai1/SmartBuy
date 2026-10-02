import math

from pipeline import config as C
from pipeline import scoring, value

FLAGSHIP = {
    "brand": "Samsung", "gb6": 10500, "battery_h": 16.5,
    "lenses": [
        {"role": "wide", "mp": 200, "sensor_in": 0.77, "zoom": None, "ois": True},
        {"role": "periscope telephoto", "mp": 50, "sensor_in": 0.4, "zoom": 5.0, "ois": True},
        {"role": "ultrawide", "mp": 50, "sensor_in": 0.4, "zoom": None, "ois": False},
    ],
    "video_4k60": True, "video_8k": True, "selfie_mp": 12,
    "is_oled": True, "refresh_hz": 120, "is_ltpo": True, "has_hdr": True, "measured_nits": 1500, "ppi": 500,
    "res_w": 1440, "wired_w": 45, "wireless_w": 15, "reverse_wireless": True,
    "ip_rating": "IP68", "glass": "Corning Gorilla Armor 2", "frame": "titanium", "eu_free_fall": "A",
    "os_updates": 7, "has_5g": True, "nfc": True, "stereo": True, "esim": True, "uwb": True,
}
BUDGET = {
    "brand": "Xiaomi", "gb6": 1400, "battery_h": 11.0,
    "lenses": [{"role": "wide", "mp": 50, "sensor_in": 0.35, "zoom": None, "ois": False},
               {"role": "depth", "mp": 2, "sensor_in": None, "zoom": None, "ois": False}],
    "video_4k": False, "selfie_mp": 8,
    "is_oled": False, "refresh_hz": 90, "peak_nits": 600, "ppi": 260, "res_w": 720, "wired_w": 18,
    "ip_rating": "IP54", "glass": None, "frame": "plastic", "has_5g": False, "nfc": False,
}
BIG = {"storage_gb": 512, "ram_gb": 12}
SMALL = {"storage_gb": 64, "ram_gb": 4}


def test_every_category_is_bounded():
    for phone, variant in ((FLAGSHIP, BIG), (BUDGET, SMALL), ({}, {})):
        for k, v in scoring.category_scores(phone, variant).items():
            assert 0.0 <= v <= 10.0, k


def test_categories_can_reach_ten():
    best = {**FLAGSHIP, "gb6": 12000, "battery_h": 21, "measured_nits": 2000,
            "lenses": [{"role": "wide", "mp": 50, "sensor_in": 1.0, "zoom": None, "ois": True},
                       {"role": "periscope telephoto", "mp": 200, "sensor_in": 0.5, "zoom": 6.0, "ois": True},
                       {"role": "ultrawide", "mp": 50, "sensor_in": 0.4, "zoom": None, "ois": False}],
            "selfie_mp": 50, "refresh_hz": 144, "wired_w": 120, "wireless_w": 50, "ip_rating": "IP69",
            "jack": True, "ir": True}
    cats = scoring.category_scores(best, {"storage_gb": 1024, "ram_gb": 16})
    assert all(math.isclose(v, 10.0) for v in cats.values()), cats


def test_flagship_beats_budget_on_specs_in_every_preset():
    hi = scoring.category_scores(FLAGSHIP, BIG)
    lo = scoring.category_scores(BUDGET, SMALL)
    for preset in C.PRESETS:
        assert scoring.spec_score(hi, preset) > scoring.spec_score(lo, preset) + 3


def test_megapixels_alone_do_not_win_camera():
    big_mp_small_sensor = {"lenses": [{"role": "wide", "mp": 200, "sensor_in": 0.4, "zoom": None, "ois": False}]}
    small_mp_big_sensor = {"lenses": [{"role": "wide", "mp": 48, "sensor_in": 0.78, "zoom": None, "ois": True}]}
    assert scoring.camera(small_mp_big_sensor) > scoring.camera(big_mp_small_sensor)


def test_apple_charging_estimated_from_time_claim():
    assert scoring.charging_watts({"charge_pct_per_min": 2.5}) == 35.0
    assert scoring.charging_watts({}) == 10.0


def test_value_is_relative_to_price_curve():
    prices = [100, 200, 400, 800, 1600]
    specs = [3.0 + 1.0 * math.log(p / 100) for p in prices]
    specs[2] += 0.5  # one phone above the curve
    model = value.fit(prices, specs)
    assert value.value_score(model, 400, specs[2]) > 5.0
    # a cheap phone exactly on the curve is NOT automatically the best value
    on_curve = model["a"] + model["b"] * math.log(100)
    assert math.isclose(value.value_score(model, 100, on_curve), 5.0, abs_tol=1e-9)


def test_value_is_clamped():
    model = {"a": 0.0, "b": 1.0, "sd": 0.1}
    assert value.value_score(model, 100, 100.0) == 10.0
    assert value.value_score(model, 100, -100.0) == 0.0
