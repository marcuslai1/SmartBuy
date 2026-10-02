"""Step 4: score everything and write the site's data file.

    python -m pipeline.build      # -> smartbuy-frontend/public/phones.json

Only phones with a current official-store price are ranked. Each phone is
scored on the exact storage variant its headline price buys, at its *typical*
price (median of the cheapest offer per crawl over the last 90 days) so one
day's flash sale doesn't reorder the ranking. Foldables are left out (they're
priced for the form factor, not the specs); their benchmarks still feed the
per-chipset tables.

Each ranked phone also gets a likely rank range: the ranking is recomputed many
times with the category weights, prices and every estimated input nudged by
their plausible error, and the middle 90% of the ranks it lands at is kept.
"""
from __future__ import annotations

import datetime as dt
import json
import random
import statistics
from collections import defaultdict
from pathlib import Path

from . import config as C
from . import labs, scoring, value
from .enrich import enrich
from .prices import LEGACY_DATE, load_rows

ROOT = Path(__file__).resolve().parents[1]
SPECS = ROOT / "data" / "specs_raw.json"
OUT = ROOT / "smartbuy-frontend" / "public" / "phones.json"
CURRENT_WINDOW_DAYS = 14  # offers seen within this many days of the latest crawl count as current


def tier_for(price: float) -> str:
    for name, lo, hi in C.TIERS:
        if lo < price <= hi or (lo == 0 and price <= hi):
            return name
    return C.TIERS[-1][0]


def _offer(row: dict) -> dict:
    return {
        "sgd": row["price_sgd"], "list_sgd": row["list_price_sgd"], "storage_gb": row["storage_gb"],
        "ram_gb": row["ram_gb"], "store": row["store"], "seller": row["seller"], "url": row["url"],
        "date": row["date"], "variant_basis": row.get("variant_basis") or "assumed base",
    }


def current_offers(rows: list[dict]) -> tuple[str, dict[str, list[dict]]]:
    dates = sorted({r["date"] for r in rows if r["date"] != LEGACY_DATE})
    if not dates:
        return LEGACY_DATE, {}
    latest = dates[-1]
    cutoff = (dt.date.fromisoformat(latest) - dt.timedelta(days=CURRENT_WINDOW_DAYS)).isoformat()
    newest: dict[tuple, dict] = {}
    for r in rows:
        if r["date"] == LEGACY_DATE or r["date"] < cutoff:
            continue
        key = (r["phone_id"], r["store"], r["url"], r["storage_gb"])
        if key not in newest or r["date"] > newest[key]["date"]:
            newest[key] = r
    offers: dict[str, list[dict]] = defaultdict(list)
    for r in newest.values():
        offers[r["phone_id"]].append(_offer(r))
    for lst in offers.values():
        lst.sort(key=lambda o: o["sgd"])
    return latest, offers


def history(rows: list[dict]) -> dict[str, list[dict]]:
    """Cheapest observed price per phone per crawl date."""
    best: dict[tuple, dict] = {}
    for r in rows:
        k = (r["phone_id"], r["date"])
        if k not in best or r["price_sgd"] < best[k]["price_sgd"]:
            best[k] = r
    out: dict[str, list[dict]] = defaultdict(list)
    for (pid, date), r in sorted(best.items(), key=lambda kv: kv[0][1]):
        out[pid].append({"date": date, "sgd": r["price_sgd"], "list_sgd": r["list_price_sgd"],
                         "storage_gb": r["storage_gb"], "ram_gb": r["ram_gb"], "store": r["store"]})
    return out


def typical_price(rows: list[dict], storage_gb: int | None, latest: str, current: float) -> tuple[float, int]:
    """Median over crawls in the last TYPICAL_WINDOW_DAYS of the cheapest offer for
    this storage size, and how many crawls that is."""
    cutoff = (dt.date.fromisoformat(latest) - dt.timedelta(days=C.TYPICAL_WINDOW_DAYS)).isoformat()
    per_date: dict[str, float] = {}
    for r in rows:
        if r["date"] != LEGACY_DATE and r["date"] >= cutoff and r["storage_gb"] == storage_gb:
            per_date[r["date"]] = min(per_date.get(r["date"], r["price_sgd"]), r["price_sgd"])
    if not per_date:
        return current, 1
    return round(statistics.median(per_date.values()), 2), len(per_date)


