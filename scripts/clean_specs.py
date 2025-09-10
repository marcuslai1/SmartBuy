import json, re, sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, Tuple

# Load SoC scores from a local JSON map
SOC_SCORE_PATH = Path("soc_scores.json")
try:
    SOC_SCORE_MAP: Dict[str, int] = json.loads(SOC_SCORE_PATH.read_text(encoding="utf-8"))
except FileNotFoundError:
    print("soc_scores.json not found, soc_score will be null for every phone.")
    SOC_SCORE_MAP = {}

# Regex patterns used to extract numeric values from text
RE_GB   = re.compile(r"(\d+(?:\.\d+)?)\s*GB", re.I)
RE_MAH  = re.compile(r"(\d+(?:\.\d+)?)\s*mAh", re.I)
RE_INCH = re.compile(r"(\d+(?:\.\d+)?)\s*[\"′]?", re.I)
RE_MP   = re.compile(r"(\d+)\s*MP", re.I)
RE_HZ   = re.compile(r"(\d+)\s*Hz", re.I)
RE_PPI  = re.compile(r"(\d+)\s*ppi", re.I)
RE_WATT = re.compile(r"(\d+(?:\.\d+)?)\s*W", re.I)
RE_G    = re.compile(r"(\d+(?:\.\d+)?)\s*g\b", re.I)
RE_MM   = re.compile(r"(\d+(?:\.\d+)?)\s*mm\b", re.I)
RE_RES  = re.compile(r"(\d+)\s*x\s*(\d+)", re.I)
RE_BTVER= re.compile(r"(\d+(?:\.\d+)?)")

# Parse a float from text using a given pattern
def to_float(txt: str, pat: re.Pattern) -> Optional[float]:
    m = pat.search(txt) if txt else None
    return float(m.group(1)) if m else None

# Parse an int from text using a given pattern
def to_int(txt: str, pat: re.Pattern) -> Optional[int]:
    m = pat.search(txt) if txt else None
    return int(float(m.group(1))) if m else None

# Parse resolution like "1080 x 2400" to (1080, 2400)
def parse_res(txt: str) -> Tuple[Optional[int], Optional[int]]:
    m = RE_RES.search(txt) if txt else None
    return (int(m.group(1)), int(m.group(2))) if m else (None, None)

# Parse Bluetooth version from mixed text
def parse_bt(txt: str) -> Optional[float]:
    m = RE_BTVER.search(txt) if txt else None
    return float(m.group(1)) if m else None

# Current timestamp in ISO format with timezone
def now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")

# Remove duplicate brand tokens from names like "Qualcomm Qualcomm Snapdragon 8 Gen 2"
def trim_brand_tail(val: Optional[str], brand: Optional[str]) -> Optional[str]:
    if not val or not brand:
        return val
    lv, lb = val.lower(), brand.lower()
    first = lv.find(lb)
    if first == -1:
        return val.strip()
    if first == 0:
        second = lv.find(lb, len(lb))
        return val[:second].rstrip() if second != -1 else val.strip()
    return val[:first].rstrip() or val.strip()

