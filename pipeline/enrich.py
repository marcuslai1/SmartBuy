"""Fill gaps in lab data, and say which numbers are estimates.

* Performance: GSMArena benchmarks only exist for reviewed phones. Phones
  without one get the median GeekBench 6 / 3DMark Wild Life Extreme score of
  other phones with the same chipset (from every sheet fetched, including
  unsold candidates). A missing 3DMark result can also be estimated from the
  phone's GeekBench score: the median of the phones with the nearest scores.
* Battery: 'Active use score' hours when tested; otherwise estimated from the
  EU-label endurance figure, or failing that from capacity, using straight
  lines fitted on phones that have both numbers.
* Lab results that disagree wildly with every other phone on the same chip
  (a mis-entered or throttled run) are replaced by that chip's median.
* OS update policy: when a sheet doesn't state one, it's borrowed from the
  closest phone in the same series that does (Redmi Note 17 <- Redmi Note 15),
  else the brand's typical policy.
* Main camera sensor size: when unpublished, the median size of same-megapixel
  main cameras on the phones with the nearest GeekBench scores (published sizes
  skew to flagships, so a plain same-MP median would flatter budget phones).
* Storage type (UFS/eMMC): when unpublished, the most common type on phones with
  the same chipset, else on the phones with the nearest GeekBench scores.

Every category that rests on a guess is listed in record["estimated"].
"""
from __future__ import annotations

import datetime as dt
import math
import re
import statistics

from . import config as C

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


def _nearest_median(x: float, pairs: list[tuple[float, float]], k: int = 7) -> float:
    """Median y of the k pairs with the closest x. Unlike a fitted line it
    follows curvature and shrugs off the odd mis-entered benchmark."""
    near = sorted(pairs, key=lambda p: abs(p[0] - x))[:k]
    return statistics.median(y for _, y in near)


def _gpu_key(r: dict) -> str | None:
    """Chip plus GPU configuration: binned chips share a name but not a GPU
    ('Apple A18' with 4 vs 5 graphics cores in the iPhone 16e vs iPhone 16)."""
    chip = _chip_key(r.get("chipset"))
    gpu = re.sub(r"\s+", " ", (r.get("gpu_name") or "").lower()).strip()
    return f"{chip}|{gpu}" if chip and gpu else chip


def _chip_values(records: list[dict], field: str, key=lambda r: _chip_key(r.get("chipset"))) -> dict[str, list[int]]:
    by_chip: dict[str, list[int]] = {}
    for r in records:
        if r.get(field) and key(r):
            by_chip.setdefault(key(r), []).append(r[field])
    return by_chip


def _chip_medians(records: list[dict], field: str, key=lambda r: _chip_key(r.get("chipset"))) -> dict[str, int]:
    return {k: int(statistics.median(v)) for k, v in _chip_values(records, field, key).items()}


def _lab_result(r: dict, field: str, by_chip: dict[str, list[int]], key: str | None = None) -> tuple[int, str] | None:
    """The phone's own lab result, unless at least two other phones share its chip
    (and, for GPU results, its GPU configuration) and it's more than LAB_OUTLIER
    away from their median."""
    v = r.get(field)
    if not v:
        return None
    others = list(by_chip.get(key or _chip_key(r.get("chipset")), []))
    if v in others:
        others.remove(v)
    if len(others) >= 2:
        med = statistics.median(others)
        if abs(v / med - 1) > C.LAB_OUTLIER:
            return int(med), f"same chipset (its own result, {v:,}, looked wrong)"
    return v, "tested"


def series(model: str) -> tuple[str, str]:
    """(family, line): 'Poco F8 Ultra' -> ('Poco F', 'Poco F|ultra'), '17T Pro' -> ('', '|t pro')."""
    m = re.match(r"(\D*?)\s*\d+([A-Za-z]*)\s*(.*)", model)
    if not m:
        return model, model
    fam = m.group(1).strip()
    return fam, f"{fam}|" + " ".join(filter(None, (m.group(2).lower(), m.group(3).strip().lower())))


def _days(date: str | None) -> int:
    try:
        return dt.date.fromisoformat(date).toordinal()
    except (TypeError, ValueError):
        return 0


def _os_policy(r: dict, stated: list[dict]) -> tuple[int, str] | None:
    """Update policy of the closest same-series phone that states one (same line first, then family)."""
    fam, line = series(r["model"])
    siblings = [s for s in stated if s["brand"] == r["brand"] and s["id"] != r["id"]]
    for i, key in ((1, line), (0, fam)):
        same = [s for s in siblings if series(s["model"])[i] == key]
        if same:
            best = min(same, key=lambda s: (abs(_days(s.get("announced")) - _days(r.get("announced"))),
                                            -s["os_updates"]))
            return best["os_updates"], f"same series ({best['name']})"
    return None


def _main_lens(r: dict) -> dict | None:
    return next((l for l in r.get("lenses") or [] if l["role"] == "wide"), None)


def _storage_kind(r: dict) -> str | None:
    types = r.get("storage_types") or {}
    return types.get("default") or next(iter(types.values()), None)