def rank_ranges(phones: list[dict], preset: str, seed: int) -> list[tuple[int, int]]:
    """5th-95th percentile SmartBuy rank of each phone when the weights, prices and
    estimated inputs are nudged by their plausible error (see config)."""
    rng = random.Random(seed)
    base = C.PRESETS[preset]["weights"]
    ranks: list[list[int]] = [[] for _ in phones]
    for _ in range(C.UNCERTAINTY_DRAWS):
        w = {k: v * rng.uniform(1 - C.WEIGHT_WOBBLE, 1 + C.WEIGHT_WOBBLE) for k, v in base.items()}
        total = sum(w.values())
        prices = [ph["_price"] * rng.uniform(1 - C.PRICE_WOBBLE, 1 + C.PRICE_WOBBLE) for ph in phones]
        specs = []
        for ph in phones:
            cats = dict(ph["_cats"])
            for k in ph["estimated"]:
                cats[k] = min(10.0, max(0.0, cats[k] + rng.gauss(0, C.ESTIMATE_NOISE.get(k, 0.5))))
            specs.append(sum(cats[k] * w[k] for k in w) / total)
        model = value.fit(prices, specs)
        sb = [value.smartbuy(s, value.value_score(model, pr, s)) for s, pr in zip(specs, prices)]
        for r, i in enumerate(sorted(range(len(phones)), key=lambda i: -sb[i]), 1):
            ranks[i].append(r)
    n = C.UNCERTAINTY_DRAWS
    return [(sorted(r)[int(0.05 * n)], sorted(r)[int(0.95 * n) - 1]) for r in ranks]


def summary(p: dict, variant: dict) -> dict:
    lenses = p.get("lenses") or []
    main = next((l for l in lenses if l["role"] == "wide"), lenses[0] if lenses else {})
    teles = [l for l in lenses if "telephoto" in l["role"] and l.get("zoom")]
    return {
        "chipset": p.get("chipset"),
        "gb6": p.get("gb6"), "gb6_source": p.get("gb6_source"),
        "gpu": p.get("gpu"), "gpu_source": p.get("gpu_source"),
        "display_in": p.get("display_in"), "oled": p.get("is_oled"), "ltpo": p.get("is_ltpo"),
        "refresh_hz": p.get("refresh_hz"), "nits": p.get("measured_nits") or p.get("peak_nits"),
        "nits_measured": bool(p.get("measured_nits")),
        "main_mp": main.get("mp"), "main_sensor_in": main.get("sensor_in"), "main_ois": main.get("ois"),
        "tele_zoom": max((l["zoom"] for l in teles), default=None),
        "ultrawide": any(l["role"] == "ultrawide" for l in lenses),
        "selfie_mp": p.get("selfie_mp"),
        "battery_mah": p.get("battery_mah"), "battery_h": p.get("battery_h"),
        "battery_source": p.get("battery_source"),
        "wired_w": p.get("wired_w"), "wired_w_est": None if p.get("wired_w") else round(scoring.charging_watts(p)),
        "wireless_w": p.get("wireless_w"),
        "ip_rating": p.get("ip_rating"), "glass": (p.get("glass") or "").split(" | ")[0] or None,
        "frame": p.get("frame"), "os": p.get("os"), "os_updates": scoring.os_updates(p),
        "os_updates_stated": bool(p.get("os_updates")), "os_source": p.get("os_source"),
        "os_years_left": None if p.get("os_years_left") is None else round(p["os_years_left"], 1),
        "main_sensor_est": p.get("main_sensor_est"),
        "battery_cycles": p.get("battery_cycles"), "pwm_hz": p.get("pwm_hz"),
        "secure_unlock": p.get("secure_unlock"),
        "camera_hw": round(scoring.camera_hardware(p), 2),
        "dxomark": (p.get("camera_lab") or {}).get("dxomark"),
        "dxomark_protocol": (p.get("camera_lab") or {}).get("protocol"),
        "dxomark_url": (p.get("camera_lab") or {}).get("url"),
        "dxomark_from": (p.get("camera_lab") or {}).get("from"),
        "gpu_stability": None if p.get("gpu_stability") is None else round(p["gpu_stability"], 3),
        "stability_source": p.get("stability_source"),
        "stress_url": (p.get("stress") or {}).get("url"),
        "max_temp_c": (p.get("stress") or {}).get("max_temp_c"),
        "storage_type": scoring.storage_type(p, variant), "storage_type_est": not p.get("storage_types"),
        "weight_g": p.get("weight_g"), "thickness_mm": p.get("thickness_mm"),
        "has_5g": p.get("has_5g"), "nfc": p.get("nfc"), "stereo": p.get("stereo"), "jack": p.get("jack"),
        "esim": p.get("esim"), "card_slot": p.get("card_slot"), "uwb": p.get("uwb"), "ir": p.get("ir"),
        "has_hdr": p.get("has_hdr"), "video_4k60": p.get("video_4k60"), "video_8k": p.get("video_8k"),
        "eu_free_fall": p.get("eu_free_fall"),
    }


