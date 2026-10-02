"""External lab results layered on top of the spec-sheet scores.

* DXOMARK camera scores measure the photos and video a phone actually
  produces, so they capture image processing that sensor sizes can't.
      python -m pipeline.labs     # refresh data/dxomark_scores.json
  The scores come from the public file dxomark.com itself loads.
* Notebookcheck stress tests: how much of its peak graphics performance a
  phone keeps under sustained load (3DMark Wild Life Extreme Stress Test
  stability). Kept by hand in data/notebookcheck_stress.csv, one row per
  reviewed phone with its review link; Notebookcheck blocks automated clients,
  so new rows are added as reviews come out.

Camera: a DXOMARK score is put on our 0-10 camera scale with a straight line
fitted (per DXOMARK protocol version, since v5 and v6 scores aren't
comparable) on every phone that has both. The gap between that and our
hardware-only score is mostly processing. A tested phone's camera score moves
CAMERA_LAB_WEIGHT of the way towards it. Untested phones only borrow a gap
from a close relative, never a brand average, because processing differs
between lines (Redmi Note sits well below numbered Xiaomi phones):
  * a camera twin (same brand, main sensor and lens line-up) on the same chip
    gets the full adjustment;
  * a camera twin in the same line on a different chip gets CAMERA_SHARE of it;
  * for brands with one processing pipeline across their range (Apple,
    Google), a same-chip sibling with different cameras also passes on
    CAMERA_SHARE of its adjustment (iPhone 17e <- iPhone 17).
"""
from __future__ import annotations

import csv
import datetime as dt
import json
import math
import re
import statistics
from pathlib import Path

from . import config as C
from . import scoring
from .enrich import _chip_key, _days, _line, _nearest_median, series

ROOT = Path(__file__).resolve().parents[1]
DXO_URL = "https://www.dxomark.com/dakdata/api/full-smartphones-scores.json"
DXO_FILE = ROOT / "data" / "dxomark_scores.json"
NBC_FILE = ROOT / "data" / "notebookcheck_stress.csv"


# ------------------------------------------------------------------ DXOMARK

def fetch_dxomark() -> dict:
    import requests

    resp = requests.get(DXO_URL, timeout=60,
                        headers={"User-Agent": "SmartBuy data refresh (github.com/marcuslai1/SmartBuy)"})
    resp.raise_for_status()
    phones = []
    for it in resp.json()["smartphones"]:
        cam = it.get("camera") or {}
        if not cam.get("score") or it.get("foldable"):
            continue
        phones.append({"brand": it["brand"], "model": it["model"], "name": it["name"],
                       "url": f"https://www.dxomark.com{it['link']}" if it.get("link") else None,
                       "camera": cam["score"], "protocol": str(cam.get("protocol_version") or ""),
                       "updated": (cam.get("updatedAt") or it.get("updatedAt") or "")[:10]})
    return {"source": DXO_URL, "fetched": dt.date.today().isoformat(), "phones": phones}


def dxo_key(brand: str, model: str) -> str:
    """'POCO' 'F6 Pro' and 'Xiaomi' 'Poco F6 Pro 5G' -> 'xiaomi|pocof6pro'."""
    b = brand.lower()
    if b in ("poco", "redmi"):
        model, b = f"{brand} {model}", "xiaomi"
    m = re.sub(r"\b5g\b", "", model.lower()).replace("+", "plus")
    return f"{b}|{re.sub(r'[^a-z0-9]', '', m)}"


def _camera_sig(r: dict) -> tuple:
    lenses = r.get("lenses") or []
    main = next((l for l in lenses if l["role"] == "wide"), {})
    teles = tuple(sorted(round(l.get("zoom") or 0, 1) for l in lenses if "telephoto" in l["role"]))
    return main.get("sensor_in"), main.get("mp"), any(l["role"] == "ultrawide" for l in lenses), teles


def camera_twins(a: dict, b: dict) -> bool:
    """Same brand, same main sensor (size within TWIN_SENSOR_TOL, same MP) and lens line-up."""
    sa, sb = _camera_sig(a), _camera_sig(b)
    return (a["brand"] == b["brand"] and bool(sa[0]) and bool(sb[0])
            and abs(sa[0] / sb[0] - 1) <= C.TWIN_SENSOR_TOL and sa[1:] == sb[1:])