# Map raw display descriptions into buckets
def canonical_display(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    r = raw.lower()
    if "oled" in r:
        return "oled"
    if "ips" in r:
        return "lcd_ips"
    if "lcd" in r:
        return "lcd_other"
    return None

# Fix common casing issues in model strings
def tidy_model_case(m: Optional[str]) -> Optional[str]:
    if not m:
        return None
    m = re.sub(r"\biphone\b", "iPhone", m, flags=re.I)
    m = re.sub(r"gb\b", "GB", m, flags=re.I)
    return m.strip()

# Convert checkmarks/yes/no glyphs and text to booleans
def to_bool(x) -> Optional[bool]:
    if x is None or isinstance(x, bool):
        return x
    t = str(x).strip().lower()
    if t.startswith("✔") or t in ("true", "yes", "y"):
        return True
    if t.startswith("✖") or t in ("false", "no", "n"):
        return False
    return None

# Mapping from verbose scraped keys to canonical field names
FIELD_MAP = {
    "RAM": "ram",
    "internal storage": "storage",
    "battery power": "battery",
    "screen size": "display_size",
    "Display type": "display_type",
    "Ingress Protection (IP) rating": "ip_rating",
    "Chipset (SoC) name": "chipset",
    "GPU name": "gpu",
    "megapixels (main camera)": "camera_main_mp",
    "weight": "weight",
    "thickness": "thickness",
    "megapixels (front camera)": "camera_front_mp",
    "refresh rate": "refresh_rate",
    "pixel density": "pixel_density",
    "charging speed": "charging_speed",
    "Android version": "android_version",
    "resolution": "resolution",
    "Bluetooth version": "bluetooth_version",
    "has NFC": "has_nfc",
    "Supports fast charging": "has_fast_charging",
    "has 5G support": "has_5g",
    "has wireless charging": "has_wireless_charging",
    "has reverse wireless charging": "has_reverse_wireless_charging",
    "has built-in optical image stabilization": "has_ois",
    "has stereo speakers": "has_stereo_speakers",
    "has aptX": "has_aptx",
    "has LDAC": "has_ldac",
}

# Top-level keys copied over before spec processing
KEEP_TOP = {"model", "slug", "brand", "source_url"}

# Normalize one raw phone record into a clean dict
def clean_phone(raw: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {k: raw.get(k) for k in KEEP_TOP}

    # Normalize brand/title case and model casing
    out["brand"] = (out.get("brand") or "").title() or None
    out["model"] = tidy_model_case(out.get("model"))

    specs: Dict[str, str] = raw.get("specs", {})

    # Copy specs into their canonical names when present
    for verbose, canon in FIELD_MAP.items():
        if verbose in specs:
            out[canon] = specs[verbose]

    # Remove redundant brand tokens from chipset/GPU names
    brand_root = out.get("brand", "").split()[0]
    out["chipset"] = trim_brand_tail(out.get("chipset"), brand_root)
    out["gpu"] = trim_brand_tail(out.get("gpu"), brand_root)

    # Attach numeric SoC score if known
    out["soc_score"] = SOC_SCORE_MAP.get(out.get("chipset"), None)

    # Bucketize display type (oled / lcd_ips / lcd_other)
    out["display_type"] = canonical_display(out.get("display_type"))

    # Numeric conversions from raw text
    out["ram_gb"]       = to_float(out.get("ram", ""), RE_GB)
    out["storage_gb"]   = to_float(out.get("storage", ""), RE_GB)
    out["battery_mah"]  = to_float(out.get("battery", ""), RE_MAH)
    out["display_in"]   = to_float(out.get("display_size", ""), RE_INCH)
    out["refresh_hz"]   = to_int(  out.get("refresh_rate", ""), RE_HZ)
    out["ppi"]          = to_int(  out.get("pixel_density", ""), RE_PPI)
    out["charging_w"]   = to_int(  out.get("charging_speed", ""), RE_WATT)
    out["weight_g"]     = to_float(out.get("weight", ""), RE_G)
    out["thickness_mm"] = to_float(out.get("thickness", ""), RE_MM)

    # Resolution and Bluetooth version parsing
    w, h = parse_res(out.get("resolution", ""))
    out["res_w"], out["res_h"] = w, h
    out["bt_ver"] = parse_bt(out.get("bluetooth_version", ""))

    # Camera megapixels (rear + front)
    out["main_mp"]  = to_int(out.get("camera_main_mp", ""), RE_MP)
    out["front_mp"] = to_int(out.get("camera_front_mp", ""), RE_MP)

    # Convert checkbox-style flags to booleans
    for key in (
        "has_nfc", "has_fast_charging", "has_5g", "has_wireless_charging",
        "has_reverse_wireless_charging", "has_ois", "has_stereo_speakers",
        "has_aptx", "has_ldac",
    ):
        out[key] = to_bool(out.get(key, ""))

    # Defaults for missing metadata
    out["ip_rating"]  = out.get("ip_rating") or "unknown"
    out["scraped_at"] = raw.get("timestamp") or now_iso()

    # Replace empty strings with None
    for k, v in list(out.items()):
        if isinstance(v, str) and not v.strip():
            out[k] = None

    return out

# Command-line entry: read raw JSON, clean, and write to file
def main() -> None:
    in_path  = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("initial_phone.json")
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("cleaned_specs.json")

    if not in_path.exists():
        print(f"Input file not found: {in_path}")
        sys.exit(1)

    raw_list = json.loads(in_path.read_text(encoding="utf-8"))
    cleaned = [clean_phone(rec) for rec in raw_list]

    out_path.write_text(json.dumps(cleaned, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Cleaned {len(cleaned)} phones into {out_path.resolve()}")

if __name__ == "__main__":
    main()
