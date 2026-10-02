"""Step 3: crawl store prices and append them to the price history.

Every observation is one row in data/prices.csv:
  date, phone_id, storage_gb, ram_gb, price_sgd, list_price_sgd, store, seller, title, url,
  variant_basis (how the storage was determined: store / listing options / title / assumed base)

Rows are only ever appended, so the file is the price history. The July 2025
snapshot from the original project is imported once as the first rows.

Listings are matched to phones by name (match.py), never by list position,
and each price is tied to the storage variant it actually buys.

    python -m pipeline.prices crawl            # fetch today's prices (Lazada, Apple, Google)
    python -m pipeline.prices crawl --snippet  # Lazada via the snippet in your own Chrome straight away
    python -m pipeline.prices crawl --fresh    # start today's crawl over
    python -m pipeline.prices legacy           # import the July 2025 snapshot (once)

If Lazada blocks plain requests, the crawl hands over to a snippet you paste
into your own Chrome's console (a real browser session gets past the captcha
where scripts can't); it waits for the snippet's download and carries on.
"""
from __future__ import annotations

import csv
import datetime as dt
import json
import re
import subprocess
import sys
import time
from pathlib import Path

from . import config as C
from .enrich import canonical
from .match import best_match, pick_variant, storages_in

ROOT = Path(__file__).resolve().parents[1]
PRICES = ROOT / "data" / "prices.csv"
SPECS = ROOT / "data" / "specs_raw.json"
UNMATCHED = ROOT / ".cache" / "unmatched-listings.json"
FIELDS = ["date", "phone_id", "storage_gb", "ram_gb", "price_sgd", "list_price_sgd",
          "store", "seller", "title", "url", "variant_basis"]
LEGACY_DATE = "2025-07-15"


def load_rows() -> list[dict]:
    if not PRICES.exists():
        return []
    with PRICES.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        r["storage_gb"] = int(r["storage_gb"]) if r["storage_gb"] else None
        r["ram_gb"] = float(r["ram_gb"]) if r["ram_gb"] else None
        r["price_sgd"] = float(r["price_sgd"])
        r["list_price_sgd"] = float(r["list_price_sgd"]) if r["list_price_sgd"] else None
    return rows


