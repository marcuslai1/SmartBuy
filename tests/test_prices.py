from pipeline.prices import observations, reference_sgd

PHONES = [
    {"id": "samsung-galaxy-s26", "name": "Samsung Galaxy S26", "brand": "Samsung", "match_name": "Galaxy S26",
     "variants": [{"storage_gb": 128, "ram_gb": 12.0}, {"storage_gb": 256, "ram_gb": 12.0},
                  {"storage_gb": 512, "ram_gb": 12.0}],
     "price_text": "$ 899.99 / € 899.00"},
    {"id": "samsung-galaxy-s26-ultra", "name": "Samsung Galaxy S26 Ultra", "brand": "Samsung",
     "match_name": "Galaxy S26 Ultra", "variants": [{"storage_gb": 256, "ram_gb": 12.0}], "price_text": None},
]


def listing(title, price, **kw):
    return {"store": "lazada", "brand": "Samsung", "title": title, "seller": "Samsung", "price": price,
            "list_price": None, "in_stock": True, "url": "https://example/" + title, **kw}


def run(*listings):
    return observations(list(listings), PHONES, "2026-10-02")


def test_reference_price_conversion():
    assert round(reference_sgd("$ 899.99 / € 899.00")) == 1170
    assert reference_sgd(None) is None


def test_listing_options_decide_the_variant():
    rows, _ = run(listing("Samsung Galaxy S26, 5G, AI Phone", 1228, storage_options=[256, 512]))
    assert rows[0]["storage_gb"] == 256 and rows[0]["variant_basis"] == "listing options"


def test_title_storage_and_assumed_base():
    rows, _ = run(listing("Samsung Galaxy S26 512GB", 1500), listing("Samsung Galaxy S26", 1100))
    assert {(r["storage_gb"], r["variant_basis"]) for r in rows} == {(512, "title"), (128, "assumed base")}


def test_rejects_bundles_fakes_and_unknown_models():
    rows, rejected = run(
        listing("[Bundle] Samsung Galaxy S26 + Buds4", 1300),
        listing("Samsung Galaxy S26 5G 256GB", 350),            # far below the reference price
        listing("Samsung Galaxy Z Fold9", 2500),                 # not in catalog
        listing("Samsung Galaxy S26 Ultra", 1478, in_stock=False),
    )
    assert rows == []
    assert sorted(r["why"].split(" ")[0] for r in rejected) == ["bundle/demo/refurb", "no", "out", "price"]


def test_most_specific_model_wins():
    rows, _ = run(listing("Samsung Galaxy S26 Ultra, 5G, AI Phone", 1478))
    assert rows[0]["phone_id"] == "samsung-galaxy-s26-ultra"
