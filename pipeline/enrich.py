"""Fill gaps in lab data, and say which numbers are estimates.

* Performance: GSMArena benchmarks only exist for reviewed phones. Phones
  without one get the median GeekBench 6 score of other phones with the same
  chipset (from every sheet fetched, including unsold candidates).
* Battery: 'Active use score' hours when tested; otherwise estimated from the
  EU-label endurance figure, or failing that from capacity, using straight
  lines fitted on phones that have both numbers.
"""
from __future__ import annotations

import math
import re
import statistics

BRANDS = {"apple": "Apple", "samsung": "Samsung", "google": "Google", "xiaomi": "Xiaomi", "oppo": "OPPO",
          "vivo": "vivo", "honor": "Honor", "realme": "realme", "oneplus": "OnePlus", "nothing": "Nothing"}


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower().replace("+", " plus")).strip("-")


def canonical(rec: dict) -> dict:
    """Brand/model naming used across the pipeline."""
    first, _, rest = rec["name"].partition(" ")
    brand = BRANDS.get(first.lower(), first)
    return {**rec, "name": f"{brand} {rest}", "brand": brand, "model": rest, "id": slugify(rec["name"]),
            "match_name": rest}


def _chip_key(chip: str | None) -> str | None:
    if not chip:
        return None
    return re.sub(r"\s+", " ", chip.lower()).strip()


_SUFFIXES = re.compile(r"\b(ultra|pro|max|energy|plus|lite|for galaxy|5g|4g|leading version)\b|\+", re.I)


def _chip_parts(key: str) -> tuple[frozenset, list[int]]:
    """'qualcomm snapdragon 7s gen 4' -> ({'qualcomm','snapdragon','s','gen'}, [7, 4])"""
    k = _SUFFIXES.sub(" ", key)
    k = re.sub(r"(?<=\d)(?=[a-z])|(?<=[a-z])(?=\d)", " ", k)
    words = frozenset(t for t in k.split() if not t.isdigit())
    return words, [int(t) for t in k.split() if t.isdigit()]


def _same_tier(a: int, b: int) -> bool:
    if a < 10 or b < 10:          # Snapdragon 7 / Tensor G4 / Apple A19: tier digit must match
        return a == b
    if a >= 1000 and b >= 1000:   # Dimensity 7300 / Exynos 1580 / Unisoc T8300: same thousand, close hundreds
        return a // 1000 == b // 1000 and abs(a - b) <= 200
    return abs(a - b) / max(a, b) <= 0.12  # Helio G99 vs G91


def similar_chip(key: str, known: dict[str, int]) -> str | None:
    """Closest benchmarked chip from the same family and tier: same name
    words, same leading model number, nearest remaining numbers."""
    words, nums = _chip_parts(key)
    best, best_d = None, None
    for other in known:
        w2, n2 = _chip_parts(other)
        if w2 != words or len(n2) != len(nums) or not nums or not _same_tier(nums[0], n2[0]):
            continue
        d = sum(abs(a - b) * 10 ** (len(nums) - i) / max(1, a) for i, (a, b) in enumerate(zip(nums, n2)))
        if best_d is None or d < best_d:
            best, best_d = other, d
    return best


# Rough per-GHz throughput of CPU core designs relative to a Cortex-A55. Only
# the ratios matter: a line fitted on benchmarked phones maps the total to GB6.
CORE_WEIGHT = {
    "a53": 0.8, "a55": 1.0, "a510": 1.1, "a520": 1.15, "a73": 1.6, "a75": 1.9, "a76": 2.3, "a77": 2.6,
    "a78": 2.9, "a710": 3.0, "a715": 3.2, "a720": 3.5, "a725": 3.8, "x1": 3.6, "x2": 4.0, "x3": 4.4,
    "x4": 5.0, "x925": 6.0, "x930": 6.5, "oryon": 6.5, "c1-ultra": 6.5, "c1-premium": 4.5, "c1-pro": 3.8,
    "c1-nano": 1.3,
}


