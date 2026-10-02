"""Apple Store Singapore: exact price for every iPhone model and storage size.

Each buy page embeds analytics JSON like
  {"sku":"MG6N4","partNumber":"MG6N4X/A","price":{"fullPrice":1449.00},"category":"iphone","name":"iPhone 17 256GB Sage"}
"""
from __future__ import annotations

import re
import time

import requests

from .lazada import HEADERS

BASE = "https://www.apple.com/sg/shop/buy-iphone"
_ITEM_RE = re.compile(
    r'"price":\{"fullPrice":([\d.]+)\},"category":"iphone","name":"(iPhone[^"]*?) (\d+)(GB|TB) [^"]*"')


def model_pages() -> list[str]:
    r = requests.get(BASE, headers=HEADERS, timeout=30)
    r.raise_for_status()
    return sorted(set(re.findall(r"/sg/shop/buy-iphone/(iphone-[a-z0-9-]+)", r.text)))


def listings(delay: float = 1.5) -> list[dict]:
    out: dict[tuple, dict] = {}
    for slug in model_pages():
        url = f"{BASE}/{slug}"
        r = requests.get(url, headers=HEADERS, timeout=30)
        time.sleep(delay)
        if r.status_code != 200:
            continue
        for price, model, size, unit in _ITEM_RE.findall(r.text):
            storage = int(size) * (1024 if unit == "TB" else 1)
            key = (model, storage)
            if key not in out:
                out[key] = {
                    "store": "apple.com/sg",
                    "brand": "Apple",
                    "title": f"{model} {size}{unit}",
                    "seller": "Apple",
                    "price": float(price),
                    "list_price": None,
                    "in_stock": True,
                    "url": url,
                    "storage_gb": storage,
                }
    return list(out.values())
