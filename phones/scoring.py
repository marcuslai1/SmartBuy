from __future__ import annotations
from typing import Any, Tuple, Dict
import re

# Regex patterns
_MP_DIGITS_RE   = re.compile(r"(\d+)\s?MP", re.IGNORECASE)
_IP_EXTRACT_RE  = re.compile(r"\bIP\s*([0-9]{2})\s*[A-Z]?\b", re.IGNORECASE)

# Helpers
def _get(obj: Any, key: str, default=None) -> Any:
    try:
        return obj.get(key, default) if isinstance(obj, dict) else getattr(obj, key, default)
    except (AttributeError, KeyError):
        return default

def _clamp(x: float, lo: float, hi: float) -> float:
    return hi if x > hi else lo if x < lo else x

def _coalesce(*vals, fallback=None):
    for v in vals:
        if v is None:
            continue
        if isinstance(v, str) and v.strip() == "":
            continue
        return v
    return fallback

# Weights & constants
_W = {
    "soc"        : 2.0,
    "ram"        : 2.0,
    "storage"    : 1.0,
    "display"    : 1.5,
    "camera"     : 1.5,
    "battery"    : 1.5,
    "charging"   : 0.75,
    "extras"     : 1.0,
    "durability" : 1.5,
    "protection" : 1.0,
}
MAX_SCORE = sum(_W.values())
_OLED_UNKNOWN_BASELINE = 0.5

# IP protection
_IP_SCORES = {
    "IP52": 0.20, "IP53": 0.25, "IP54": 0.30, "IP55": 0.35,
    "IP64": 0.50, "IP65": 0.60, "IP67": 0.75, "IP68": 0.9, "IP69": 1.00,
    "UNKNOWN": 0.10,
}

def _normalize_ip(ip_rating: Any) -> str | None:
    if not ip_rating:
        return None
    s = str(ip_rating).strip().upper()
    if s in _IP_SCORES:
        return s
    m = _IP_EXTRACT_RE.search(s)
    return f"IP{m.group(1)}" if m else None

def _ip_score(ip_rating: Any) -> float:
    key = _normalize_ip(ip_rating) or "UNKNOWN"
    return _IP_SCORES.get(key, _IP_SCORES["UNKNOWN"])

# Tier curves (SoC / RAM / Storage / Display)
# Each function maps raw hardware values into a 0–2.0 scale contribution.

# Map SoC performance tier score to base points.
def _soc_base_pts(soc_tier: float) -> float:
    try:
        t = float(soc_tier)
    except (TypeError, ValueError):
        return 0.0
    if t >= 9.0: return 2.00
    if t >= 8.0: return 1.60
    if t >= 7.0: return 1.30
    if t >= 6.0: return 1.00
    if t >= 5.0: return 0.75
    if t >= 4.0: return 0.50
    return 0.0

# Assign points based on RAM capacity.
def _ram_base_pts(ram_gb: float) -> float:
    try:
        r = float(ram_gb or 0)
    except (TypeError, ValueError):
        r = 0.0
    if r >= 20: return 2.0
    if r >= 16: return 1.75
    if r >= 12: return 1.5
    if r >= 8:  return 1.0
    if r >= 6:  return 0.5
    return 0.0

# Assign points based on storage capacity.
def _rom_base_pts(storage_gb: float) -> float:
    try:
        s = float(storage_gb or 0)
    except (TypeError, ValueError):
        s = 0.0
    if s >= 1024: return 2.0
    if s >= 512:  return 1.75
    if s >= 256:  return 1.5
    if s >= 128:  return 1.0
    if s >= 64:   return 0.5
    return 0.0
