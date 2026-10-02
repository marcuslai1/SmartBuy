"""Google Store Singapore: 'from' price (base storage) for each Pixel.

Product pages carry schema.org markup: <meta itemprop="lowPrice" content="1199">.
"""
from __future__ import annotations

import re
import time

import requests

from .lazada import HEADERS

BASE = "https://store.google.com/sg/product/"


def slug_for(model_name: str) -> str:
    """'Pixel 10 Pro XL' -> 'pixel_10_pro_xl'"""
    return re.sub(r"[^a-z0-9]+", "_", model_name.lower()).strip("_")


def listings(model_names: list[str], delay: float = 1.5) -> list[dict]:
    out = []
    for name in model_names:
        url = f"{BASE}{slug_for(name)}?hl=en-GB"
        r = requests.get(url, headers=HEADERS, timeout=30)
        time.sleep(delay)
        if r.status_code != 200 or slug_for(name) not in r.url:
            continue
        m = re.search(r'itemprop="lowPrice" content="([\d.]+)"', r.text)
        if not m:
            continue
        out.append({
            "store": "store.google.com/sg",
            "brand": "Google",
            "title": f"Google {name}",
            "seller": "Google",
            "price": float(m.group(1)),
            "list_price": None,
            "in_stock": True,
            "url": url.split("?")[0],
        })
    return out
