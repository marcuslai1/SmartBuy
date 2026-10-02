import json

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


def test_snippet_download_becomes_listings():
    from pipeline.sources import lazada

    data = {
        "complete": False, "queries_done": ["iphone", "samsung galaxy", "galaxy a", "galaxy s", "xiaomi"],
        "listings": [
            {"brand": "Samsung", "itemId": "1", "name": "Samsung  Galaxy S26, 5G", "price": "1228.00",
             "originalPrice": "1398.00", "sellerName": "Samsung ", "itemUrl": "//www.lazada.sg/products/pdp-i1.html?x=1",
             "inStock": True,
             "pdp": {"ok": True, "properties": [{"name": "Color Family", "values": [{"name": "Navy"}]},
                                                {"name": "Storage Capacity",
                                                 "values": [{"name": "12GB_256GB"}, {"name": "12GB_512GB"}]}]}},
            {"brand": "Xiaomi", "itemId": "2", "name": "Xiaomi 17 12GB+256GB", "price": "999", "sellerName": "x",
             "itemUrl": "//www.lazada.sg/products/pdp-i2.html", "inStock": True, "pdp": {"ok": False}},
        ],
    }
    listings, brands = lazada.from_snippet(data)
    s26, x17 = listings
    assert s26["title"] == "Samsung Galaxy S26, 5G" and s26["url"] == "https://www.lazada.sg/products/pdp-i1.html"
    assert s26["price"] == 1228.0 and s26["list_price"] == 1398.0 and s26["storage_options"] == [256, 512]
    assert x17["storage_options"] is None  # product page unreadable: the title decides
    # Xiaomi's other queries (redmi, poco...) never ran, so only Apple and Samsung are complete
    assert brands == {"Apple", "Samsung"}


def test_crawl_status_merges_brands(tmp_path, monkeypatch):
    from pipeline import prices

    monkeypatch.setattr(prices, "STATUS", tmp_path / "status.json")
    everyone = {"Apple", "Google", "Samsung", "Xiaomi", "vivo"}
    prices.record_crawl_status("2026-10-02", {"Samsung"}, everyone)
    status = json.loads((tmp_path / "status.json").read_text())["2026-10-02"]
    assert status["complete_brands"] == ["Apple", "Google", "Samsung"]
    assert "vivo, Xiaomi" in status["note"]
    prices.record_crawl_status("2026-10-02", prices.lazada_brands_done("2026-10-02") | {"Xiaomi", "vivo"}, everyone)
    status = json.loads((tmp_path / "status.json").read_text())["2026-10-02"]
    assert status["note"] == "" and len(status["complete_brands"]) == 5
