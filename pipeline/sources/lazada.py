"""Lazada Singapore: official brand-store listings from the Mobiles category.

Lazada's search returns JSON when called with ajax=true. Results are full of
grey imports and fakes (e.g. "S25 Ultra" for $350), so only listings sold by
a brand's own official store are kept, and the brand is taken from the seller.

Search results only expose the cheapest SKU price of each listing. That price
is attributed to the storage named in the title, or to the phone's base
variant when the title doesn't say (see match.pick_variant).
"""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

import requests

from ..match import storages_in

SEARCH_URL = "https://www.lazada.sg/shop-mobiles/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/140.0 Safari/537.36",
    "Accept-Language": "en-SG,en;q=0.9",
}

# Official store name -> brand (names as Lazada shows them, whitespace-stripped)
OFFICIAL_SELLERS = {
    "Apple Flagship Store": "Apple",
    "Samsung": "Samsung",
    "Google Pixel Store": "Google",
    "Xiaomi Official Store": "Xiaomi",
    "POCO Official Store": "Xiaomi",
    "Xiaomi Electronics Authorised Store": "Xiaomi",
    "OPPO": "OPPO",
    "vivo": "vivo",
    "Honor Singapore": "Honor",
    "realme Singapore": "realme",
    "OnePlus Official Store": "OnePlus",
    "Nothing Singapore": "Nothing",
}

# Set by the crawlers: False when a run stopped early because of a captcha/block
last_run_complete = True

# Search text -> the brand whose official store it covers. A brand's crawl is
# complete once all of its queries have run.
QUERY_BRANDS = {
    "iphone": "Apple", "samsung galaxy": "Samsung", "galaxy a": "Samsung", "galaxy s": "Samsung",
    "google pixel": "Google", "xiaomi": "Xiaomi", "redmi": "Xiaomi", "redmi note": "Xiaomi", "poco": "Xiaomi",
    "oppo": "OPPO", "oppo reno": "OPPO", "oppo find": "OPPO", "oppo a": "OPPO", "vivo": "vivo",
    "vivo v": "vivo", "vivo x": "vivo", "vivo y": "vivo", "honor": "Honor", "honor magic": "Honor",
    "realme": "realme", "realme c": "realme", "oneplus": "OnePlus", "nothing phone": "Nothing",
    "cmf phone": "Nothing",
}
QUERIES = list(QUERY_BRANDS)
SNIPPET = Path(__file__).with_name("lazada_snippet.js")
DOWNLOADS = Path.home() / "Downloads"


class Blocked(Exception):
    """Lazada answered with its anti-bot 'punish' (captcha) page."""


def search(query: str, page: int = 1, session: requests.Session | None = None) -> list[dict]:
    params = {"ajax": "true", "q": query, "page": page, "service": "official"}
    r = (session or requests).get(SEARCH_URL, params=params, headers=HEADERS, timeout=30)
    r.raise_for_status()
    if "_____tmd_____/punish" in r.text[:3000]:
        raise Blocked(query)
    return r.json().get("mods", {}).get("listItems", []) or []


def _listing(item: dict, brand: str) -> dict:
    url = item.get("itemUrl", "")
    if url.startswith("//"):
        url = "https:" + url
    orig = item.get("originalPrice")
    return {
        "store": "lazada",
        "brand": brand,
        "title": " ".join(item.get("name", "").split()),
        "seller": item.get("sellerName", "").strip(),
        "price": float(item["price"]),
        "list_price": float(orig) if orig else None,
        "in_stock": bool(item.get("inStock", True)),
        "url": url.split("?")[0],
    }


def official_listings_browser(queries: list[str] | None = None, max_pages: int = 3, delay: float = 5.0,
                              captcha_wait: float = 600.0) -> list[dict]:
    """Same crawl through a visible Chrome window. If Lazada shows its slider
    captcha, waits (up to captcha_wait seconds) for a person to solve it."""
    import subprocess

    from playwright.sync_api import sync_playwright

    from .browser import ROOT

    # A Playwright-launched Chrome carries automation flags that make reCAPTCHA
    # stall, so start a plain Chrome and attach to it over the DevTools port.
    chrome = subprocess.Popen([
        r"C:\Program Files\Google\Chrome\Application\chrome.exe", "--remote-debugging-port=9333",
        f"--user-data-dir={ROOT / '.cache' / 'chrome-lazada-plain'}", "--no-first-run",
        "--no-default-browser-check", "--window-size=1280,900", "about:blank"])
    global last_run_complete
    last_run_complete = True
    seen: dict[str, dict] = {}
    with sync_playwright() as pw:
        for _ in range(30):
            try:
                browser = pw.chromium.connect_over_cdp("http://127.0.0.1:9333")
                break
            except Exception:
                time.sleep(1)
        ctx = browser.contexts[0]
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        try:
            for q in queries or QUERIES:
                for pg in range(1, max_pages + 1):
                    url = f"{SEARCH_URL}?ajax=true&q={requests.utils.quote(q)}&page={pg}&service=official"
                    page.goto(url, wait_until="domcontentloaded", timeout=60000)
                    waited = 0.0
                    if "punish" in page.url:
                        page.bring_to_front()
                        print("  lazada: captcha shown in the Chrome window - waiting for it to be solved",
                              flush=True)
                    while "punish" in page.url and waited < captcha_wait:
                        time.sleep(3)
                        waited += 3
                        # Solving doesn't always redirect; retry the real URL now and then
                        if "punish" not in page.url or waited % 120 == 0:
                            page.goto(url, wait_until="domcontentloaded", timeout=60000)
                    if "punish" in page.url:
                        print("  lazada: captcha not solved, stopping", flush=True)
                        last_run_complete = False
                        return list(seen.values())
                    try:
                        items = json.loads(page.inner_text("body")).get("mods", {}).get("listItems", []) or []
                    except ValueError:
                        items = []
                    time.sleep(delay)
                    if not items:
                        break
                    for it in items:
                        brand = OFFICIAL_SELLERS.get((it.get("sellerName") or "").strip())
                        if brand:
                            seen.setdefault(str(it.get("itemId")), _listing(it, brand))
                print(f"  lazada: {q!r} done, {len(seen)} official listings so far", flush=True)
        finally:
            browser.close()
            chrome.terminate()
    return list(seen.values())