def append_rows(new: list[dict]) -> int:
    existing = load_rows()
    key = lambda r: (r["date"], r["phone_id"], r["store"], r["url"], str(r["storage_gb"]))
    seen = {key(r) for r in existing}
    fresh = [r for r in new if key(r) not in seen]
    write_header = not PRICES.exists()
    with PRICES.open("a", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        if write_header:
            w.writeheader()
        for r in fresh:
            w.writerow({k: r.get(k) for k in FIELDS})
    return len(fresh)


def reference_sgd(price_text: str | None) -> float | None:
    """GSMArena's street price ('$ 669.43 / € 688.54') converted to SGD."""
    if not price_text:
        return None
    for sym, rate in C.FX_TO_SGD.items():
        m = re.search(re.escape(sym) + r"\s*([\d,]+(?:\.\d+)?)", price_text)
        if m:
            return float(m.group(1).replace(",", "")) * rate
    return None


def catalog() -> list[dict]:
    return [canonical(r) for r in json.loads(SPECS.read_text(encoding="utf-8"))]


def observations(listings: list[dict], phones: list[dict], date: str) -> tuple[list[dict], list[dict]]:
    """Turn raw store listings into price rows. Returns (rows, rejected)."""
    by_brand: dict[str, list[dict]] = {}
    for p in phones:
        by_brand.setdefault(p["brand"], []).append(p)
    rows, rejected = [], []
    for lst in listings:
        title = lst["title"]
        if re.search(C.LISTING_REJECT, title, re.I):
            rejected.append({**lst, "why": "bundle/demo/refurb"})
            continue
        if not lst.get("in_stock", True):
            rejected.append({**lst, "why": "out of stock"})
            continue
        phone = best_match(title, by_brand.get(lst["brand"], []))
        if not phone:
            rejected.append({**lst, "why": "no catalog match"})
            continue
        if lst.get("storage_gb"):
            opts = [v for v in phone["variants"] if v["storage_gb"] == lst["storage_gb"]]
            variant = min(opts, key=lambda v: v["ram_gb"]) if opts else None
            basis = "store"
        elif lst.get("storage_options"):
            # Listing price is its cheapest SKU = the smallest storage it sells
            variant = pick_variant(" ".join(f"{s}GB" for s in lst["storage_options"]), phone["variants"])
            basis = "listing options"
        elif storages_in(title):
            variant, basis = pick_variant(title, phone["variants"]), "title"
        else:
            # Google Store 'from' prices are the base model; otherwise it's a guess
            variant = pick_variant(title, phone["variants"])
            basis = "store" if lst["store"].startswith("store.google") else "assumed base"
        if not variant:
            rejected.append({**lst, "why": f"no variant for {phone['name']}"})
            continue
        ref = reference_sgd(phone.get("price_text"))
        lo, hi = C.PRICE_SANITY
        if ref and not (ref * lo <= lst["price"] <= ref * hi):
            rejected.append({**lst, "why": f"price {lst['price']} vs reference ~{ref:.0f} for {phone['name']}"})
            continue
        rows.append({
            "date": date, "phone_id": phone["id"], "storage_gb": variant["storage_gb"],
            "ram_gb": variant["ram_gb"], "price_sgd": lst["price"], "list_price_sgd": lst.get("list_price"),
            "store": lst["store"], "seller": lst.get("seller"), "title": title, "url": lst["url"],
            "variant_basis": basis,
        })
    return rows, rejected


def crawl(date: str | None = None, fresh: bool = False, lazada_mode: str = "auto", wait_minutes: float = 45) -> dict:
    """Fetch today's listings, then turn them into price rows. Returns a summary.

    Listings found by any run on the same day are merged (cached in
    .cache/listings-<date>.json), and Lazada is only crawled again for brands a
    previous run didn't finish. fresh: start the day over.

    lazada_mode:
      auto     plain requests; if Lazada blocks them, hand over to the browser snippet
      snippet  go straight to the snippet (run in your own Chrome, see lazada_snippet.js)
      browser  a script-driven Chrome window (captcha solved by hand)
      skip     official Apple/Google stores only
    wait_minutes: how long to wait for the snippet's download before carrying on without it.
    """
    from .sources import apple, google_store, lazada

    date = date or dt.date.today().isoformat()
    cache = ROOT / ".cache" / f"listings-{date}.json"
    phones = catalog()
    listings = [] if fresh or not cache.exists() else json.loads(cache.read_text(encoding="utf-8"))
    lazada_brands = set(lazada.QUERY_BRANDS.values())
    done = set() if fresh else lazada_brands_done(date)

    if done < lazada_brands and lazada_mode != "skip":
        found, finished = [], set()
        if lazada_mode == "browser":
            found = lazada.official_listings_browser()
            finished = lazada_brands if lazada.last_run_complete else set()
        elif lazada_mode == "auto" and not lazada.snippet_file(date):
            found = lazada.official_listings(max_blocks=1)
            finished = lazada_brands if lazada.last_run_complete else set()
        if not finished >= lazada_brands and lazada_mode != "browser":
            more, finished_more = lazada_via_snippet(date, wait_minutes)
            found, finished = found + more, finished | finished_more
        listings += found
        done |= finished
    record_crawl_status(date, done, lazada_brands)

    if not any(l["store"] == "apple.com/sg" for l in listings):
        listings += apple.listings()
    if not any(l["store"].startswith("store.google") for l in listings):
        listings += google_store.listings([p["model"] for p in phones if p["brand"] == "Google"])
    # Later runs win: their listings carry fresher prices and product-page details
    listings = list({l["url"] + "|" + l["title"]: l for l in listings}.values())
    cache.parent.mkdir(exist_ok=True)
    cache.write_text(json.dumps(listings, indent=1, ensure_ascii=False), encoding="utf-8")
    lazada.add_storage_options(listings)  # plain-crawled listings only; stops if blocked
    cache.write_text(json.dumps(listings, indent=1, ensure_ascii=False), encoding="utf-8")
    rows, rejected = observations(listings, phones, date)
    added = append_rows(rows)
    UNMATCHED.write_text(json.dumps(rejected, indent=1, ensure_ascii=False), encoding="utf-8")
    # Official listings for phones we have no spec sheet for (foldables are out of scope)
    no_specs = [{k: r[k] for k in ("brand", "title", "price", "store", "url")} for r in rejected
                if r["why"] == "no catalog match" and not re.search(r"fold|flip|duo|magic ?v\d|buds|case", r["title"], re.I)]
    (ROOT / "data" / "listings_without_specs.json").write_text(
        json.dumps({"date": date, "listings": no_specs}, indent=1, ensure_ascii=False), encoding="utf-8")
    missing = sorted(lazada_brands - done - {"Apple", "Google"}, key=str.lower)
    print(f"{len(listings)} listings -> {len(rows)} price rows ({added} new), {len(rejected)} rejected "
          f"(see {UNMATCHED.relative_to(ROOT)})")
    if missing:
        print(f"Lazada not finished for: {', '.join(missing)} (run again to finish; earlier listings are kept)")
    return {"date": date, "listings": len(listings), "rows": len(rows), "added": added,
            "rejected": len(rejected), "incomplete_brands": missing, "no_specs": len(no_specs)}


def lazada_via_snippet(date: str, wait_minutes: float) -> tuple[list[dict], set[str]]:
    """Lazada listings from the browser snippet's download, asking for (and
    waiting on) a run if there isn't a finished one for this date yet."""
    from .sources import lazada

    found = lazada.snippet_file(date)
    data = json.loads(found.read_text(encoding="utf-8")) if found else None
    if not (data and data.get("complete")) and wait_minutes > 0:
        js_path = ROOT / ".cache" / f"lazada-snippet-{date}.js"
        js = lazada.snippet(date)
        js_path.parent.mkdir(exist_ok=True)
        js_path.write_text(js, encoding="utf-8")
        copied = _to_clipboard(js)
        step1 = ("The snippet is on your clipboard." if copied
                 else f"Copy everything in {js_path} (opened in Notepad).")
        print("\nLazada is blocking scripts, so its crawl runs in your own Chrome:\n"
              f"  1. {step1}\n"
              "  2. In Chrome, open https://www.lazada.sg/, press F12 and pick the Console tab\n"
              "     (the first time, Chrome asks you to type: allow pasting).\n"
              "  3. Paste and press Enter. If a captcha comes up, follow the link in the black box.\n"
              f"  It saves smartbuy-lazada-{date}.json to {lazada.DOWNLOADS} when done (~15 min).\n"
              + ("  A partial run was found; pasting again resumes it.\n" if data else "")
              + f"  Waiting up to {wait_minutes:g} min...", flush=True)
        if not copied:
            _open_in_notepad(js_path)
        since = found.stat().st_mtime if found else 0.0
        deadline = time.time() + wait_minutes * 60
        while time.time() < deadline:
            latest = lazada.snippet_file(date)
            if latest and latest.stat().st_mtime > since:
                time.sleep(2)  # let the download finish writing
                found, data = latest, json.loads(latest.read_text(encoding="utf-8"))
                break
            time.sleep(5)
        else:
            print(f"  no snippet download after {wait_minutes:g} min; carrying on without it", flush=True)
    if not data:
        return [], set()
    listings, brands = lazada.from_snippet(data)
    print(f"  lazada: {len(listings)} official listings from {found.name}"
          f"{'' if data.get('complete') else ' (partial run)'}", flush=True)
    return listings, brands


def _to_clipboard(text: str) -> bool:
    try:
        subprocess.run(["clip"], input=text.encode("utf-16"), check=True, capture_output=True)
        return True
    except (OSError, subprocess.CalledProcessError):
        return False


def _open_in_notepad(path: Path) -> None:
    try:
        subprocess.Popen(["notepad.exe", str(path)])
    except OSError:
        pass


STATUS = ROOT / "data" / "crawl_status.json"


def lazada_brands_done(date: str) -> set[str]:
    status = json.loads(STATUS.read_text(encoding="utf-8")) if STATUS.exists() else {}
    return set((status.get(date) or {}).get("lazada_brands", []))


def record_crawl_status(date: str, lazada_done: set[str], lazada_brands: set[str]) -> None:
    """data/crawl_status.json: which brands a day's crawl fully covered. Apple and
    Google have their own official stores; everyone else depends on Lazada."""
    status = json.loads(STATUS.read_text(encoding="utf-8")) if STATUS.exists() else {}
    missing = sorted(lazada_brands - lazada_done - {"Apple", "Google"}, key=str.lower)
    status[date] = {
        "complete_brands": sorted(lazada_done | {"Apple", "Google"}, key=str.lower),
        "lazada_brands": sorted(lazada_done, key=str.lower),
        "note": f"Lazada blocked the crawl partway through; {', '.join(missing)} listings are incomplete."
                if missing else "",
    }
    STATUS.write_text(json.dumps(status, indent=1), encoding="utf-8")


def import_legacy() -> None:
    """Import the July 2025 Lazada snapshot as the first history rows."""
    legacy = json.loads((ROOT / "data/legacy/final_spec.json").read_text(encoding="utf-8"))
    lazada_names = json.loads((ROOT / "data/legacy/lazada_prices.json").read_text(encoding="utf-8"))
    gsm_map = json.loads((ROOT / "data/legacy/gsmarena_map.json").read_text(encoding="utf-8"))
    by_url = {p["gsm_url"]: p for p in catalog()}
    rows = []
    for old, laz in zip(legacy, lazada_names):  # the original files were aligned by index
        phone = by_url.get(gsm_map.get(old["slug"]) or "")
        if not phone or not old.get("price_sgd"):
            print(f"  skip {old['model']}: no catalog phone")
            continue
        title = laz.get("name") or old["model"]
        variant = pick_variant(title, phone["variants"]) or {}
        rows.append({
            "date": LEGACY_DATE, "phone_id": phone["id"], "storage_gb": variant.get("storage_gb"),
            "ram_gb": variant.get("ram_gb"), "price_sgd": float(old["price_sgd"]), "list_price_sgd": None,
            "store": "lazada", "seller": "", "title": title, "url": old.get("price_url", ""),
            "variant_basis": "title" if storages_in(title) else "assumed base",
        })
    print(f"legacy: {append_rows(rows)} rows imported from the July 2025 snapshot")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "crawl"
    if cmd == "legacy":
        import_legacy()
    else:
        mode = next((m for m in ("snippet", "browser", "skip")
                     if f"--{m}" in sys.argv or f"--lazada-{m}" in sys.argv), "auto")
        crawl(fresh="--fresh" in sys.argv, lazada_mode=mode)
