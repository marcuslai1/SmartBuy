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
    best = {**FLAGSHIP, "gb6": 12000, "gpu": 9000, "battery_h": 25, "measured_nits": 2000,
            "lenses": [{"role": "wide", "mp": 50, "sensor_in": 1.0, "zoom": None, "ois": True},
                       {"role": "periscope telephoto", "mp": 200, "sensor_in": 0.5, "zoom": 6.0, "ois": True},
                       {"role": "ultrawide", "mp": 50, "sensor_in": 0.4, "zoom": None, "ois": False}],
            "selfie_mp": 50, "refresh_hz": 144, "wired_w": 120, "wireless_w": 50, "ip_rating": "IP69",
            "jack": True, "ir": True, "secure_unlock": True, "battery_cycles": 2000,
            "storage_types": {"default": "UFS 4.0"}}
    cats = scoring.category_scores(best, {"storage_gb": 1024, "ram_gb": 16})
    assert all(math.isclose(v, 10.0) for v in cats.values()), cats


def test_flagship_beats_budget_on_specs_in_every_preset():
    hi = scoring.category_scores(FLAGSHIP, BIG)
    lo = scoring.category_scores(BUDGET, SMALL)
    for preset in C.PRESETS:
        assert scoring.spec_score(hi, preset) > scoring.spec_score(lo, preset) + 3


def test_gpu_counts_toward_performance():
    cpu_only = scoring.performance({"gb6": 5000})
    strong_gpu = scoring.performance({"gb6": 5000, "gpu": 6000})
    weak_gpu = scoring.performance({"gb6": 5000, "gpu": 500})
    assert weak_gpu < cpu_only < strong_gpu


def test_megapixels_alone_do_not_win_camera():
    big_mp_small_sensor = {"lenses": [{"role": "wide", "mp": 200, "sensor_in": 0.4, "zoom": None, "ois": False}]}
    small_mp_big_sensor = {"lenses": [{"role": "wide", "mp": 48, "sensor_in": 0.78, "zoom": None, "ois": True}]}
    assert scoring.camera(small_mp_big_sensor) > scoring.camera(big_mp_small_sensor)


def test_battery_hours_have_diminishing_returns():
    score = lambda h: scoring.battery({"battery_h": h})
    assert score(9) == 0.0 and math.isclose(score(25), 10.0)
    assert score(12) - score(9) > score(25) - score(22) > 0
    assert score(20) < 8.0  # 20h is good, not best on sale


def test_charging_tops_out_at_120w():
    wired = lambda w: scoring.charging({"wired_w": w})
    assert wired(100) < wired(120) == 7.0 == wired(150)


def test_apple_charging_estimated_from_time_claim():
    assert scoring.charging_watts({"charge_pct_per_min": 2.5}) == 35.0
    assert scoring.charging_watts({}) == 10.0


def test_value_is_relative_to_price_curve():
    prices = [100, 200, 400, 800, 1600]
    specs = [3.0, 4.0, 5.0, 6.0, 7.0]
    specs[2] += 1.0
    model = value.fit(prices, specs)
    assert specs[2] > value.expected(model, 400)
    assert specs[1] < value.expected(model, 200)


def test_best_buys_are_the_price_ladder():
    prices = [200, 300, 300, 450, 500, 900, 900]
    specs = [4.0, 5.0, 4.5, 4.9, 6.0, 6.0, 7.0]
    # 300/4.5 loses to 300/5.0, 450/4.9 to the cheaper 5.0, 900/6.0 to the 500 phone
    assert value.best_buys(prices, specs) == {0, 1, 4, 6}
    assert value.best_buys([300, 300], [5.0, 5.0]) == {0, 1}   # exact twins both stay


def test_value_curve_bends_with_diminishing_returns():
    prices = [150, 200, 300, 450, 600, 800, 1000, 1300, 1700, 2200]
    specs = [-30.0 + 10.0 * math.log(p) - 0.6 * math.log(p) ** 2 for p in prices]
    model = value.fit(prices, specs)
    assert math.isclose(model["c"], -0.6, abs_tol=1e-6)
    for p, s in zip(prices, specs):
        assert math.isclose(value.expected(model, p), s, abs_tol=1e-6)


