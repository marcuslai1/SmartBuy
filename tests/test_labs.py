import pytest

from pipeline import config as C
from pipeline import labs, scoring


def phone(model, brand, chip, sensor, uw=True, tele=None, announced="2026-01-01"):
    lenses = [{"role": "wide", "mp": 48, "sensor_in": sensor, "zoom": None, "ois": True}]
    if uw:
        lenses.append({"role": "ultrawide", "mp": 12, "sensor_in": 0.36, "zoom": None, "ois": False})
    if tele:
        lenses.append({"role": "telephoto", "mp": 12, "sensor_in": 0.3, "zoom": tele, "ois": True})
    return {"id": f"{brand}-{model}".lower().replace(" ", "-"), "brand": brand, "model": model,
            "name": f"{brand} {model}", "chipset": chip, "announced": announced, "lenses": lenses,
            "estimated": [], "video_4k60": True, "selfie_mp": 12}


def test_dxomark_names_match_ours():
    assert labs.dxo_key("POCO", "F6 Pro") == labs.dxo_key("Xiaomi", "Poco F6 Pro")
    assert labs.dxo_key("Xiaomi", "Redmi Note 14 Pro+ 5G") == labs.dxo_key("Xiaomi", "Redmi Note 14 Pro+ 5G")
    assert labs.dxo_key("Nothing", "Phone(1)") == labs.dxo_key("Nothing", "Phone (1)")
    assert labs.dxo_key("Oppo", "Find X9 Ultra") == labs.dxo_key("OPPO", "Find X9 Ultra")


@pytest.fixture
def lab_world(monkeypatch):
    monkeypatch.setattr(C, "CAMERA_LAB_MIN_FIT", 2)
    tested = [
        phone("iPhone 17", "Apple", "Apple A19", 0.641),
        phone("iPhone 18 Pro", "Apple", "Apple A20 Pro", 0.781, tele=4.0),
        phone("17 Ultra", "Xiaomi", "Snapdragon X", 1.0, tele=3.2),
        phone("Galaxy S26", "Samsung", "Snapdragon S", 0.641, tele=3.0),
    ]
    dxo = {"phones": [{"brand": p["brand"], "model": p["model"], "camera": s, "protocol": "6", "url": None}
                      for p, s in zip(tested, (157, 172, 166, 146))]}
    untested = [
        phone("iPhone 18 Pro Max", "Apple", "Apple A20 Pro", 0.781, tele=4.0),   # identical cameras + chip
        phone("iPhone 17e", "Apple", "Apple A19", 0.392, uw=False),             # same chip, other cameras
        phone("Galaxy S26+", "Samsung", "Snapdragon S", 0.641, tele=3.0),        # identical cameras + chip
        phone("Galaxy S26 FE", "Samsung", "Exynos E", 0.641, tele=3.0),          # same cameras, other line & chip
        phone("Poco F9 Ultra", "Xiaomi", "Snapdragon X", 0.641, tele=3.2),       # same chip, other cameras
    ]
    records = tested + untested
    labs.apply_camera_labs(records, dxo)
    return {r["model"]: r for r in records}


def test_tested_phone_moves_halfway_to_its_lab_result(lab_world):
    r = lab_world["iPhone 17"]
    assert r["camera_lab"]["dxomark"] == 157 and "from" not in r["camera_lab"]
    assert "camera" not in r["estimated"]
    assert scoring.camera(r) == pytest.approx(scoring.camera_hardware(r) + r["camera_adj"])


def test_camera_twin_on_same_chip_gets_the_full_adjustment(lab_world):
    assert lab_world["iPhone 18 Pro Max"]["camera_adj"] == pytest.approx(lab_world["iPhone 18 Pro"]["camera_adj"])
    assert lab_world["Galaxy S26+"]["camera_adj"] == pytest.approx(lab_world["Galaxy S26"]["camera_adj"])
    assert "camera" in lab_world["Galaxy S26+"]["estimated"]


def test_apple_sibling_on_same_chip_gets_a_share(lab_world):
    e = lab_world["iPhone 17e"]
    assert e["camera_lab"]["from"] == "Apple iPhone 17"
    assert e["camera_adj"] == pytest.approx(C.CAMERA_SHARE * lab_world["iPhone 17"]["camera_adj"])


def test_no_transfer_across_lines_without_matching_cameras_and_chip(lab_world):
    assert lab_world["Galaxy S26 FE"]["camera_adj"] == 0.0     # different line and chip
    assert lab_world["Poco F9 Ultra"]["camera_adj"] == 0.0     # same chip, different cameras, not Apple/Google


def test_same_line_twin_on_different_chip_gets_a_share(monkeypatch):
    monkeypatch.setattr(C, "CAMERA_LAB_MIN_FIT", 2)
    a56 = phone("Galaxy A56", "Samsung", "Exynos 1580", 0.641)
    s25 = phone("Galaxy S25", "Samsung", "Snapdragon S", 0.78, tele=3.0)
    a57 = phone("Galaxy A57", "Samsung", "Exynos 1680", 0.641)
    dxo = {"phones": [{"brand": "Samsung", "model": "Galaxy A56", "camera": 120, "protocol": "6", "url": None},
                      {"brand": "Samsung", "model": "Galaxy S25", "camera": 140, "protocol": "6", "url": None}]}
    labs.apply_camera_labs([a56, s25, a57], dxo)
    assert a57["camera_lab"]["why"] == "same cameras, different chip"
    assert a57["camera_adj"] == pytest.approx(C.CAMERA_SHARE * a56["camera_adj"])


def test_stress_tests_tested_overheated_and_borrowed():
    recs = [dict(phone(f"P{i}", "Apple", f"Chip {i}", 0.6), gpu=g) for i, g in enumerate((4000, 4500, 3000, 5000))]
    recs.append(dict(phone("Hot", "Samsung", "Chip H", 0.6), gpu=7000))
    recs.append(dict(phone("New", "Apple", "Chip N", 0.6), gpu=4600))
    stress = {r["id"]: {"stability_pct": s, "overheated": "", "test": "Wild Life Extreme Stress Test",
                        "review_url": "u", "max_surface_temp_c": "44", "note": ""}
              for r, s in zip(recs, ("66", "69", "82", "50"))}
    stress[recs[4]["id"]] = {"stability_pct": "", "overheated": "yes", "test": "Wild Life Extreme Stress Test",
                             "review_url": "u", "max_surface_temp_c": "", "note": "stopped early"}
    labs.apply_stress_tests(recs, stress)
    by = {r["model"]: r for r in recs}
    assert by["P0"]["gpu_stability"] == 0.66 and by["P0"]["stability_source"] == "tested"
    assert by["Hot"]["gpu_stability"] == 0.5 and by["Hot"]["stability_source"] == "overheated"
    assert by["New"]["stability_source"] == "same brand" and by["New"]["gpu_stability"] == 0.66  # median of 69, 50, 66
    assert "performance" in by["New"]["estimated"]          # 66% is a guess that matters
    assert scoring.performance({"gb6": 8000, "gpu": 5000, "gpu_stability": 0.5}) < scoring.performance(
        {"gb6": 8000, "gpu": 5000, "gpu_stability": 1.0})