# Calculate display score from panel type, refresh rate, resolution, and PPI.
def _display_base_pts(res_w: int, refresh: int, oled: bool, ppi: int) -> float:
    try:
        rr   = max(0, int(refresh))
        ssw  = max(0, int(res_w))
        dppi = max(0, int(ppi))
    except (TypeError, ValueError):
        return 0.0

    score = 0.0
    score += 0.5 if oled else 0.25

    if rr >= 120: score += 0.4
    elif rr >= 90: score += 0.3
    elif rr >= 60: score += 0.2

    if ssw >= 1440: score += 0.6
    elif ssw >= 1200: score += 0.4
    elif ssw >= 1080: score += 0.3
    elif ssw >= 720: score += 0.2

    if dppi >= 450: score += 0.5
    elif dppi >= 390: score += 0.4

    return _clamp(score, 0.0, 2.0)


# Camera scoring
# Factors in megapixels, OIS, ultrawide usefulness, selfie cam, and brand prior.

_PIPELINE_PRIOR = {"apple": 2.5, "google": 2.25, "samsung": 2.0}
_CAMERA_RAW_MAX = 7.0

# Check if second rear module is >=12 MP (considered useful ultrawide).
def _has_useful_ultrawide(camera_main_str: Any) -> bool:
    mps = [int(n) for n in _MP_DIGITS_RE.findall(str(camera_main_str or ""))]
    return len(mps) >= 2 and mps[1] >= 12

# Compute raw camera score from MP, OIS, ultrawide, selfie cam, and brand prior.
def _camera_raw_score(mp: int | None, has_ois: bool, has_useful_uw: bool, brand: str, front_mp: int | None = None) -> float:
    try:
        m = max(0.0, float(mp if mp is not None else 0))
    except (TypeError, ValueError):
        m = 0.0
    mp_score = min(3.0, 3.0 * (m / 50.0))

    ois_bonus = 1.0 if has_ois else 0.0
    uw_bonus = 0.3 if has_useful_uw else 0.0

    try:
        fm = float(front_mp) if front_mp is not None else 0.0
    except (TypeError, ValueError):
        fm = 0.0
    selfie_bonus = min(0.2, 0.2 * (fm / 32.0)) if fm > 0 else 0.0

    prior = _PIPELINE_PRIOR.get((brand or "").lower(), 0.0)
    score = mp_score + ois_bonus + uw_bonus + selfie_bonus + prior
    return _clamp(score, 0.0, 10.0)


# Battery / charging
# Assigns points for capacity (mAh) and charging wattage.

def _battery_base_pts(mAh: int) -> float:
    try:
        b = int(mAh or 0)
    except (TypeError, ValueError):
        b = 0
    if   b >= 6000: return 2.0
    elif b >= 5500: return 1.75
    elif b >= 5000: return 1.5
    elif b >= 4500: return 1.0
    elif b >= 4000: return 0.75
    elif b >= 3000: return 0.5
    return 0.0

def _charging_base_pts(watts: int) -> float:
    try:
        w = int(watts or 0)
    except (TypeError, ValueError):
        w = 0
    if w >= 50: return 2.0
    if w >= 40: return 1.5
    if w >= 30: return 1.0
    if w >= 20: return 0.75
    return 0.0


# Durability
# Uses glass family baseline and Mohs hardness delta with caps.

_GLASS_BASELINES: tuple[tuple[str, float], ...] = (
    ("armor 2", 0.95), ("armor gorilla", 0.95),
    ("victus 2", 0.85), ("victus+2", 0.85), ("victus + 2", 0.85),
    ("victus+", 0.80), ("gorilla glass victus", 0.75), ("victus", 0.75),
    ("ceramic shield", 0.75), ("xensation alpha", 0.75),
    ("gorilla glass 7i", 0.50), ("gorilla glass 5", 0.50), ("gorilla glass 3", 0.48),
    ("gorilla", 0.48), ("panda", 0.46), ("asahi", 0.46), ("dt-star", 0.46),
    ("shield glass", 0.45), ("ceramic guard", 0.45), ("nano", 0.45),
)
_UNKNOWN_TOKENS = {"", "-", "—", "n/a", "na", "none", "unknown"}

