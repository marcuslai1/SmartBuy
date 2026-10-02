"""Step 2: fetch + parse GSMArena spec sheets.

Fetches every discovered candidate plus the phones from the original 2025
dataset (so their July 2025 prices can be kept as price history), and writes
all parsed sheets to data/specs_raw.json. Unsold candidates are still useful:
their lab benchmarks feed the per-chipset performance table.

    python -m pipeline.specs
    python -m pipeline.specs --recheck 30   # also re-fetch up to 30 sheets still missing lab tests
"""
from __future__ import annotations

import datetime as dt
import json
import re
import time
from pathlib import Path
from urllib.parse import quote_plus

from .match import matches
from .enrich import slugify
from .sources.browser import Browser, cached, cached_at
from .sources.gsmarena import BASE, parse_search, parse_spec

ROOT = Path(__file__).resolve().parents[1]
CANDIDATES = ROOT / "data" / "candidates.json"
LEGACY_SPECS = ROOT / "data" / "legacy" / "final_spec.json"
LEGACY_MAP = ROOT / "data" / "legacy" / "gsmarena_map.json"
OUT = ROOT / "data" / "specs_raw.json"
# GSMArena adds these when it reviews a phone, often weeks after launch
LAB_FIELDS = ("active_use_h", "geekbench6", "wildlife_extreme", "measured_nits")

# Legacy names that GSMArena spells differently
LEGACY_SEARCH_OVERRIDES = {
    "Samsung Galaxy S24 Fe": "Galaxy S24 FE",
    "Oneplus Nord 4 256GB 12GB Ram": "OnePlus Nord 4",
    "Samsung Galaxy A36 5G 256GB 8GB Ram": "Galaxy A36",
    "Samsung Galaxy A26 5G": "Galaxy A26",
    "Samsung Galaxy A56 5G": "Galaxy A56",
    "Xiaomi Redmi A5 4G": "Redmi A5",
    "Oppo Reno12 F 5G": "Reno12 F 5G",
    "Nothing Phone 2A Plus": "Phone (2a) Plus",
    "Oppo Reno13 5G": "Reno13",
    "Oppo A5 Pro Global": "A5 Pro",
    "Vivo Y28S 5G": "Y28s",
    "Vivo Y38 5G": "Y38",
    "Vivo Y39 5G": "Y39",
    "Vivo V40 Lite 5G": "V40 Lite",
    "Vivo V50 Lite 5G": "V50 Lite",
    "Vivo V40 5G": "V40",
    "Honor 400 5G": "Honor 400",
    "Honor 400 Pro 5G": "Honor 400 Pro",
    "Honor X9C 5G": "Honor X9c",
    "Realme 14X 5G Global": "realme 14x",
    "Realme 14 5G": "realme 14",
    "Realme 13 Plus 5G": "realme 13+",
    "Realme 13 Pro 5G": "realme 13 Pro",
    "Xiaomi Redmi Note 14 Pro 5G Global": "Redmi Note 14 Pro 5G",
    "Xiaomi Redmi Note 14 Pro Plus 5G Global": "Redmi Note 14 Pro+ 5G",
}


def _clean_legacy_name(name: str) -> str:
    n = LEGACY_SEARCH_OVERRIDES.get(name, name)
    n = re.sub(r"\b(global|\d+gb|ram)\b", "", n, flags=re.I)
    return re.sub(r"\s+", " ", n).strip()


def resolve_legacy(browser: Browser, candidates: list[dict]) -> dict[str, str]:
    """Map each legacy slug -> GSMArena URL (cached in data/legacy/gsmarena_map.json)."""
    mapping = json.loads(LEGACY_MAP.read_text(encoding="utf-8")) if LEGACY_MAP.exists() else {}
    legacy = json.loads(LEGACY_SPECS.read_text(encoding="utf-8"))
    for phone in legacy:
        slug = phone["slug"]
        if slug in mapping:
            continue
        name = _clean_legacy_name(phone["model"])
        brand = phone["brand"].lower()
        hit = next((c for c in candidates if c["brand"].lower() == brand and matches(name, c["name"])
                    and matches(c["name"], name)), None)
        if not hit:
            query = re.sub(rf"^{re.escape(phone['brand'])}\s+", "", name, flags=re.I)
            try:
                html = browser.get(f"{BASE}results.php3?sQuickSearch=yes&sName={quote_plus(query)}")
                results = parse_search(html)
            except RuntimeError:
                results = []
            # GSMArena URLs start with the brand ('xiaomi_15-13472.php'); search is fuzzy across brands
            results = [r for r in results if r["url"].split("/")[-1].startswith(brand + "_")]
            exact = [r for r in results if matches(name, r["name"]) and matches(r["name"], name)]
            # '5G' is ignored when matching; use it to pick e.g. 'Reno12 F 5G' over 'Reno12 F'
            exact.sort(key=lambda r: ("5G" in r["name"]) != ("5G" in name))
            hit = (exact or [r for r in results if matches(name, r["name"])] or [None])[0]
        mapping[slug] = hit["url"] if hit else None
        print(f"  legacy {phone['model']!r:45} -> {hit['name'] if hit else 'NOT FOUND'}")
    LEGACY_MAP.write_text(json.dumps(mapping, indent=2), encoding="utf-8")
    return mapping