def short_name(p: dict) -> str:
    """'Galaxy S26 Ultra' / 'Redmi Note 15 Pro', but 'vivo X300 FE' and 'Honor 500'."""
    if p["model"].split(" ")[0] in ("Galaxy", "iPhone", "Pixel", "Redmi", "Poco"):
        return p["model"]
    return f"{p['brand']} {p['model']}"


def _bench_reason(test: str, source: str | None) -> str | None:
    if source == "tested":
        return None
    if source in (None, "unknown"):
        return f"No {test} result for this chip yet"
    if source.startswith("estimated"):
        return f"{test} {source}"
    return f"{test} result taken from {source}"


def _sensor_label(inches: float) -> str:
    return f'{inches:.1f}"' if inches >= 0.95 else f'1/{1 / inches:.2f}"'


def lab_notes(p: dict) -> dict[str, str]:
    """Lab results behind a score that aren't estimates (shown under the category)."""
    notes = {}
    lab = p.get("camera_lab") or {}
    if lab and not lab.get("from"):
        notes["camera"] = (f"DXOMARK camera score {lab['dxomark']} (protocol v{lab['protocol']}), "
                           f"blended half-and-half with the hardware score")
    if p.get("stability_source") == "tested":
        notes["performance"] = (f"Keeps {p['gpu_stability']:.0%} of its peak graphics in Notebookcheck's "
                                f"{p['stress']['test']}")
    elif p.get("stability_source") == "overheated":
        notes["performance"] = (f"{p['stress']['note'] or 'Overheated in the stress test'}; scored at the lowest "
                                f"stability seen ({p['gpu_stability']:.0%})")
    return notes


def estimated_reasons(p: dict, variant: dict) -> dict[str, str]:
    reasons = {}
    est = p["estimated"]
    if "camera" in est:
        parts = []
        main = next((l for l in p.get("lenses") or [] if l["role"] == "wide"), None)
        if main and p.get("main_sensor_est"):
            parts.append(f"Main sensor size not published; assumed {_sensor_label(main['sensor_in'])}, typical "
                         f"for a {main['mp']:g} MP main camera on phones with similar performance")
        elif main and not main.get("sensor_in"):
            parts.append("Main sensor size not published; the smallest size class assumed")
        lab = p.get("camera_lab") or {}
        if lab.get("from"):
            parts.append(f"Not tested by DXOMARK; processing adjusted from its test of the {lab['from']} "
                         f"({lab['why']}{', half weight' if lab['share'] < 1 else ''})")
        reasons["camera"] = "; ".join(parts)
    if "display" in est:
        reasons["display"] = ("Brightness not lab-measured; 60% of the claimed peak used" if p.get("peak_nits")
                              else "Brightness not published")
    if "build" in est:
        missing = [label for key, label in (("glass", "glass type"), ("frame", "frame material"),
                                            ("eu_free_fall", "EU drop-test class"),
                                            ("battery_cycles", "battery charge cycles")) if not p.get(key)]
        reasons["build"] = f"Not published: {', '.join(missing)}; typical values assumed"
    if "memory" in est:
        kind = p.get("storage_type_est")
        reasons["memory"] = (f"Storage type not published; {kind} assumed, the most common on phones with "
                             f"{'the same chipset' if p.get('storage_type_source') == 'same chipset' else 'similar performance'}"
                             if kind else "Storage type not published; budget-class speed assumed")
    if "software" in est:
        n = scoring.os_updates(p)
        src = p.get("os_source") or ""
        reasons["software"] = (f"No update promise stated; {n} years assumed, as promised for the "
                               f"{src[len('same series ('):-1]}" if src.startswith("same series")
                               else f"No update promise stated; {n} years assumed (typical for {p['brand']})")
    if "performance" in est:
        stress = None
        like = {"same chipset": "phones with the same chipset",
                "same brand": f"{p['brand']} phones with similar graphics performance",
                "similar performance": "phones with similar graphics performance"}.get(p.get("stability_source"))
        if like and (p.get("gpu_stability") or 1) < C.STABILITY_FLAG_BELOW:
            stress = f"Not stress-tested; assumed to keep {p['gpu_stability']:.0%} of peak graphics like {like}"
        reasons["performance"] = "; ".join(filter(None, (_bench_reason("GeekBench", p.get("gb6_source")),
                                                         _bench_reason("3DMark", p.get("gpu_source")), stress)))
    if "battery" in p["estimated"]:
        reasons["battery"] = ("Battery life not tested yet" if p.get("battery_source") == "unknown"
                              else f"Battery life not lab-tested: {p['battery_source']}")
    return reasons