def cpu_proxy(cpu: str | None) -> float | None:
    """'Octa-core (2x1.8 GHz Cortex-A75 & 6x1.6 GHz Cortex-A55)' -> sum(cores * GHz * weight)."""
    if not cpu:
        return None
    total = 0.0
    for n, ghz, core in re.findall(r"(\d+)x([\d.]+)\s*GHz\s+([\w-]+(?:[ -][\w]+)?)", cpu):
        name = core.lower().replace("cortex-", "").replace(" ", "-")
        w = next((v for k, v in CORE_WEIGHT.items() if name.startswith(k)), None)
        if w is None:
            return None
        total += int(n) * float(ghz) * w
    return total or None


def _line(xs: list[float], ys: list[float]) -> tuple[float, float]:
    mx, my = statistics.fmean(xs), statistics.fmean(ys)
    b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
    return my - b * mx, b


def enrich(records: list[dict]) -> tuple[list[dict], dict]:
    by_chip: dict[str, list[int]] = {}
    for r in records:
        if r.get("geekbench6") and _chip_key(r.get("chipset")):
            by_chip.setdefault(_chip_key(r["chipset"]), []).append(r["geekbench6"])
    chip_gb6 = {k: int(statistics.median(v)) for k, v in by_chip.items()}

    both_eu = [(r["eu_endurance_h"], r["active_use_h"]) for r in records
               if r.get("eu_endurance_h") and r.get("active_use_h")]
    both_mah = [(r["battery_mah"], r["active_use_h"]) for r in records
                if r.get("battery_mah") and r.get("active_use_h")]
    both_cpu = [(math.log(cpu_proxy(r.get("cpu"))), math.log(r["geekbench6"])) for r in records
                if r.get("geekbench6") and cpu_proxy(r.get("cpu"))]
    cpu_fit = _line(*zip(*both_cpu)) if len(both_cpu) >= 8 else None
    eu_fit = _line(*zip(*both_eu)) if len(both_eu) >= 8 else None
    mah_fit = _line(*zip(*both_mah)) if len(both_mah) >= 8 else None

    out = []
    for r in records:
        r = canonical(r)
        estimated = []
        if r.get("geekbench6"):
            r["gb6"], r["gb6_source"] = r["geekbench6"], "tested"
        elif chip_gb6.get(_chip_key(r.get("chipset"))):
            r["gb6"], r["gb6_source"] = chip_gb6[_chip_key(r["chipset"])], "same chipset"
            estimated.append("performance")
        elif _chip_key(r.get("chipset")) and similar_chip(_chip_key(r["chipset"]), chip_gb6):
            near = similar_chip(_chip_key(r["chipset"]), chip_gb6)
            r["gb6"], r["gb6_source"] = chip_gb6[near], f"similar chipset ({near.title()})"
            estimated.append("performance")
        elif cpu_fit and cpu_proxy(r.get("cpu")):
            r["gb6"] = int(math.exp(cpu_fit[0] + cpu_fit[1] * math.log(cpu_proxy(r["cpu"]))))
            r["gb6_source"] = "estimated from CPU cores"
            estimated.append("performance")
        else:
            r["gb6"], r["gb6_source"] = None, "unknown"
            estimated.append("performance")

        if r.get("active_use_h"):
            r["battery_h"], r["battery_source"] = r["active_use_h"], "tested"
        elif r.get("eu_endurance_h") and eu_fit:
            r["battery_h"] = round(eu_fit[0] + eu_fit[1] * r["eu_endurance_h"], 2)
            r["battery_source"] = "EU label estimate"
            estimated.append("battery")
        elif r.get("battery_mah") and mah_fit:
            r["battery_h"] = round(mah_fit[0] + mah_fit[1] * r["battery_mah"], 2)
            r["battery_source"] = "capacity estimate"
            estimated.append("battery")
        else:
            r["battery_h"], r["battery_source"] = None, "unknown"
            estimated.append("battery")
        r["estimated"] = estimated
        out.append(r)

    stats = {"chips_with_benchmarks": len(chip_gb6), "eu_fit": eu_fit, "mah_fit": mah_fit,
             "eu_fit_n": len(both_eu), "mah_fit_n": len(both_mah)}
    return out, stats
