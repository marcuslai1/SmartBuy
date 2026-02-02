from __future__ import annotations
from typing import Any, Tuple, Dict
import re

from .scoring_config import SCORING_CONFIG

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

# Load weights from config
_W = SCORING_CONFIG["weights"]
MAX_SCORE = sum(_W.values())
_OLED_UNKNOWN_BASELINE = 0.5

# IP protection scores from config
_IP_SCORES = SCORING_CONFIG["ip_scores"]

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
# Uses tiers from SCORING_CONFIG for easy tuning.

def _tier_lookup(value: float, tiers: list) -> float:
    """Generic tier lookup - returns points for first matching threshold."""
    for threshold, points in tiers:
        if value >= threshold:
            return points
    return 0.0

# Map SoC performance tier score to base points.
def _soc_base_pts(soc_tier: float) -> float:
    try:
        t = float(soc_tier)
    except (TypeError, ValueError):
        return 0.0
    return _tier_lookup(t, SCORING_CONFIG["soc_tiers"])

# Assign points based on RAM capacity.
def _ram_base_pts(ram_gb: float) -> float:
    try:
        r = float(ram_gb or 0)
    except (TypeError, ValueError):
        r = 0.0
    return _tier_lookup(r, SCORING_CONFIG["ram_tiers"])

# Assign points based on storage capacity.
def _rom_base_pts(storage_gb: float) -> float:
    try:
        s = float(storage_gb or 0)
    except (TypeError, ValueError):
        s = 0.0
    return _tier_lookup(s, SCORING_CONFIG["storage_tiers"])
# Calculate display score from panel type, refresh rate, resolution, and PPI.
def _display_base_pts(res_w: int, refresh: int, oled: bool, ppi: int, is_ltpo: bool = False, has_hdr: bool = False, brightness: int = 0) -> float:
    try:
        rr   = max(0, int(refresh))
        ssw  = max(0, int(res_w))
        dppi = max(0, int(ppi))
        nits = max(0, int(brightness))
    except (TypeError, ValueError):
        return 0.0

    display_cfg = SCORING_CONFIG["display"]
    score = 0.0

    # Panel type bonus
    score += display_cfg["oled_bonus"] if oled else display_cfg["lcd_bonus"]
    if is_ltpo:
        score += display_cfg["ltpo_bonus"]
    if has_hdr:
        score += display_cfg["hdr_bonus"]

    # Refresh rate
    for threshold, pts in display_cfg["refresh_thresholds"]:
        if rr >= threshold:
            score += pts
            break

    # Resolution (short side)
    for threshold, pts in display_cfg["resolution_thresholds"]:
        if ssw >= threshold:
            score += pts
            break

    # PPI
    for threshold, pts in display_cfg["ppi_thresholds"]:
        if dppi >= threshold:
            score += pts
            break

    # Brightness
    for threshold, pts in display_cfg["brightness_thresholds"]:
        if nits >= threshold:
            score += pts
            break

    return _clamp(score, 0.0, 2.0)


# Camera scoring
# Factors in megapixels, OIS, ultrawide usefulness, telephoto, selfie cam, and ISP quality.
# ISP quality (based on SoC tier) accounts for computational photography differences.

_CAMERA_CFG = SCORING_CONFIG["camera"]

# Check if second rear module is >=12 MP (considered useful ultrawide).
def _has_useful_ultrawide(camera_main_str: Any) -> bool:
    mps = [int(n) for n in _MP_DIGITS_RE.findall(str(camera_main_str or ""))]
    return len(mps) >= 2 and mps[1] >= 12

# Get ISP quality bonus based on SoC tier
# Better SoCs have better Image Signal Processors = better computational photography
def _get_isp_quality_bonus(soc_tier: float) -> float:
    try:
        t = float(soc_tier)
    except (TypeError, ValueError):
        return 0.2  # Minimum bonus for unknown SoC
    return _tier_lookup(t, SCORING_CONFIG["isp_quality_tiers"])

# Get brand camera bias from config (disabled by default)
def _get_brand_camera_bias(brand: str) -> float:
    if not SCORING_CONFIG.get("enable_brand_bias", False):
        return 0.0
    brand_lower = (brand or "").lower()
    return SCORING_CONFIG["brand_camera_bias"].get(brand_lower, 0.0)