def _base_variant(p: dict) -> dict:
    vs = sorted(p.get("variants") or [], key=lambda v: (v["storage_gb"], v["ram_gb"]))
    return vs[0] if vs else {"storage_gb": None, "ram_gb": None}


def saturated(phones: list[dict]) -> dict[str, list[str]]:
    """Categories where at least SATURATION_WARN ranked phones score a full 10."""
    out = {}
    for key, _ in C.CATEGORIES:
        tens = [ph["short_name"] for ph in phones if ph["categories"][key] >= 9.995]
        if len(tens) >= C.SATURATION_WARN:
            out[key] = tens
    return out


def crawl_status(date: str) -> dict:
    """Which brands the latest crawl fully covered (data/crawl_status.json)."""
    path = ROOT / "data" / "crawl_status.json"
    status = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    return status.get(date) or {"complete_brands": sorted(set(C.OS_UPDATES_DEFAULT)), "note": ""}


def build() -> dict:
    records, stats = enrich(json.loads(SPECS.read_text(encoding="utf-8")))
    # Foldables and tablets (a 9"+ screen) aren't compared with phones
    records = [r for r in records if not r.get("is_foldable") and (r.get("display_in") or 0) < 9]
    lab_info = labs.apply(records)
    by_id = {r["id"]: r for r in records}
    rows = load_rows()
    latest, offers = current_offers(rows)
    hist = history(rows)
    for r in records:
        r["os_years_left"] = scoring.os_years_left(r, latest)

    phones = []
    for pid, offs in offers.items():
        p = by_id.get(pid)
        if not p:
            continue
        head = offs[0]
        variant = {"storage_gb": head["storage_gb"], "ram_gb": head["ram_gb"]}
        typical, n_crawls = typical_price([r for r in rows if r["phone_id"] == pid], head["storage_gb"],
                                          latest, head["sgd"])
        head = {**head, "typical_sgd": typical, "typical_crawls": n_crawls}
        cats = scoring.category_scores(p, variant)
        phones.append({
            "id": pid, "name": p["name"], "brand": p["brand"], "model": p["model"],
            "short_name": short_name(p),
            "announced": p.get("announced"), "released": p.get("released"), "gsm_url": p["gsm_url"],
            "variant": variant, "price": head, "offers": offs, "history": hist.get(pid, []),
            "tier": tier_for(head["sgd"]),
            "categories": {k: round(v, 2) for k, v in cats.items()},
            "estimated": p["estimated"],
            "estimated_reasons": estimated_reasons(p, variant),
            "notes": lab_notes(p),
            "specs": summary(p, variant),
            "_cats": cats, "_price": typical,
        })

    models = {}
    for seed, preset in enumerate(C.PRESETS):
        specs_ = [scoring.spec_score(ph["_cats"], preset) for ph in phones]
        model = value.fit([ph["_price"] for ph in phones], specs_)
        models[preset] = {k: round(v, 4) if isinstance(v, float) else v for k, v in model.items()}
        for ph, s in zip(phones, specs_):
            v = value.value_score(model, ph["_price"], s)
            ph.setdefault("scores", {})[preset] = {
                "spec": round(s, 2), "value": round(v, 2), "smartbuy": round(value.smartbuy(s, v), 2),
                "expected": round(value.expected(model, ph["_price"]), 2),
            }
        order = sorted(phones, key=lambda ph: -ph["scores"][preset]["smartbuy"])
        for r, ph in enumerate(order, 1):
            ph["scores"][preset]["rank"] = r
        for ph, (lo, hi) in zip(phones, rank_ranges(phones, preset, seed)):
            ph["scores"][preset]["rank_range"] = [min(lo, ph["scores"][preset]["rank"]),
                                                  max(hi, ph["scores"][preset]["rank"])]
    for ph in phones:
        del ph["_cats"], ph["_price"]
    phones.sort(key=lambda ph: -ph["scores"]["balanced"]["smartbuy"])

    # Unpriced phones. Brands whose crawl finished: 2025 phones with no listing are
    # retired. Brands whose crawl was cut short: recent phones (and 2025 ones) are
    # shown as awaiting prices, with spec scores only.
    status = crawl_status(latest)
    complete = set(status["complete_brands"])
    current_ids = {ph["id"] for ph in phones}
    recent = (dt.date.fromisoformat(latest) - dt.timedelta(days=365)).isoformat()
    retired, awaiting = [], []
    for p in records:
        if p["id"] in current_ids:
            continue
        h = hist.get(p["id"], [])
        legacy = any(x["date"] == LEGACY_DATE for x in h)
        if p["brand"] in complete:
            if legacy:
                retired.append({"id": p["id"], "name": p["name"], "brand": p["brand"],
                                "short_name": short_name(p), "last_price": h[-1], "gsm_url": p["gsm_url"]})
        elif legacy or (p.get("announced") or "") >= recent:
            variant = _base_variant(p)
            cats = scoring.category_scores(p, variant)
            awaiting.append({
                "id": p["id"], "name": p["name"], "brand": p["brand"], "model": p["model"],
                "short_name": short_name(p), "announced": p.get("announced"), "gsm_url": p["gsm_url"],
                "variant": variant, "last_price": h[-1] if h else None,
                "categories": {k: round(v, 2) for k, v in cats.items()},
                "estimated": p["estimated"], "estimated_reasons": estimated_reasons(p, variant),
                "notes": lab_notes(p),
                "scores": {pr: {"spec": round(scoring.spec_score(cats, pr), 2)} for pr in C.PRESETS},
                "specs": summary(p, variant),
            })
    awaiting.sort(key=lambda a: -a["scores"]["balanced"]["spec"])

    return {
        "generated_at": dt.date.today().isoformat(),
        "price_date": latest,
        "legacy_price_date": LEGACY_DATE,
        "categories": [{"key": k, "label": label} for k, label in C.CATEGORIES],
        "presets": {k: {"label": v["label"], "blurb": v["blurb"], "weights": v["weights"]}
                    for k, v in C.PRESETS.items()},
        "tiers": [{"key": k, "min": lo, "max": hi if hi < 10**8 else None} for k, lo, hi in C.TIERS],
        "value_models": models,
        "labs": lab_info,
        "enrichment": {"chips_with_benchmarks": stats["chips_with_benchmarks"],
                       "chips_with_gpu_benchmarks": stats["chips_with_gpu_benchmarks"]},
        "crawl": {"complete_brands": sorted(complete),
                  "incomplete_brands": sorted({p["brand"] for p in records} - complete),
                  "note": status.get("note", "")},
        "phones": phones,
        "awaiting": awaiting,
        "retired": sorted(retired, key=lambda r: r["name"]),
    }


def write() -> dict:
    """Build, write phones.json and the awaiting-prices to-do list, print a summary."""
    data = build()
    OUT.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")
    m = data["value_models"]["balanced"]
    # The to-do list for the next price crawl
    (ROOT / "data" / "awaiting_prices.json").write_text(json.dumps({
        "price_date": data["price_date"], **data["crawl"],
        "phones": [{"id": a["id"], "name": a["name"], "announced": a["announced"],
                    "last_price": a["last_price"]} for a in data["awaiting"]],
    }, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"{len(data['phones'])} phones ranked, {len(data['awaiting'])} awaiting prices, "
          f"{len(data['retired'])} retired; prices as of {data['price_date']}")
    print(f"balanced value curve: expected = {m['a']:.2f} + {m['b']:.2f}*x + {m['c']:.3f}*x^2 (x = ln price), "
          f"sd {m['sd']:.2f}, R^2 {m['r2']:.2f}")
    for key, names in saturated(data["phones"]).items():
        print(f"WARNING: {len(names)} phones score 10 for {key} ({', '.join(names)}); "
              f"raise its top anchor in config.py so 10 stays 'best on sale'")
    print(f"-> {OUT}")
    return data


if __name__ == "__main__":
    write()
