"""Scoring v2: nine 0-10 category scores per phone, combined by preset weights.

Inputs are parsed GSMArena records (sources/gsmarena.py) after enrichment
(enrich.py fills benchmark/battery gaps and records which values are estimates).
"""
from __future__ import annotations

import datetime as dt
import math

from . import config as C


def _clamp(x: float, lo: float = 0.0, hi: float = 10.0) -> float:
    return max(lo, min(hi, x))


def _lerp01(x: float, lo: float, hi: float) -> float:
    return _clamp((x - lo) / (hi - lo), 0.0, 1.0)


def _log01(x: float, lo: float, hi: float) -> float:
    if not x or x <= 0:
        return 0.0
    return _clamp(math.log(x / lo) / math.log(hi / lo), 0.0, 1.0)


def _step(value: float, table: list[tuple[float, float]]) -> float:
    for threshold, pts in table:
        if value >= threshold:
            return pts
    return 0.0


def _interp(value: float, table: list[tuple[float, float]]) -> float:
    """Piecewise-linear interpolation over a descending (x, y) table."""
    pts = sorted(table)
    if value <= pts[0][0]:
        return pts[0][1]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if value <= x1:
            return y0 + (y1 - y0) * (value - x0) / (x1 - x0)
    return pts[-1][1]


# ------------------------------------------------------------------ categories

def performance(p: dict) -> float:
    cpu = _log01(p.get("gb6") or 0, C.PERF_GB6_LO, C.PERF_GB6_HI)
    if not p.get("gpu"):
        return 10 * cpu
    gpu = _log01(p["gpu"], C.PERF_GPU_LO, C.PERF_GPU_HI)
    return 10 * ((1 - C.PERF_GPU_SHARE) * cpu + C.PERF_GPU_SHARE * gpu)


def camera(p: dict) -> float:
    cfg = C.CAMERA
    lenses = p.get("lenses") or []
    main = next((l for l in lenses if l["role"] == "wide"), lenses[0] if lenses else None)
    score = 0.0
    if main:
        score += cfg["main_sensor_max"] * _log01(main.get("sensor_in") or 0.3, cfg["main_sensor_lo_in"],
                                                 cfg["main_sensor_hi_in"])
        score += cfg["main_ois"] if main.get("ois") else 0.0

    teles = [l for l in lenses if "telephoto" in l["role"] and (l.get("zoom") or 0) >= 2]
    if teles:
        best = max(teles, key=lambda l: (l.get("zoom") or 0, l.get("sensor_in") or 0))
        score += cfg["tele_base"]
        score += cfg["tele_zoom_max"] * _log01(best["zoom"], 2.0, 5.0) if best["zoom"] > 2 else 0.0
        big = max((l.get("sensor_in") or 0) for l in teles)
        score += cfg["tele_sensor_max"] * _lerp01(big, 0.28, 0.5)

    uw = [l for l in lenses if l["role"] == "ultrawide"]
    if uw:
        score += cfg["uw_base"] + (cfg["uw_hires"] if max(l["mp"] for l in uw) >= 48 else 0.0)

    if p.get("video_4k60"):
        score += cfg["video_4k60"]
    elif p.get("video_4k"):
        score += cfg["video_4k30"]
    if p.get("video_8k"):
        score += cfg["video_8k"]

    selfie = p.get("selfie_mp") or 0
    score += cfg["selfie_max"] * _lerp01(selfie, 5, 32)
    return _clamp(score)


def battery(p: dict) -> float:
    return 10 * _lerp01(p.get("battery_h") or 0, C.BATTERY_H_LO, C.BATTERY_H_HI)


def display(p: dict) -> float:
    d = C.DISPLAY
    score = d["oled"] if p.get("is_oled") else d["lcd"]
    score += _step(p.get("refresh_hz") or 60, d["refresh"])
    score += d["ltpo"] if p.get("is_ltpo") else 0.0
    score += d["hdr"] if p.get("has_hdr") else 0.0
    nits = p.get("measured_nits") or (p.get("peak_nits") or 0) * d["claimed_peak_factor"]
    score += d["brightness_max"] * _lerp01(nits, d["nits_lo"], d["nits_hi"])
    score += d["sharp_max"] * _lerp01(p.get("ppi") or 0, d["ppi_lo"], d["ppi_hi"])
    score += d["hires"] if (p.get("res_w") or 0) >= d["hires_short_side"] else 0.0
    return _clamp(score)