# Compute raw camera score from MP, OIS, ultrawide, telephoto, selfie cam, and ISP quality.
def _camera_raw_score(mp: int | None, has_ois: bool, has_useful_uw: bool, brand: str,
                      front_mp: int | None = None, has_telephoto: bool = False,
                      soc_tier: float = 0) -> float:
    cfg = _CAMERA_CFG

    try:
        m = max(0.0, float(mp if mp is not None else 0))
    except (TypeError, ValueError):
        m = 0.0

    # MP score with diminishing returns above reference
    mp_ratio = m / cfg["mp_reference"]
    if cfg.get("mp_diminishing", False) and mp_ratio > 1.0:
        # Diminishing returns: sqrt scaling above reference
        mp_score = min(cfg["mp_max_score"], cfg["mp_max_score"] * (1.0 + (mp_ratio - 1.0) ** 0.5) / 2.0)
    else:
        mp_score = min(cfg["mp_max_score"], cfg["mp_max_score"] * mp_ratio)

    # OIS bonus (crucial for photo quality)
    ois_bonus = cfg["ois_bonus"] if has_ois else 0.0

    # Ultrawide bonus
    uw_bonus = cfg["ultrawide_bonus"] if has_useful_uw else 0.0

    # Telephoto bonus
    tele_bonus = cfg["telephoto_bonus"] if has_telephoto else 0.0

    # Selfie camera bonus
    try:
        fm = float(front_mp) if front_mp is not None else 0.0
    except (TypeError, ValueError):
        fm = 0.0
    selfie_bonus = min(cfg["selfie_max_bonus"], cfg["selfie_max_bonus"] * (fm / cfg["selfie_reference"])) if fm > 0 else 0.0

    # ISP quality bonus (based on SoC tier - accounts for computational photography)
    isp_bonus = _get_isp_quality_bonus(soc_tier)

    # Brand bias (disabled by default)
    brand_bias = _get_brand_camera_bias(brand)

    score = mp_score + ois_bonus + uw_bonus + tele_bonus + selfie_bonus + isp_bonus + brand_bias
    return _clamp(score, 0.0, cfg["raw_max"])


# Battery / charging
# Assigns points for capacity (mAh) and charging wattage.
# Includes efficiency multipliers based on SoC efficiency.

def _battery_base_pts(mAh: int) -> float:
    try:
        b = int(mAh or 0)
    except (TypeError, ValueError):
        b = 0
    return _tier_lookup(b, SCORING_CONFIG["battery_tiers"])

def _get_efficiency_multiplier(soc_tier: float, brand: str) -> float:
    """Get battery efficiency multiplier based on SoC and brand."""
    multipliers = SCORING_CONFIG["efficiency_multipliers"]
    brand_lower = (brand or "").lower()

    # Apple A-series and Google Tensor are known for efficiency
    if brand_lower == "apple":
        return multipliers["flagship_efficient"]
    if brand_lower == "google":
        return multipliers["flagship_efficient"]

    try:
        t = float(soc_tier)
    except (TypeError, ValueError):
        return multipliers["midrange_standard"]

    # MediaTek Dimensity chips are very efficient
    # (This would ideally check the actual chip name, but we approximate by tier)
    if t >= 8.0:
        return multipliers["flagship_standard"]
    elif t >= 6.5:
        return multipliers["midrange_efficient"]
    elif t >= 5.0:
        return multipliers["midrange_standard"]
    else:
        return multipliers["budget"]

def _charging_base_pts(watts: int) -> float:
    try:
        w = int(watts or 0)
    except (TypeError, ValueError):
        w = 0
    return _tier_lookup(w, SCORING_CONFIG["charging_tiers"])


# Durability
# Uses glass family baseline and Mohs hardness delta with caps.
# Glass baselines and Mohs deltas loaded from config.

_GLASS_BASELINES = SCORING_CONFIG["glass_baselines"]
_UNKNOWN_TOKENS = {"", "-", "—", "n/a", "na", "none", "unknown"}

# Normalize glass text for matching against known baselines.
def _norm_glass_text(glass: str | None) -> str:
    s = (glass or "").strip().lower()
    return s.replace("®", "").replace("corning ", "")

# Get baseline durability score from glass type string
def _glass_baseline(glass_type: str | None) -> float:
    s = _norm_glass_text(glass_type)
    if s in _UNKNOWN_TOKENS:
        return SCORING_CONFIG["unknown_glass_baseline"]
    for key, base in _GLASS_BASELINES:
        if key in s:
            return base
    return SCORING_CONFIG["default_glass_baseline"]