def fetch_all(cached_only: bool = False, max_failures: int = 3, recheck: int = 0,
              priority: set[str] | None = None) -> list[dict]:
    """Parse every candidate's spec sheet. cached_only skips pages not fetched yet;
    after max_failures in a row (GSMArena rate limiting) it stops fetching and
    keeps going with cached pages only.

    recheck: also re-fetch up to this many cached sheets of phones from the last
    year that still lack lab tests and weren't fetched in the past week; phones
    in `priority` (ids, e.g. the ones on sale) first, then least recently fetched."""
    candidates = json.loads(CANDIDATES.read_text(encoding="utf-8"))
    records: dict[str, dict] = {}
    failures, missing = 0, []
    with Browser(delay=3.0) as b:
        legacy_map = resolve_legacy(b, candidates)
        urls = list(dict.fromkeys([c["url"] for c in candidates] + [u for u in legacy_map.values() if u]))
        for i, url in enumerate(urls, 1):
            html = cached(url)
            if html is None:
                if cached_only or failures >= max_failures:
                    missing.append(url)
                    continue
                try:
                    html = b.get(url)
                    failures = 0
                except RuntimeError as e:
                    failures += 1
                    missing.append(url)
                    print(f"  [{i}/{len(urls)}] FAILED {url}: {e}", flush=True)
                    continue
            rec = parse_spec(html, url)
            records[rec["gsm_id"]] = rec
            if i % 25 == 0:
                print(f"  [{i}/{len(urls)}] parsed", flush=True)
        if recheck and not cached_only and failures < max_failures:
            year_ago = (dt.date.today() - dt.timedelta(days=365)).isoformat()
            stale = [r for r in records.values() if (r.get("announced") or "") >= year_ago
                     and not all(r.get(k) for k in LAB_FIELDS)
                     and (cached_at(r["gsm_url"]) or 0) < time.time() - 7 * 86400]
            stale.sort(key=lambda r: (slugify(r["name"]) not in (priority or ()), cached_at(r["gsm_url"]) or 0))
            gained = []
            for r in stale[:recheck]:
                try:
                    rec = parse_spec(b.get(r["gsm_url"], refresh=True), r["gsm_url"])
                except RuntimeError as e:
                    print(f"  recheck FAILED {r['gsm_url']}: {e}", flush=True)
                    failures += 1
                    if failures >= max_failures:
                        break
                    continue
                failures = 0
                new = [k for k in LAB_FIELDS if rec.get(k) and not r.get(k)]
                if new:
                    gained.append(f"{rec['name']} ({', '.join(new)})")
                records[rec["gsm_id"]] = rec
            print(f"  rechecked {min(len(stale), recheck)} of {len(stale)} sheets missing lab tests; new results: "
                  + ("; ".join(gained) or "none"), flush=True)
    if missing:
        print(f"  {len(missing)} spec sheets not fetched yet (re-run later): "
              + ", ".join(u.rsplit('/', 1)[-1] for u in missing[:8]) + (" ..." if len(missing) > 8 else ""))
    return list(records.values())


if __name__ == "__main__":
    import sys

    n = int(sys.argv[sys.argv.index("--recheck") + 1]) if "--recheck" in sys.argv else 0
    recs = fetch_all(cached_only="--cached-only" in sys.argv, recheck=n)
    OUT.write_text(json.dumps(recs, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"{len(recs)} spec sheets -> {OUT}")