def charging_watts(p: dict) -> float:
    """Wired watts, or an equivalent estimated from '50% in N min' claims
    (Apple doesn't publish wattage)."""
    if p.get("wired_w"):
        return p["wired_w"]
    rate = p.get("charge_pct_per_min")
    if rate:
        return max(10.0, 18.0 * rate - 10.0)
    return 10.0


def charging(p: dict) -> float:
    c = C.CHARGING
    score = c["wired_max"] * _log01(charging_watts(p), c["w_lo"], c["w_hi"])
    score += _step(p.get("wireless_w") or 0, c["wireless"])
    score += c["reverse_wireless"] if p.get("reverse_wireless") else 0.0
    return _clamp(score)


def glass_points(glass: str | None) -> float:
    g = (glass or "").lower()
    for key, pts in C.GLASS_TIERS:
        if key in g:
            return pts
    return C.GLASS_UNKNOWN


def build(p: dict) -> float:
    physical = C.IP_POINTS.get(p.get("ip_rating") or "", 0.0)
    physical += glass_points(p.get("glass"))
    physical += C.FRAME_POINTS.get((p.get("frame") or "").lower(), C.FRAME_UNKNOWN)
    physical += C.FREE_FALL_POINTS.get(p.get("eu_free_fall") or "", C.FREE_FALL_UNKNOWN)
    cycles = C.CYCLES_MAX * _lerp01(p.get("battery_cycles") or C.CYCLES_UNKNOWN, C.CYCLES_LO, C.CYCLES_HI)
    return _clamp(C.BUILD_PHYSICAL_SHARE * physical + cycles)


def storage_type(p: dict, variant: dict) -> str | None:
    """Storage technology of the priced variant ('UFS 4.0'); estimated if the sheet doesn't say."""
    types = p.get("storage_types") or {}
    return (types.get(str(variant.get("storage_gb"))) or types.get("default") or next(iter(types.values()), None)
            or p.get("storage_type_est"))


def memory(p: dict, variant: dict) -> float:
    score = _interp(variant.get("ram_gb") or 0, C.RAM_POINTS)
    storage = _interp(variant.get("storage_gb") or 0, C.STORAGE_POINTS)
    if p.get("card_slot"):
        storage = min(5.0, storage + C.CARD_SLOT)
    kind = storage_type(p, variant)
    speed = next((pts for prefix, pts in C.STORAGE_SPEED if kind and kind.startswith(prefix)), C.STORAGE_SPEED_UNKNOWN)
    return _clamp(C.MEMORY_CAPACITY_SHARE * (score + storage) + speed)


def os_updates(p: dict) -> int:
    """Years of OS upgrades promised at launch (stated, borrowed from the series, or brand default)."""
    return p.get("os_years") or p.get("os_updates") or C.OS_UPDATES_DEFAULT.get(p.get("brand"), 3)


def os_years_left(p: dict, as_of: str | None) -> float:
    """Promised years minus the time since release (never below 0)."""
    start = p.get("released") or p.get("announced")
    if not as_of or not start:
        return float(os_updates(p))
    age = (dt.date.fromisoformat(as_of) - dt.date.fromisoformat(start)).days / 365.25
    return max(0.0, os_updates(p) - max(0.0, age))


def software(p: dict) -> float:
    left = p["os_years_left"] if p.get("os_years_left") is not None else os_updates(p)
    return 10 * _lerp01(left, 1, C.OS_UPDATES_MAX)


def extras(p: dict) -> float:
    total = sum(C.EXTRAS.values())
    got = sum(pts for key, pts in C.EXTRAS.items() if p.get(key))
    return 10 * got / total


def category_scores(p: dict, variant: dict) -> dict[str, float]:
    return {
        "performance": performance(p),
        "camera": camera(p),
        "battery": battery(p),
        "display": display(p),
        "charging": charging(p),
        "build": build(p),
        "memory": memory(p, variant),
        "software": software(p),
        "extras": extras(p),
    }


def spec_score(categories: dict[str, float], preset: str) -> float:
    weights = C.PRESETS[preset]["weights"]
    total = sum(weights.values())
    return sum(categories[k] * w for k, w in weights.items()) / total