# Normalize glass text for matching against known baselines.
def _norm_glass_text(glass: str | None) -> str:
    s = (glass or "").strip().lower()
    return s.replace("®", "").replace("corning ", "")

# Get baseline durability score from glass type string
def _glass_baseline(glass_type: str | None) -> float:
    s = _norm_glass_text(glass_type)
    if s in _UNKNOWN_TOKENS:
        return 0.40
    for key, base in _GLASS_BASELINES:
        if key in s:
            return base
    return 0.46

# Calculate score adjustment from Mohs hardness rating.
def _mohs_delta(mohs: float | int | None) -> float:
    try:
        m = float(mohs) if mohs is not None else None
    except (TypeError, ValueError):
        m = None
    if m is None:  return 0.00
    if m >= 6.5:   return 0.15
    if m >= 6.0:   return 0.10
    if m >= 5.5:   return 0.06
    if m >= 5.0:   return 0.03
    if m >= 4.5:   return 0.00
    if m >= 4.0:   return -0.02
    return -0.08

# Combine glass baseline and Mohs delta, with caps based on glass family.
def _durability_score(glass_type: str | None, mohs: float | int | None) -> float:
    base  = _glass_baseline(glass_type)
    delta = _mohs_delta(mohs)
    if base < 0.55: max_up, max_down = 0.07, 0.07
    elif base < 0.75: max_up, max_down = 0.12, 0.10
    else: max_up, max_down = 0.20, 0.10
    if _norm_glass_text(glass_type) in _UNKNOWN_TOKENS:
        max_up = min(max_up, 0.05)
    return _clamp(base + _clamp(delta, -max_down, max_up), 0.0, 1.0)

# Field resolvers
# Try multiple possible keys to resolve glass type.
def _resolve_glass(phone: Any) -> str | None:
    for k in ("glass_type", "display_protection", "front_glass", "display_glass",
              "screen_protection", "protection", "materials"):
        v = _get(phone, k, None)
        if not v:
            continue
        s = str(v).strip()
        if s and s.lower() not in _UNKNOWN_TOKENS:
            return s
    return None

# Resolve IP rating field and normalize to standard form.
def _resolve_ip(phone: Any) -> str | None:
    v = _coalesce(_get(phone, "ip_rating", None), _get(phone, "ip", None))
    return _normalize_ip(v)

# Resolve pixel density (PPI)
def _resolve_ppi(phone: Any) -> int:

    return int(_coalesce(_get(phone, "ppi", None), _get(phone, "pixel_density", None), 0) or 0)

# Resolve display refresh rate (Hz).
def _resolve_refresh(phone: Any) -> int:
    return int(_coalesce(_get(phone, "refresh_hz", None), _get(phone, "refresh_rate", None), 0) or 0)

# Resolve charging wattage, handling strings like "120W".
def _resolve_charging_w(phone: Any) -> int:
    v = _coalesce(_get(phone, "charging_w", None), _get(phone, "charging_speed", None), 0)
    try:
        if isinstance(v, str) and v.strip().endswith(("W", "w")):
            return int(re.sub(r"[^0-9]", "", v))
        return int(v or 0)
    except Exception:
        return 0


