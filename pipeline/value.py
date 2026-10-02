"""Value: how much more (or less) phone you get than is typical at the price.

The old engine used spec_score / price, min-max scaled inside $400/$800
brackets. Price varies ~20x while spec scores vary ~3x, so that formula ranked
phones almost purely cheapest-first (Spearman -0.93 with price in midrange).

Here an expected spec score is fitted across *all* priced phones as a curve
in log(price): expected = a + b*x + c*x^2, x = ln(price). Spec scores top out
at 10, so each extra dollar buys less at the top end; a straight line in
ln(price) ignored that and under-rated every phone above ~S$1500 (mean
residual -0.6) while flattering S$600-1000 ones (+0.4). Past the curve's peak
the expected score is held flat, so paying more never lowers the bar.

A phone's value is its residual (actual - expected) in units of the residual
spread, centred on 5:
  value = 5 + VALUE_SPREAD * residual / sd   (clamped 0-10)
so a phone exactly on the curve scores 5, one sd above scores 7.
"""
from __future__ import annotations

import math

from . import config as C


def _solve3(m: list[list[float]], v: list[float]) -> list[float]:
    """Solve a 3x3 linear system by Gaussian elimination with partial pivoting."""
    a = [row[:] + [rhs] for row, rhs in zip(m, v)]
    for i in range(3):
        piv = max(range(i, 3), key=lambda r: abs(a[r][i]))
        a[i], a[piv] = a[piv], a[i]
        for r in range(i + 1, 3):
            f = a[r][i] / a[i][i]
            a[r] = [x - f * y for x, y in zip(a[r], a[i])]
    out = [0.0, 0.0, 0.0]
    for i in (2, 1, 0):
        out[i] = (a[i][3] - sum(a[i][j] * out[j] for j in range(i + 1, 3))) / a[i][i]
    return out


def fit(prices: list[float], scores: list[float]) -> dict:
    xs = [math.log(p) for p in prices]
    n = len(xs)
    mx, my = sum(xs) / n, sum(scores) / n
    us = [x - mx for x in xs]  # centred, so the normal equations are well conditioned
    k0, k1, k2 = _solve3([[sum(u ** (i + j) for u in us) for j in range(3)] for i in range(3)],
                         [sum(y * u ** i for u, y in zip(us, scores)) for i in range(3)])
    # expand k0 + k1*(x - mx) + k2*(x - mx)^2 into a + b*x + c*x^2
    model = {"a": k0 - k1 * mx + k2 * mx * mx, "b": k1 - 2 * k2 * mx, "c": k2}
    resid = [y - expected(model, p) for p, y in zip(prices, scores)]
    sd = math.sqrt(sum(r * r for r in resid) / max(1, n - 3))
    ss_tot = sum((y - my) ** 2 for y in scores)
    r2 = 1 - sum(r * r for r in resid) / ss_tot if ss_tot else 0.0
    return {**model, "sd": sd, "r2": r2, "n": n}


def expected(model: dict, price: float) -> float:
    a, b, c = model["a"], model["b"], model.get("c", 0.0)
    x = math.log(price)
    if c:
        # hold the curve flat beyond its turning point so it never falls as price rises
        peak = -b / (2 * c)
        x = min(x, peak) if c < 0 else max(x, peak)
    return a + b * x + c * x * x


def value_score(model: dict, price: float, spec: float) -> float:
    resid = spec - expected(model, price)
    return max(0.0, min(10.0, 5.0 + C.VALUE_SPREAD * resid / model["sd"]))


def smartbuy(spec: float, value: float) -> float:
    return C.SMARTBUY_BLEND * spec + (1 - C.SMARTBUY_BLEND) * value
