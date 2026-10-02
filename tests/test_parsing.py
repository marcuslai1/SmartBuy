from pipeline.sources.gsmarena import (
    _charge_rate, normalize_chipset, parse_camera_modules, parse_ip, parse_sensor_type, parse_storage_types,
    parse_variants,
)


def test_variants_parse_gb_and_tb():
    assert parse_variants("256GB 12GB RAM, 512GB 12GB RAM, 1TB 16GB RAM") == [
        {"storage_gb": 256, "ram_gb": 12.0},
        {"storage_gb": 512, "ram_gb": 12.0},
        {"storage_gb": 1024, "ram_gb": 16.0},
    ]


def test_sensor_type():
    assert parse_sensor_type('48 MP, f/1.8, 24mm (wide), 1/1.28", 1.22µm') == round(1 / 1.28, 3)
    assert parse_sensor_type('50 MP, f/1.6, (wide), 1.0", 1.6µm') == 1.0
    assert parse_sensor_type("13 MP, f/2.2, (ultrawide)") is None
    assert parse_sensor_type('200 MP, f/1.8, 23mm (wide), 1/1.56”, 0.5µm') == round(1 / 1.56, 3)


def test_camera_modules_roles_zoom_ois():
    text = ('200 MP, f/1.7, 24mm (wide), 1/1.3", 0.6µm, PDAF, OIS '
            '50 MP, f/3.4, 111mm (periscope telephoto), 1/2.52", PDAF, OIS, 5x optical zoom '
            '50 MP, f/1.9, (ultrawide), 1/2.5", 0.7µm')
    lenses = parse_camera_modules(text)
    assert [l["role"] for l in lenses] == ["wide", "periscope telephoto", "ultrawide"]
    assert lenses[0]["ois"] and lenses[1]["zoom"] == 5.0 and not lenses[2]["ois"]


def test_continuous_zoom_takes_short_end():
    text = ('50 MP, f/1.7, 23mm (wide), 1.0"-type, OIS '
            '200 MP, f/2.4-3.0, 75-100mm (periscope telephoto), 1/1.4", OIS, 3.2-4.3x continuous optical zoom')
    assert parse_camera_modules(text)[1]["zoom"] == 3.2


def test_ip_takes_best_rating():
    assert parse_ip("IP68/IP69 dust tight and water resistant") == "IP69"
    assert parse_ip("IP54, dust and splash resistant") == "IP54"
    assert parse_ip("No") is None


def test_chipset_drops_model_codes():
    assert normalize_chipset("Qualcomm SM8750-AC Snapdragon 8 Elite (3 nm)") == "Qualcomm Snapdragon 8 Elite"
    assert normalize_chipset("Mediatek MT6835 Dimensity 6300 (6 nm)") == "Mediatek Dimensity 6300"


def test_charge_rate_from_claims():
    assert _charge_rate("Wired, PD3.2, 50% in 20 min") == 2.5
    assert _charge_rate("45W wired") is None


def test_storage_types_per_size():
    assert parse_storage_types("128GB 8GB RAM, 256GB 8GB RAM | UFS 3.1 - 128GB only UFS 4.0") == {
        "128": "UFS 3.1", "default": "UFS 4.0"}
    assert parse_storage_types("256GB 8GB RAM | UFS 3.1 - 128GB UFS 4.1 - 256/512GB") == {
        "128": "UFS 3.1", "256": "UFS 4.1", "512": "UFS 4.1"}
    assert parse_storage_types("256GB 8GB RAM | NVMe") == {"default": "NVMe"}
    assert parse_storage_types("64GB 4GB RAM | eMMC 5.1") == {"default": "eMMC 5.1"}
    assert parse_storage_types("128GB 4GB RAM | UFS") == {}


def test_tablets_and_region_lines_are_not_candidates():
    from pipeline.discover import excluded

    assert excluded("vivo", "IQOO Pad5c") and excluded("vivo", "Pad5e") and excluded("Samsung", "Galaxy Tab S11")
    assert not excluded("vivo", "X300 Pro") and not excluded("OPPO", "Find X9")
