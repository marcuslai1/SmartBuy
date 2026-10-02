"""Value: how much more (or less) phone you get than is typical at the price.

The old engine used spec_score / price, min-max scaled inside $400/$800
brackets. Price varies ~20x while spec scores vary ~3x, so that formula ranked
phones almost purely cheapest-first (Spearman -0.93 with price in midrange).

Here an expected spec score is fitted across *all* priced phones as a straight
line in log(price): expected = a + b * ln(price). A phone's value is its
residual (actual - expected) in units of the residual spread, centred on 5:
  value = 5 + VALUE_SPREAD * residual / sd   (clamped 0-10)
so a phone exactly on the curve scores 5, one sd above scores 7.
"""
from __future__ import annotations

import math

from . import config as C


def fit(prices: list[float], scores: list[float]) -> dict:
    xs = [math.log(p) for p in prices]
    n = len(xs)
    mx, my = sum(xs) / n, sum(scores) / n
    sxx = sum((x - mx) ** 2 for x in xs)
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, scores))
    b = sxy / sxx
    a = my - b * mx
    resid = [y - (a + b * x) for x, y in zip(xs, scores)]
    sd = math.sqrt(sum(r * r for r in resid) / max(1, n - 2))
    ss_tot = sum((y - my) ** 2 for y in scores)
    r2 = 1 - sum(r * r for r in resid) / ss_tot if ss_tot else 0.0
    return {"a": a, "b": b, "sd": sd, "r2": r2, "n": n}


def expected(model: dict, price: float) -> float:
    return model["a"] + model["b"] * math.log(price)


def value_score(model: dict, price: float, spec: float) -> float:
    resid = spec - expected(model, price)
    return max(0.0, min(10.0, 5.0 + C.VALUE_SPREAD * resid / model["sd"]))


def smartbuy(spec: float, value: float) -> float:
    return C.SMARTBUY_BLEND * spec + (1 - C.SMARTBUY_BLEND) * value