def apply_camera_labs(records: list[dict], dxo: dict | None) -> dict:
    """Sets camera_adj / camera_lab on records; returns the fitted scale per protocol."""
    if not dxo:
        return {}
    scores = {dxo_key(p["brand"], p["model"]): p for p in dxo["phones"]}
    hw = {r["id"]: scoring.camera_hardware(r) for r in records}
    tested = {r["id"]: scores[dxo_key(r["brand"], r["model"])] for r in records
              if dxo_key(r["brand"], r["model"]) in scores}
    scales = {}
    for v in sorted({t["protocol"] for t in tested.values()}):
        pts = [(t["camera"], hw[i]) for i, t in tested.items() if t["protocol"] == v]
        if len(pts) >= C.CAMERA_LAB_MIN_FIT:
            scales[v] = _line(*zip(*pts))
    gap = {i: scales[t["protocol"]][0] + scales[t["protocol"]][1] * t["camera"] - hw[i]
           for i, t in tested.items() if t["protocol"] in scales}
    by_id = {r["id"]: r for r in records}

    for r in records:
        r["camera_adj"], r["camera_lab"] = 0.0, None
        if r["id"] in gap:
            t = tested[r["id"]]
            r["camera_adj"] = C.CAMERA_LAB_WEIGHT * gap[r["id"]]
            r["camera_lab"] = {"dxomark": t["camera"], "protocol": t["protocol"], "url": t["url"]}
            continue
        rel = [by_id[i] for i in gap if by_id[i]["brand"] == r["brand"] and i != r["id"]]
        same_chip = lambda t: bool(_chip_key(t.get("chipset"))) and _chip_key(t.get("chipset")) == _chip_key(
            r.get("chipset"))
        for share, why, pick in (
                (1.0, "same cameras and chip", lambda t: camera_twins(r, t) and same_chip(t)),
                (C.CAMERA_SHARE, "same cameras, different chip",
                 lambda t: camera_twins(r, t) and series(t["model"])[1] == series(r["model"])[1]),
                (C.CAMERA_SHARE, "same chip and camera software",
                 lambda t: r["brand"] in C.CAMERA_PIPELINE_BRANDS and same_chip(t)),
        ):
            cands = [t for t in rel if pick(t)]
            if cands:
                src = min(cands, key=lambda t: abs(_days(t.get("announced")) - _days(r.get("announced"))))
                t = tested[src["id"]]
                r["camera_adj"] = C.CAMERA_LAB_WEIGHT * share * gap[src["id"]]
                r["camera_lab"] = {"from": src["name"], "why": why, "share": share, "dxomark": t["camera"],
                                   "protocol": t["protocol"], "url": t["url"]}
                r["estimated"] = _with(r["estimated"], "camera")
                break
    return {v: {"a": round(a, 4), "b": round(b, 5)} for v, (a, b) in scales.items()}


# ------------------------------------------------------------------ Notebookcheck

def load_stress() -> dict[str, dict]:
    if not NBC_FILE.exists():
        return {}
    with NBC_FILE.open(encoding="utf-8", newline="") as f:
        return {row["id"]: row for row in csv.DictReader(f)}


def apply_stress_tests(records: list[dict], stress: dict[str, dict]) -> None:
    """gpu_stability: share of peak graphics kept under sustained load. Tested
    phones use their review; phones that overheated before finishing get the
    lowest stability seen; others borrow from the same chip, else from the
    same brand's phones with the nearest peak graphics score, else from any
    phones with the nearest peak score (flagship chips throttle most)."""
    tested = {i: float(row["stability_pct"]) / 100 for i, row in stress.items() if row.get("stability_pct")}
    floor = min(tested.values()) if tested else None
    by_id = {r["id"]: r for r in records}
    known = [(by_id[i], s) for i, s in tested.items() if i in by_id and by_id[i].get("gpu")]
    pairs = [(math.log(r["gpu"]), s) for r, s in known]
    for r in records:
        row = stress.get(r["id"])
        r["stress"] = None
        if row and (row.get("stability_pct") or row.get("overheated")):
            r["gpu_stability"] = tested.get(r["id"], floor)
            r["stability_source"] = "overheated" if row.get("overheated") else "tested"
            r["stress"] = {"test": row["test"], "url": row["review_url"],
                           "max_temp_c": float(row["max_surface_temp_c"]) if row.get("max_surface_temp_c") else None,
                           "note": row.get("note") or None}
            continue
        chip = [s for t, s in known if _chip_key(t.get("chipset")) and
                _chip_key(t.get("chipset")) == _chip_key(r.get("chipset"))]
        brand = [(math.log(t["gpu"]), s) for t, s in known if t["brand"] == r["brand"] and t["id"] != r["id"]]
        if chip:
            r["gpu_stability"], r["stability_source"] = statistics.median(chip), "same chipset"
        elif r.get("gpu") and len(brand) >= 3:
            # cooling is a brand trait too: tested iPhones keep 66-82%, Android flagships ~50-60%
            r["gpu_stability"] = _nearest_median(math.log(r["gpu"]), brand, k=3)
            r["stability_source"] = "same brand"
        elif r.get("gpu") and len(pairs) >= 8:
            r["gpu_stability"] = _nearest_median(math.log(r["gpu"]), pairs)
            r["stability_source"] = "similar performance"
        else:
            r["gpu_stability"], r["stability_source"] = None, "unknown"
        if r.get("gpu") and (r["gpu_stability"] or 1.0) < C.STABILITY_FLAG_BELOW:
            r["estimated"] = _with(r["estimated"], "performance")


def _with(estimated: list[str], key: str) -> list[str]:
    order = [k for k, _ in C.CATEGORIES]
    return sorted(set(estimated) | {key}, key=order.index)


def apply(records: list[dict]) -> dict:
    dxo = json.loads(DXO_FILE.read_text(encoding="utf-8")) if DXO_FILE.exists() else None
    scales = apply_camera_labs(records, dxo)
    apply_stress_tests(records, load_stress())
    return {"camera_scales": scales, "dxomark_fetched": (dxo or {}).get("fetched")}


if __name__ == "__main__":
    data = fetch_dxomark()
    DXO_FILE.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"{len(data['phones'])} DXOMARK camera scores -> {DXO_FILE}")