# Core scoring
def calculate_raw_score(phone: Any, mode: str = "mid") -> Tuple[float, Dict[str, float]]:
    g, W = _get, _W
    max_score = MAX_SCORE

    # SoC / RAM / Storage
    soc_pts = (_soc_base_pts(g(phone, "soc_score", 0)) / 2.0) * W["soc"]
    ram_pts = (_ram_base_pts(g(phone, "ram_gb", 0)) / 2.0) * W["ram"]
    rom_pts = (_rom_base_pts(g(phone, "storage_gb", 0)) / 2.0) * W["storage"]

    # Display
    res_w, res_h = g(phone, "res_w", 0), g(phone, "res_h", 0)
    try:
        short_side = min(int(res_w or 0), int(res_h or 0))
    except (TypeError, ValueError):
        short_side = 0

    is_oled = "oled" in str(g(phone, "display_type", "")).lower()
    disp_base = (
        _OLED_UNKNOWN_BASELINE if short_side == 0 and is_oled
        else _display_base_pts(
            res_w=short_side,
            refresh=_resolve_refresh(phone),
            oled=is_oled,
            ppi=_resolve_ppi(phone),
        )
    )
    disp_pts = (disp_base / 2.0) * W["display"]

    # Camera
    has_useful_uw = _has_useful_ultrawide(g(phone, "camera_main_mp", ""))
    cam_raw = _camera_raw_score(
        mp=g(phone, "main_mp", 0),
        has_ois=g(phone, "has_ois", False),
        has_useful_uw=has_useful_uw,
        brand=g(phone, "brand", ""),
        front_mp=g(phone, "front_mp", None),
    )
    cam_raw_capped = min(cam_raw, _CAMERA_RAW_MAX)
    camera_pts = (cam_raw_capped / _CAMERA_RAW_MAX) * W["camera"]

    # Battery / Charging
    batt_pts = (_battery_base_pts(g(phone, "battery_mah", 0)) / 2.0) * W["battery"]
    chg_pts  = (_charging_base_pts(_resolve_charging_w(phone)) / 2.0) * W["charging"]

    # Extras (5G, NFC, stereo speakers)
    extras_raw = (
        (1.0 if g(phone, "has_5g", False) else 0.0) +
        (0.5 if g(phone, "has_nfc", False) else 0.0) +
        (0.5 if g(phone, "has_stereo_speakers", False) else 0.0)
    )
    extras_pts = (extras_raw / 2.0) * W["extras"]

    # Durability (glass + Mohs hardness)
    durability_unit = _durability_score(_resolve_glass(phone), g(phone, "mohs", None))
    durability_pts  = durability_unit * W["durability"]

    # Protection 
    protection_pts = _ip_score(_resolve_ip(phone)) * W["protection"]

    # normalize to 0–10
    raw_score_pts = (
        soc_pts + ram_pts + rom_pts + disp_pts + camera_pts +
        batt_pts + chg_pts + extras_pts + durability_pts + protection_pts
    )
    normalized_score = (raw_score_pts / max_score) * 10.0

    # Section breakdown (each subscore scaled to 0–10)
    breakdown = {
        "soc":        (soc_pts / W["soc"]) * 10.0 if W["soc"] else 0,
        "ram":        (ram_pts / W["ram"]) * 10.0 if W["ram"] else 0,
        "storage":    (rom_pts / W["storage"]) * 10.0 if W["storage"] else 0,
        "display":    (disp_pts / W["display"]) * 10.0 if W["display"] else 0,
        "camera":     (camera_pts / W["camera"]) * 10.0 if W["camera"] else 0,
        "battery":    (batt_pts / W["battery"]) * 10.0 if W["battery"] else 0,
        "charging":   (chg_pts / W["charging"]) * 10.0 if W["charging"] else 0,
        "extras":     (extras_pts / W["extras"]) * 10.0 if W["extras"] else 0,
        "durability": (durability_pts / W["durability"]) * 10.0 if W["durability"] else 0,
        "protection": (protection_pts / W["protection"]) * 10.0 if W["protection"] else 0,
    }

    return normalized_score, breakdown

# Value wrapper
def calculate_smartbuy_score(phone: Any, mode: str = "mid") -> tuple[float, float, Dict[str, float]]:
    raw, breakdown = calculate_raw_score(phone, mode=mode)
    price_raw = _get(phone, "price_sgd")
    try:
        price = float(price_raw)
        if price <= 0:
            return (0.0, raw, breakdown)
    except (TypeError, ValueError):
        return (0.0, raw, breakdown)
    smartbuy = (raw / price) * 100.0
    return smartbuy, raw, breakdown