def _fill_hardware_gaps(out: list[dict]) -> None:
    """Second pass, once every phone has a GeekBench figure: estimate unpublished
    main-sensor sizes and storage types from comparable phones."""
    sensors = [(round(_main_lens(r)["mp"]), math.log(r["gb6"]), _main_lens(r)["sensor_in"]) for r in out
               if r.get("gb6") and _main_lens(r) and _main_lens(r).get("sensor_in")]
    storage = [(_chip_key(r.get("chipset")), math.log(r["gb6"]), _storage_kind(r)) for r in out
               if r.get("gb6") and _storage_kind(r)]
    for r in out:
        main = _main_lens(r)
        r["main_sensor_est"] = False
        if main and not main.get("sensor_in"):
            pairs = [(x, size) for mp, x, size in sensors if mp == round(main.get("mp") or 0)]
            if r.get("gb6") and len(pairs) >= 3:
                size = round(_nearest_median(math.log(r["gb6"]), pairs), 3)
                r["lenses"] = [{**l, "sensor_in": size} if l is main else l for l in r["lenses"]]
                r["main_sensor_est"] = True
            r["estimated"].append("camera")

        if not r.get("storage_types"):
            chip = _chip_key(r.get("chipset"))
            same = [kind for c, _, kind in storage if chip and c == chip]
            if same:
                r["storage_type_est"], r["storage_type_source"] = statistics.mode(same), "same chipset"
            elif r.get("gb6") and storage:
                near = sorted(storage, key=lambda t: abs(t[1] - math.log(r["gb6"])))[:7]
                r["storage_type_est"] = statistics.mode(kind for _, _, kind in near)
                r["storage_type_source"] = "similar performance"
            r["estimated"].append("memory")

        order = [k for k, _ in C.CATEGORIES]
        r["estimated"] = sorted(set(r["estimated"]), key=order.index)


def _from_chip(key: str | None, table: dict[str, int]) -> tuple[int, str] | None:
    """(score, source) from the same chipset, else the closest similar one."""
    if key and table.get(key):
        return table[key], "same chipset"
    near = similar_chip(key, table) if key else None
    return (table[near], f"similar chipset ({near.title()})") if near else None


def enrich(records: list[dict]) -> tuple[list[dict], dict]:
    gb6_by_chip = _chip_values(records, "geekbench6")
    gpu_by_chip = _chip_values(records, "wildlife_extreme", _gpu_key)
    gpu_by_config = _chip_medians(records, "wildlife_extreme", _gpu_key)
    chip_gb6 = _chip_medians(records, "geekbench6")
    chip_gpu = _chip_medians(records, "wildlife_extreme")
    canon = [canonical(r) for r in records]
    stated_os = [r for r in canon if r.get("os_updates")]

    both_eu = [(r["eu_endurance_h"], r["active_use_h"]) for r in records
               if r.get("eu_endurance_h") and r.get("active_use_h")]
    both_mah = [(r["battery_mah"], r["active_use_h"]) for r in records
                if r.get("battery_mah") and r.get("active_use_h")]
    both_cpu = [(math.log(cpu_proxy(r.get("cpu"))), math.log(r["geekbench6"])) for r in records
                if r.get("geekbench6") and cpu_proxy(r.get("cpu"))]
    both_gpu = [(math.log(r["geekbench6"]), r["wildlife_extreme"]) for r in records
                if r.get("geekbench6") and r.get("wildlife_extreme")]
    cpu_fit = _line(*zip(*both_cpu)) if len(both_cpu) >= 8 else None
    eu_fit = _line(*zip(*both_eu)) if len(both_eu) >= 8 else None
    mah_fit = _line(*zip(*both_mah)) if len(both_mah) >= 8 else None

    out = []
    for r in canon:
        estimated = []
        chip = _chip_key(r.get("chipset"))
        if _lab_result(r, "geekbench6", gb6_by_chip):
            r["gb6"], r["gb6_source"] = _lab_result(r, "geekbench6", gb6_by_chip)
        elif _from_chip(chip, chip_gb6):
            r["gb6"], r["gb6_source"] = _from_chip(chip, chip_gb6)
        elif cpu_fit and cpu_proxy(r.get("cpu")):
            r["gb6"] = int(math.exp(cpu_fit[0] + cpu_fit[1] * math.log(cpu_proxy(r["cpu"]))))
            r["gb6_source"] = "estimated from CPU cores"
        else:
            r["gb6"], r["gb6_source"] = None, "unknown"

        if _lab_result(r, "wildlife_extreme", gpu_by_chip, _gpu_key(r)):
            r["gpu"], r["gpu_source"] = _lab_result(r, "wildlife_extreme", gpu_by_chip, _gpu_key(r))
        elif chip and gpu_by_config.get(_gpu_key(r)):
            r["gpu"], r["gpu_source"] = gpu_by_config[_gpu_key(r)], "same chipset"
        elif _from_chip(chip, chip_gpu):
            r["gpu"], r["gpu_source"] = _from_chip(chip, chip_gpu)
        elif len(both_gpu) >= 8 and r["gb6"]:
            r["gpu"] = int(_nearest_median(math.log(r["gb6"]), both_gpu))
            r["gpu_source"] = "estimated from GeekBench"
        else:
            r["gpu"], r["gpu_source"] = None, "unknown"
        if r["gb6_source"] != "tested" or r["gpu_source"] != "tested":
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

        if r.get("os_updates"):
            r["os_years"], r["os_source"] = r["os_updates"], "stated"
        elif _os_policy(r, stated_os):
            r["os_years"], r["os_source"] = _os_policy(r, stated_os)
            estimated.append("software")
        else:
            r["os_years"], r["os_source"] = C.OS_UPDATES_DEFAULT.get(r["brand"], 3), "brand default"
            estimated.append("software")

        if not r.get("measured_nits"):
            estimated.append("display")
        if not (r.get("glass") and r.get("frame") and r.get("eu_free_fall") and r.get("battery_cycles")):
            estimated.append("build")
        r["estimated"] = estimated
        out.append(r)
    _fill_hardware_gaps(out)

    stats = {"chips_with_benchmarks": len(chip_gb6), "chips_with_gpu_benchmarks": len(chip_gpu),
             "gpu_gb6_pairs": len(both_gpu), "eu_fit": eu_fit, "mah_fit": mah_fit,
             "eu_fit_n": len(both_eu), "mah_fit_n": len(both_mah)}
    return out, stats
