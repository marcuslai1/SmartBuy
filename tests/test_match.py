from pipeline.match import best_match, matches, pick_variant, storages_in

SAMSUNG = [{"match_name": n} for n in ["Galaxy S26", "Galaxy S26+", "Galaxy S26 Ultra", "Galaxy S26 FE",
                                       "Galaxy A17", "Galaxy A17 4G", "Galaxy A07", "Galaxy A07 4G"]]


def pick(title, models=SAMSUNG):
    m = best_match(title, models)
    return m["match_name"] if m else None


def test_model_suffixes_are_not_confused():
    assert pick("Samsung Galaxy S26, 5G, AI Phone") == "Galaxy S26"
    assert pick("Samsung Galaxy S26+, 5G, AI Phone") == "Galaxy S26+"
    assert pick("Samsung Galaxy S26 Ultra, 5G, AI Phone") == "Galaxy S26 Ultra"
    assert pick("Samsung Galaxy S26 FE, 5G, AI Phone") == "Galaxy S26 FE"


def test_4g_and_lte_variants():
    assert pick("Samsung Galaxy A17 5G") == "Galaxy A17"
    assert pick("Samsung Galaxy A17 4G 128GB") == "Galaxy A17 4G"
    assert pick("Samsung Galaxy A07 LTE") == "Galaxy A07 4G"


def test_line_words_block_false_matches():
    xiaomi = [{"match_name": "17"}, {"match_name": "Redmi Note 17"}, {"match_name": "17T Pro"}]
    assert pick("Redmi Note 17 5G 6G+256G", xiaomi) == "Redmi Note 17"
    assert pick("Xiaomi 17T Pro 12GB+512GB", xiaomi) == "17T Pro"


def test_spacing_and_parentheses_variants():
    assert matches("OPPO Reno15 F 5G 16GB (8+8) + 512GB", "Reno15 F")
    assert not matches("OPPO Reno15 F 5G 16GB (8+8) + 512GB", "Reno15")
    assert matches("[New] Nothing Phone (4a) | Essential AI", "Phone (4a)")
    assert not matches("[New] Nothing Phone (4a) Pro", "Phone (4a)")


def test_ram_notation_after_model_name():
    assert matches("[NEW] HONOR 600 Pro 5G Smartphone | 28(12+16)GB+512GB", "600 Pro")
    assert matches("[NEW] OPPO A6c 12(4+8GB) + 128GB | 7000mAh Battery", "A6c")
    xiaomi = [{"match_name": "Redmi A7 Pro"}, {"match_name": "Redmi A7 Pro 4G"}]
    assert pick("REDMI A7 Pro smartphone | 4G+128G, Immersive 6.9\" display", xiaomi) == "Redmi A7 Pro"


def test_bare_number_models_must_lead_the_title():
    assert matches("[NEW] HONOR 500 5G Smartphone 12GB+256GB", "500")
    assert not matches("HONOR X7e Smartphone 12(6+6)GB+256GB 7,500mAh Battery", "500")
    assert not matches("realme Note 70T 4G AI Smartphone 256GB | Android 15", "15")
    assert not matches("Google Pixel 11 Pro Fold", "Pixel 11 Pro")


def test_4g_suffix_without_a_4g_sibling():
    realme = [{"match_name": "Note 70T"}, {"match_name": "Note 70"}]
    assert pick("realme Note 70T 4G AI Smartphone 256GB", realme) == "Note 70T"


def test_multi_model_titles_are_ambiguous():
    assert pick("Samsung Galaxy S26 Ultra | S26 Plus | S26") is None


def test_storage_and_variant_choice():
    variants = [{"storage_gb": 128, "ram_gb": 6.0}, {"storage_gb": 256, "ram_gb": 8.0}]
    assert storages_in("vivo V80 Lite 5G 6GB+128GB / 8GB+256GB") == [128, 256]
    assert pick_variant("vivo V80 Lite 5G 6GB+128GB / 8GB+256GB", variants)["storage_gb"] == 128
    assert pick_variant("realme 15 5G 26GB(12+14)+256GB", variants)["storage_gb"] == 256
    assert pick_variant("Samsung Galaxy A57 5G", variants)["storage_gb"] == 128