def test_value_curve_never_falls_with_price():
    model = {"a": -30.0, "b": 10.0, "c": -0.8, "sd": 1.0}   # peaks at ln(price) = 6.25, ~S$518
    curve = [value.expected(model, p) for p in range(100, 3000, 50)]
    assert all(b >= a - 1e-12 for a, b in zip(curve, curve[1:]))
    assert math.isclose(value.expected(model, 2500), value.expected(model, math.exp(6.25)))


def test_old_linear_models_still_work():
    model = {"a": -11.0, "b": 2.6, "sd": 0.8}
    assert math.isclose(value.expected(model, 1000), -11.0 + 2.6 * math.log(1000))


def test_gpu_estimate_follows_nearest_geekbench_scores():
    from pipeline.enrich import enrich
    sheets = [{"name": f"Xiaomi Test {i}", "chipset": f"Chip {i}", "geekbench6": gb, "wildlife_extreme": wle}
              for i, (gb, wle) in enumerate([(1900, 340), (2000, 370), (2050, 360), (2100, 380), (2150, 350),
                                             (2200, 390), (2250, 400), (9000, 6000), (9500, 6500), (1200, 2000)])]
    sheets.append({"name": "Xiaomi Budget", "chipset": "Other 1", "geekbench6": 2100})
    out, _ = enrich(sheets)
    budget = next(r for r in out if r["name"] == "Xiaomi Budget")
    assert budget["gpu_source"] == "estimated from GeekBench"
    assert 340 <= budget["gpu"] <= 400   # flagship results and the odd outlier don't drag it up
    assert "performance" in budget["estimated"]


def test_storage_speed_follows_the_priced_variant():
    p = {"storage_types": {"default": "UFS 4.0", "128": "UFS 3.1"}}
    assert scoring.storage_type(p, {"storage_gb": 128}) == "UFS 3.1"
    assert scoring.storage_type(p, {"storage_gb": 256}) == "UFS 4.0"
    small = scoring.memory(p, {"storage_gb": 128, "ram_gb": 8})
    big_slow = scoring.memory({"storage_types": {"default": "eMMC 5.1"}}, {"storage_gb": 128, "ram_gb": 8})
    assert small > big_slow


def test_storage_size_is_a_need_not_a_score():
    p = {"storage_types": {"default": "UFS 4.0"}}
    assert scoring.memory(p, {"storage_gb": 128, "ram_gb": 12}) == scoring.memory(p, {"storage_gb": 1024, "ram_gb": 12})
    assert scoring.memory(p, {"storage_gb": 128, "ram_gb": 16}) > scoring.memory(p, {"storage_gb": 128, "ram_gb": 8})
    assert scoring.storage_type({"storage_type_est": "UFS 2.2"}, {"storage_gb": 128}) == "UFS 2.2"


def test_battery_cycles_count_toward_build():
    base = {"ip_rating": "IP68", "glass": "Gorilla Glass Victus 2", "frame": "aluminum", "eu_free_fall": "B"}
    assert scoring.build({**base, "battery_cycles": 2000}) > scoring.build(base) > scoring.build(
        {**base, "battery_cycles": 800})


def test_software_counts_years_left_not_years_promised():
    p = {"brand": "Samsung", "os_years": 7, "released": "2024-10-02"}
    assert math.isclose(scoring.os_years_left(p, "2026-10-02"), 5.0, abs_tol=0.01)
    assert scoring.os_years_left({**p, "released": "2027-01-01"}, "2026-10-02") == 7
    assert scoring.os_years_left({"os_years": 2, "released": "2020-01-01"}, "2026-10-02") == 0
    new = scoring.software({**p, "os_years_left": 7.0})
    old = scoring.software({**p, "os_years_left": 5.0})
    assert new == 10.0 and old < new