# Calculate score adjustment from Mohs hardness rating.
def _mohs_delta(mohs: float | int | None) -> float:
    try:
        m = float(mohs) if mohs is not None else None
    except (TypeError, ValueError):
        m = None
    if m is None:
        return 0.00
    for threshold, delta in SCORING_CONFIG["mohs_deltas"]:
        if m >= threshold:
            return delta
    return SCORING_CONFIG["mohs_minimum_delta"]

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
    extras_cfg = SCORING_CONFIG["extras"]

    # Get brand for various brand-specific calculations
    brand = g(phone, "brand", "")
    soc_score = g(phone, "soc_score", 0)

    # SoC / RAM / Storage
    soc_pts = (_soc_base_pts(soc_score) / 2.0) * W["soc"]
    ram_pts = (_ram_base_pts(g(phone, "ram_gb", 0)) / 2.0) * W["ram"]
    rom_pts = (_rom_base_pts(g(phone, "storage_gb", 0)) / 2.0) * W["storage"]

    # Display
    res_w, res_h = g(phone, "res_w", 0), g(phone, "res_h", 0)
    try:
        short_side = min(int(res_w or 0), int(res_h or 0))
    except (TypeError, ValueError):
        short_side = 0

    display_type = str(g(phone, "display_type", "")).lower()
    is_oled = "oled" in display_type or "amoled" in display_type
    is_ltpo = "ltpo" in display_type
    has_hdr = g(phone, "has_hdr", False) or "hdr" in display_type
    brightness = g(phone, "brightness_nits", 0)

    disp_base = (
        _OLED_UNKNOWN_BASELINE if short_side == 0 and is_oled
        else _display_base_pts(
            res_w=short_side,
            refresh=_resolve_refresh(phone),
            oled=is_oled,
            ppi=_resolve_ppi(phone),
            is_ltpo=is_ltpo,
            has_hdr=has_hdr,
            brightness=brightness,
        )
    )
    disp_pts = (disp_base / 2.0) * W["display"]

    # Camera (with ISP quality bonus based on SoC tier)
    has_useful_uw = _has_useful_ultrawide(g(phone, "camera_main_mp", ""))
    has_telephoto = g(phone, "has_telephoto", False)
    cam_raw = _camera_raw_score(
        mp=g(phone, "main_mp", 0),
        has_ois=g(phone, "has_ois", False),
        has_useful_uw=has_useful_uw,
        brand=brand,
        front_mp=g(phone, "front_mp", None),
        has_telephoto=has_telephoto,
        soc_tier=soc_score,  # Pass SoC tier for ISP quality bonus
    )
    camera_pts = (cam_raw / _CAMERA_CFG["raw_max"]) * W["camera"]

    # Battery with efficiency multiplier
    batt_base = _battery_base_pts(g(phone, "battery_mah", 0))
    efficiency_mult = _get_efficiency_multiplier(soc_score, brand)
    batt_pts = ((batt_base * efficiency_mult) / 2.0) * W["battery"]
    # Cap at weight maximum
    batt_pts = min(batt_pts, W["battery"])

    # Charging
    chg_pts = (_charging_base_pts(_resolve_charging_w(phone)) / 2.0) * W["charging"]

    # Extras (5G, NFC, stereo speakers, wireless charging, etc.)
    extras_raw = 0.0
    if g(phone, "has_5g", False):
        extras_raw += extras_cfg["5g_bonus"]
    if g(phone, "has_nfc", False):
        extras_raw += extras_cfg["nfc_bonus"]
    if g(phone, "has_stereo_speakers", False):
        extras_raw += extras_cfg["stereo_bonus"]
    if g(phone, "has_wireless_charging", False):
        extras_raw += extras_cfg["wireless_charging"]
    if g(phone, "has_reverse_wireless", False):
        extras_raw += extras_cfg["reverse_wireless"]
    if g(phone, "has_sd_card", False):
        extras_raw += extras_cfg["sd_card"]
    if g(phone, "has_headphone_jack", False):
        extras_raw += extras_cfg["headphone_jack"]
    if g(phone, "has_ir_blaster", False):
        extras_raw += extras_cfg["ir_blaster"]

    # Normalize extras (max possible is around 2.6, normalize to 0-2 scale)
    extras_max = sum(extras_cfg.values())
    extras_pts = (extras_raw / extras_max) * W["extras"]

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

    # Apply guardrails for very low spec phones (penalties only, no bonuses)
    guardrails = SCORING_CONFIG["guardrails"]
    if normalized_score < guardrails["low_spec_threshold"]:
        normalized_score *= guardrails["low_spec_penalty"]
    elif normalized_score < guardrails["mid_spec_threshold"]:
        normalized_score *= guardrails["mid_spec_penalty"]

    # Ensure score is capped at 10.0
    normalized_score = min(normalized_score, 10.0)

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
