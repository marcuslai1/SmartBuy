"""Step 1: discover candidate phones from GSMArena brand listings.

Keeps phones announced on/after MIN_ANNOUNCED, drops tablets, watches,
foldables and obviously region-locked lines (China/India-only). Whether a
candidate makes it onto the site is decided later by whether an official
Singapore store actually sells it (see prices step).

    python -m pipeline.discover            # writes data/candidates.json
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from .sources.browser import Browser
from .sources.gsmarena import BRAND_PAGES, brand_page_url, parse_listing

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "candidates.json"
MIN_ANNOUNCED = "2025-01"
MAX_PAGES = 5

# Not phones, or not comparable (foldables have their own price logic)
EXCLUDE_ANY = re.compile(
    r"(ipad|\bpad\d*\b|magicpad|\btab\b|tablet|watch|band|buds|fold|flip|trifold|\bduo\b|robot|xcover|"
    r"magic ?v\d)|\((china|india|in/pk|us|russia)\)",
    re.I)

# Lines only sold in China/India. This is just to save fetching: whether a
# phone appears on the site is decided by an official SG store selling it.
EXCLUDE_LINES = {
    "Samsung": r"^Galaxy (M|F)\d",
    "Xiaomi": r"^(Redmi K|Redmi Turbo|Black Shark|Civi|1[5-9] Max|Redmi Note \d+R)",
    "OPPO": r"^(K\d|F\d)",
    "vivo": r"^(iQOO|S\d|T\d|Y\d{3})",
    "Honor": r"^(Play|X\d{2}|Win|Power|GT|Turbo)",
    "realme": r"^(Narzo|P\d|Neo|GT\d)",
    "OnePlus": r"^(Ace|Turbo)",
    "Nothing": r"^CMF (Watch|Buds)",
}


def discover() -> list[dict]:
    found: list[dict] = []
    with Browser() as b:
        for brand, slug in BRAND_PAGES.items():
            for page in range(1, MAX_PAGES + 1):
                html = b.get(brand_page_url(slug, page))
                items = parse_listing(html)
                if not items:
                    break
                for it in items:
                    if (it["announced"] or "0000") < MIN_ANNOUNCED:
                        continue
                    name = it["name"]
                    if EXCLUDE_ANY.search(name) or re.search(EXCLUDE_LINES.get(brand, r"^$"), name):
                        continue
                    found.append({"brand": brand, **it})
                # Stop paging once the listing is older than our window
                if items and all((i["announced"] or "0000") < MIN_ANNOUNCED for i in items[-10:]):
                    break
    return found


if __name__ == "__main__":
    cands = discover()
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(cands, indent=2, ensure_ascii=False), encoding="utf-8")
    by_brand: dict[str, list[str]] = {}
    for c in cands:
        by_brand.setdefault(c["brand"], []).append(f'{c["name"]} ({c["announced"]})')
    for brand, names in by_brand.items():
        print(f"{brand} [{len(names)}]: " + "; ".join(names))
    print(f"\n{len(cands)} candidates -> {OUT}")