def test_update_policy_borrowed_from_same_series():
    from pipeline.enrich import enrich, series
    assert series("Poco F8 Ultra") == ("Poco F", "Poco F|ultra")
    assert series("17T Pro") == ("", "|t pro")
    assert series("Redmi Note 17 Pro")[0] == "Redmi Note"
    sheets = [
        {"name": "Xiaomi Redmi Note 15 Pro", "announced": "2025-08-21", "os_updates": 4},
        {"name": "Xiaomi Redmi 15C", "announced": "2025-08-01", "os_updates": 2},
        {"name": "Xiaomi Redmi Note 17 Pro", "announced": "2026-08-27"},
        {"name": "Xiaomi 17T", "announced": "2026-05-28"},
    ]
    out = {r["model"]: r for r in enrich(sheets)[0]}
    assert out["Redmi Note 17 Pro"]["os_years"] == 4
    assert out["Redmi Note 17 Pro"]["os_source"] == "same series (Xiaomi Redmi Note 15 Pro)"
    assert "software" in out["Redmi Note 17 Pro"]["estimated"]
    assert out["17T"]["os_source"] == "brand default"
    assert "software" not in out["Redmi Note 15 Pro"]["estimated"]


def test_lab_result_far_from_its_chip_is_replaced():
    from pipeline.enrich import enrich
    sheets = [{"name": f"OPPO Phone {i}", "chipset": "Qualcomm Snapdragon 7 Gen 4", "geekbench6": gb}
              for i, gb in enumerate([4006, 4095, 3990, 1188])]
    out = enrich(sheets)[0]
    bad = next(r for r in out if r["model"] == "Phone 3")
    assert bad["gb6"] == 4006 and bad["gb6_source"].startswith("same chipset (its own result, 1,188")
    assert next(r for r in out if r["model"] == "Phone 0")["gb6_source"] == "tested"


def test_unknown_main_sensor_estimated_from_similar_phones():
    from pipeline.enrich import enrich
    def phone(i, gb, size):
        return {"name": f"Xiaomi P{i}", "chipset": f"Chip {i}", "geekbench6": gb,
                "lenses": [{"role": "wide", "mp": 50, "sensor_in": size, "zoom": None, "ois": False}]}
    sheets = ([phone(i, 2000 + 10 * i, 0.36) for i in range(8)] + [phone(10 + i, 9000 + 10 * i, 0.77) for i in range(8)]
              + [phone(99, 2050, None)])
    budget = next(r for r in enrich(sheets)[0] if r["model"] == "P99")
    assert budget["lenses"][0]["sensor_in"] == 0.36 and budget["main_sensor_est"]
    assert "camera" in budget["estimated"]


def test_typical_price_is_median_of_cheapest_per_crawl():
    from pipeline.build import typical_price
    rows = [{"date": d, "storage_gb": 256, "price_sgd": pr} for d, pr in
            [("2026-07-10", 999), ("2026-08-10", 899), ("2026-08-10", 949), ("2026-09-10", 1049),
             ("2026-10-02", 799), ("2026-01-01", 500)]]
    rows.append({"date": "2026-10-02", "storage_gb": 512, "price_sgd": 700})
    typical, n = typical_price(rows, 256, "2026-10-02", 799)
    assert n == 4 and typical == 949.0     # median of 999, 899, 1049, 799; Jan row is outside 90 days


def test_binned_gpu_is_not_treated_as_a_bad_run():
    from pipeline.enrich import enrich
    five = "Apple GPU (5-core graphics)"
    sheets = [{"name": f"Apple iPhone {i}", "chipset": "Apple A18", "gpu_name": five, "wildlife_extreme": w}
              for i, w in enumerate([4295, 4324, 4310])]
    sheets.append({"name": "Apple iPhone 16e", "chipset": "Apple A18", "gpu_name": "Apple GPU (4-core graphics)",
                   "wildlife_extreme": 2850})
    sheets.append({"name": "Apple iPhone 16 Plus X", "chipset": "Apple A18", "gpu_name": five})
    out = {r["model"]: r for r in enrich(sheets)[0]}
    assert out["iPhone 16e"]["gpu"] == 2850 and out["iPhone 16e"]["gpu_source"] == "tested"
    assert out["iPhone 16 Plus X"]["gpu"] == 4310    # borrows from the same GPU configuration
