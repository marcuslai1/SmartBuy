from pipeline import build
from pipeline import config as C


def _offer(sgd, storage_gb, ram_gb=8.0, store="lazada"):
    return {"sgd": sgd, "list_sgd": None, "storage_gb": storage_gb, "ram_gb": ram_gb, "store": store,
            "seller": "Official", "url": f"https://example.com/{storage_gb}", "date": "2026-10-02",
            "variant_basis": "listing options"}


PHONE = {"variants": [{"storage_gb": 128, "ram_gb": 8.0}, {"storage_gb": 256, "ram_gb": 8.0},
                      {"storage_gb": 512, "ram_gb": 12.0}],
         "storage_types": {"default": "UFS 3.1"}}


def test_unlisted_bigger_sizes_are_priced_up_and_flagged():
    vs = build.priced_variants(PHONE, [_offer(400, 128)], [], "2026-10-02")
    assert [v["storage_gb"] for v in vs] == [128, 256, 512]
    v128, v256, v512 = vs
    assert v128["est_from"] is None and v128["sgd"] == 400
    step = max(C.STORAGE_STEP_MIN, C.STORAGE_STEP_SHARE * 400)
    assert v256["sgd"] == round(400 + step, -1) and v256["est_from"] == {"storage_gb": 128, "sgd": 400, "steps": 1}
    assert v512["est_from"]["steps"] == 2 and v512["sgd"] > v256["sgd"]
    assert v512["ram_gb"] == 12.0 and v512["memory"] > v128["memory"]   # more RAM, same storage speed
    assert v256["variant_basis"] == "estimated"


def test_listed_sizes_beat_estimates_and_smaller_sizes_are_not_invented():
    vs = build.priced_variants(PHONE, [_offer(500, 256), _offer(560, 512, 12.0), _offer(520, 256)], [],
                               "2026-10-02")
    # 128GB exists but no store lists it: not offered. Both bigger sizes are real prices.
    assert [(v["storage_gb"], v["sgd"], v["est_from"]) for v in vs] == [(256, 500, None), (512, 560, None)]


def test_cheapest_variant_meeting_the_need():
    vs = build.priced_variants(PHONE, [_offer(400, 128)], [], "2026-10-02")
    assert build.choose_variant(vs, 0)["storage_gb"] == 128
    assert build.choose_variant(vs, 256)["storage_gb"] == 256
    assert build.choose_variant(vs, 1024) is None
    # A bigger size on sale for less than a smaller one wins
    cheap_big = build.priced_variants(PHONE, [_offer(450, 128), _offer(430, 256)], [], "2026-10-02")
    assert build.choose_variant(cheap_big, 128)["storage_gb"] == 256