def storage_sizes(properties: list[dict] | None) -> list[int]:
    """Storage sizes in a product page's SKU properties
    (e.g. 'Storage Capacity': ['12GB_256GB', '12GB_512GB'] -> [256, 512]). Any
    property counts, since stores fold storage into others ('Spec': 'Black 12+256GB',
    'Colour': 'Aurora Blue 512GB'); add-ons don't (a free memory card isn't storage)."""
    sizes = set()
    for prop in properties or []:
        if re.search(r"add.?on|bundle|gift|freebie|accessor", prop.get("name") or "", re.I):
            continue
        for v in prop.get("values") or []:
            sizes.update(storages_in((v.get("name") or "").replace("_", " ")))
    return sorted(sizes)


def storage_options(url: str, session: requests.Session | None = None) -> list[int] | None:
    """Storage sizes a listing sells, from its product page. [] when the page
    lists none; None when it couldn't be read (blocked), so it's retried next run."""
    r = (session or requests).get(url, headers=HEADERS, timeout=30)
    if r.status_code != 200 or "_____tmd_____/punish" in r.text[:3000]:
        return None
    m = re.search(r"__moduleData__\s*=\s*(\{.*?\});\s*\n", r.text, re.S)
    if not m:
        return []
    try:
        props = json.loads(m.group(1))["data"]["root"]["fields"]["productOption"]["skuBase"]["properties"] or []
    except (KeyError, TypeError, ValueError):
        return []
    return storage_sizes(props)


def add_storage_options(listings: list[dict], delay: float = 2.5) -> None:
    """Annotate Lazada listings in place with the storage sizes they sell. Stops at
    the first blocked page; the rest keep the storage named in their title."""
    with requests.Session() as session:
        for lst in listings:
            if lst["store"] != "lazada" or lst.get("storage_options") is not None or not lst.get("in_stock", True):
                continue
            opts = storage_options(lst["url"], session)
            if opts is None:
                print("  lazada: product pages blocked; storage taken from titles for the rest", flush=True)
                return
            lst["storage_options"] = opts
            time.sleep(delay)


# ------------------------------------------------------------- browser snippet
# When Lazada blocks scripts, the crawl runs as a snippet pasted into the
# person's own Chrome (a real session passes the captcha), which downloads its
# results as smartbuy-lazada-<date>.json.

def snippet(date: str, max_pages: int = 3) -> str:
    js = SNIPPET.read_text(encoding="utf-8")
    return (js.replace("__QUERIES__", json.dumps(QUERY_BRANDS)).replace("__SELLERS__", json.dumps(OFFICIAL_SELLERS))
            .replace("__DATE__", date).replace("__MAX_PAGES__", str(max_pages)))


def snippet_file(date: str, folder: Path = DOWNLOADS) -> Path | None:
    """The newest download for this date ('smartbuy-lazada-2026-10-02 (1).json' too)."""
    files = sorted(folder.glob(f"smartbuy-lazada-{date}*.json"), key=lambda f: f.stat().st_mtime)
    return files[-1] if files else None


def from_snippet(data: dict) -> tuple[list[dict], set[str]]:
    """(listings, brands whose queries all finished) from a snippet download."""
    listings = []
    for it in data.get("listings") or []:
        lst = _listing(it, it["brand"])
        pdp = it.get("pdp") or {}
        lst["storage_options"] = storage_sizes(pdp.get("properties")) if pdp.get("ok") else None
        listings.append(lst)
    done = set(data.get("queries_done") or [])
    brands = {b for b in set(QUERY_BRANDS.values()) if all(q in done for q, qb in QUERY_BRANDS.items() if qb == b)}
    return listings, brands


def official_listings(queries: list[str] | None = None, max_pages: int = 3, delay: float = 6.0,
                      backoff: float = 180.0, max_blocks: int = 4) -> list[dict]:
    """Every Mobiles-category listing sold by an official brand store.

    Lazada rate-limits bursts with a captcha page, so requests are paced and a
    block triggers a long pause before retrying. After max_blocks blocks the
    crawl stops and returns what it has (callers merge partial runs).
    """
    global last_run_complete
    last_run_complete = True
    seen: dict[str, dict] = {}
    blocks = 0
    with requests.Session() as session:
        for q in queries or QUERIES:
            page = 1
            while page <= max_pages:
                try:
                    items = search(q, page, session=session)
                except Blocked:
                    blocks += 1
                    print(f"  lazada: blocked on {q!r} p{page} ({blocks}/{max_blocks})", flush=True)
                    if blocks >= max_blocks:
                        last_run_complete = False
                        return list(seen.values())
                    time.sleep(backoff)
                    continue
                except (requests.RequestException, ValueError) as e:
                    print(f"  lazada: {q!r} p{page} failed: {e}", flush=True)
                    break
                time.sleep(delay)
                if not items:
                    break
                for it in items:
                    brand = OFFICIAL_SELLERS.get((it.get("sellerName") or "").strip())
                    if brand:
                        seen.setdefault(str(it.get("itemId")), _listing(it, brand))
                page += 1
            print(f"  lazada: {q!r} done, {len(seen)} official listings so far", flush=True)
    return list(seen.values())
