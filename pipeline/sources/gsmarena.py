"""GSMArena listing + spec-sheet parsing.

Everything here is pure parsing of cached HTML (see browser.py for fetching),
so it is deterministic and unit-testable.
"""
from __future__ import annotations

import re
from datetime import date

from bs4 import BeautifulSoup

BASE = "https://www.gsmarena.com/"

BRAND_PAGES = {
    "Apple": "apple-phones-48",
    "Samsung": "samsung-phones-9",
    "Google": "google-phones-107",
    "Xiaomi": "xiaomi-phones-80",
    "OPPO": "oppo-phones-82",
    "vivo": "vivo-phones-98",
    "Honor": "honor-phones-121",
    "realme": "realme-phones-118",
    "OnePlus": "oneplus-phones-95",
    "Nothing": "nothing-phones-128",
}

MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}


def brand_page_url(slug: str, page: int = 1) -> str:
    if page == 1:
        return f"{BASE}{slug}.php"
    name, num = slug.rsplit("-", 1)
    return f"{BASE}{name}-f-{num}-0-p{page}.php"


def gsm_id(url: str) -> str:
    m = re.search(r"-(\d+)\.php", url)
    return m.group(1) if m else url


# --------------------------------------------------------------------------
# Listing pages
# --------------------------------------------------------------------------

def parse_listing(html: str) -> list[dict]:
    """Return [{name, url, announced: 'YYYY-MM' | None}] from a brand page."""
    soup = BeautifulSoup(html, "lxml")
    out = []
    for a in soup.select(".makers a"):
        img = a.select_one("img")
        title = img.get("title", "") if img else ""
        m = re.search(r"Announced (\w{3})\w* (\d{4})", title)
        announced = f"{m.group(2)}-{MONTHS[m.group(1).lower()]:02d}" if m else None
        out.append({
            "name": a.get_text(" ", strip=True),
            "url": BASE + a["href"],
            "announced": announced,
        })
    return out


def parse_search(html: str) -> list[dict]:
    """Search results use the same markup as brand listings."""
    return parse_listing(html)


# --------------------------------------------------------------------------
# Spec sheet
# --------------------------------------------------------------------------

def spec_table(html: str) -> tuple[str, dict[str, str]]:
    """Flatten the spec sheet into {'Section/Label': text}. Continuation rows
    (blank label) are appended to the previous label with ' | '."""
    soup = BeautifulSoup(html, "lxml")
    title_el = soup.select_one("h1.specs-phone-name-title")
    title = title_el.get_text(strip=True) if title_el else ""
    rows: dict[str, str] = {}
    for table in soup.select("#specs-list table"):
        th = table.select_one("th")
        section = th.get_text(strip=True) if th else ""
        last_key = None
        for tr in table.select("tr"):
            nfo = tr.select_one("td.nfo")
            if not nfo:
                continue
            label_el = tr.select_one("td.ttl")
            label = label_el.get_text(" ", strip=True) if label_el else ""
            text = nfo.get_text(" ", strip=True)
            if not label or label == "\xa0":
                if last_key:
                    rows[last_key] += " | " + text
                    continue
                label = "Other"
            key = f"{section}/{label}"
            if key in rows:
                rows[key] += " | " + text
            else:
                rows[key] = text
            last_key = key
    return title, rows


def _num(pattern: str, text: str, cast=float, flags=re.I):
    m = re.search(pattern, text or "", flags)
    return cast(m.group(1).replace(",", "")) if m else None


def _date(text: str) -> str | None:
    m = re.search(r"(\d{4}),?\s+(\w{3})\w*(?:\s+(\d{1,2}))?", text or "")
    if not m or m.group(2).lower() not in MONTHS:
        y = _num(r"(\d{4})", text or "", int)
        return f"{y}-01-01" if y else None
    d = int(m.group(3) or 1)
    return date(int(m.group(1)), MONTHS[m.group(2).lower()], d).isoformat()


def parse_variants(text: str) -> list[dict]:
    """'128GB 8GB RAM, 256GB 8GB RAM, 1TB 12GB RAM' -> [{storage_gb, ram_gb}]"""
    out = []
    for m in re.finditer(r"(\d+(?:\.\d+)?)\s*(GB|TB)\s+(\d+(?:\.\d+)?)\s*GB\s+RAM", text or "", re.I):
        storage = float(m.group(1)) * (1024 if m.group(2).upper() == "TB" else 1)
        v = {"storage_gb": int(storage), "ram_gb": float(m.group(3))}
        if v not in out:
            out.append(v)
    return out


def parse_storage_types(text: str) -> dict:
    """Storage technology, per size where the sheet splits it:
    'UFS 3.1 - 128GB only UFS 4.0' -> {'default': 'UFS 4.0', '128': 'UFS 3.1'}.
    A bare 'UFS' (version not given) counts as unknown."""
    out: dict[str, str] = {}
    for m in re.finditer(r"(UFS\s*\d(?:\.[\dxX])?|eMMC(?:\s*[\d.]+)?|NVMe)(?:\s*-\s*([\d/]+)\s*GB)?", text or ""):
        kind = re.sub(r"\s+", " ", m.group(1)).replace("x", "X")
        if m.group(2):
            for gb in m.group(2).split("/"):
                out.setdefault(gb, kind)
        else:
            out.setdefault("default", kind)
    return out


def parse_sensor_type(text: str) -> float | None:
    """Optical format in inches: '1/1.3"' -> 0.769, '1.0"' -> 1.0 (some sheets use a curly ” for the inch mark)."""
    m = re.search(r'(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)\s*["”″]', text)
    if m:
        return round(float(m.group(1)) / float(m.group(2)), 3)
    m = re.search(r'(?<![\d/])(\d(?:\.\d+)?)\s*["”″]', text)
    if m and float(m.group(1)) <= 1.5:
        return float(m.group(1))
    return None


_ROLE_RE = re.compile(r"\((periscope telephoto|telephoto|ultrawide|wide|macro|depth|monochrome)\)", re.I)


def parse_camera_modules(text: str) -> list[dict]:
    """Split the main camera field into lenses with role, MP, sensor size, zoom, OIS."""
    lenses = []
    # Each lens starts with "NN MP" (GSMArena separates lenses with spaces or ' | ')
    parts = re.split(r"(?=(?<![\w.])\d+(?:\.\d+)?\s*MP\b)", text or "")
    for part in parts:
        mp = _num(r"^(\d+(?:\.\d+)?)\s*MP", part.strip())
        if mp is None:
            continue
        role_m = _ROLE_RE.search(part)
        role = role_m.group(1).lower() if role_m else ("tof" if "tof" in part.lower() else "other")
        # '3x optical zoom', or the short end of a continuous range: '3.2-4.3x continuous optical zoom'
        zoom = _num(r"(\d+(?:\.\d+)?)(?:-\d+(?:\.\d+)?)?x (?:continuous )?optical zoom", part)
        lenses.append({
            "role": role,
            "mp": mp,
            "sensor_in": parse_sensor_type(part),
            "zoom": zoom,
            "ois": bool(re.search(r"\bOIS\b", part)),
        })
    return lenses


def parse_ip(text: str) -> str | None:
    ips = re.findall(r"IP\s?(\d)(\d)(?:K)?", text or "")
    if not ips:
        return None
    best = max(ips, key=lambda t: (int(t[0]), int(t[1])))
    return f"IP{best[0]}{best[1]}"


def _hours(text: str) -> float | None:
    m = re.search(r"(\d+):(\d{2})h", text or "")
    return round(int(m.group(1)) + int(m.group(2)) / 60, 2) if m else None


def normalize_chipset(text: str) -> str | None:
    """'Qualcomm SM8750-AC Snapdragon 8 Elite (3 nm)' -> 'Qualcomm Snapdragon 8 Elite'."""
    t = re.sub(r"\(.*?\)", "", text or "")
    t = re.sub(r"\b(SM\d{4}\w*(-\w+)*|MT\d{4}\w*|S5E\d{4}\w*)\b", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t or None


def _charge_rate(text: str) -> float | None:
    """Fastest wired '% per minute' claim, e.g. '50% in 20 min' -> 2.5."""
    rates = [int(p) / int(m) for p, m in re.findall(r"(\d+)% in (\d+) min", text or "")]
    return round(max(rates), 2) if rates else None


def _yes(text: str | None) -> bool | None:
    if text is None:
        return None
    t = text.strip().lower()
    if t.startswith("yes"):
        return True
    if t.startswith("no"):
        return False
    return None


def parse_spec(html: str, url: str) -> dict:
    """Parse one spec sheet into a flat record of the fields scoring uses."""
    title, r = spec_table(html)
    g = lambda key: r.get(key, "")

    display_type = g("Display/Type")
    display_res = g("Display/Resolution")
    res = re.search(r"(\d+)\s*x\s*(\d+)\s*pixels", display_res)
    nits = [int(n) for n in re.findall(r"(\d{3,5})\s*nits", display_type)]

    os_text = g("Platform/OS")
    chipset_text = g("Platform/Chipset")
    chipset = normalize_chipset(chipset_text.split(" | ")[0])

    cam_key = next((k for k in r if k.startswith("Main Camera/") and k not in
                    ("Main Camera/Features", "Main Camera/Video")), None)
    lenses = parse_camera_modules(r.get(cam_key, "")) if cam_key else []
    selfie_key = next((k for k in r if k.startswith("Selfie camera/") and k not in
                       ("Selfie camera/Features", "Selfie camera/Video")), None)
    selfie = parse_camera_modules(r.get(selfie_key, "")) if selfie_key else []
    video = g("Main Camera/Video")

    charging = g("Battery/Charging")
    battery_text = g("Battery/Type")
    perf = g("Our Tests/Performance")
    antutu = re.search(r"AnTuTu:\s*([\d,]+)\s*\(v(\d+)\)", perf)

    status = g("Launch/Status")
    released = re.search(r"Released\s+(.*)", status)

    build = g("Body/Build")
    protection = g("Display/Protection") or (re.search(r"Glass front \(([^)]+)\)", build) or [None, None])[1]

    sensors = g("Features/Sensors")
    brand_model = title.split(" ", 1)
    return {
        "gsm_id": gsm_id(url),
        "gsm_url": url,
        "name": title,
        "brand": brand_model[0] if brand_model else None,
        "announced": _date(g("Launch/Announced")),
        "status": status.split(".")[0] if status else None,
        "released": _date(released.group(1)) if released else None,
        # body
        "weight_g": _num(r"([\d.]+)\s*g\b", g("Body/Weight")),
        "thickness_mm": _num(r"x\s*([\d.]+)\s*mm", g("Body/Dimensions")),
        "frame": (re.search(r"(titanium|stainless steel|aluminum|plastic)\s+frame", build, re.I) or [None, None])[1],
        "glass": protection,
        "ip_rating": parse_ip(" ".join(v for k, v in r.items() if k.startswith("Body/"))),
        # display
        "display_tech": display_type,
        "is_foldable": "foldable" in display_type.lower(),
        "pwm_hz": _num(r"(\d+)\s*Hz PWM", display_type, int),
        "is_oled": bool(re.search(r"OLED", display_type, re.I)),
        "is_ltpo": "LTPO" in display_type,
        "has_hdr": bool(re.search(r"HDR|Dolby Vision", display_type)),
        # '2560Hz PWM' is dimming frequency, not refresh rate
        "refresh_hz": max([int(hz) for hz in re.findall(r"(\d+)\s*Hz(?!\s*PWM)", display_type) if int(hz) <= 240]
                          or [60]),
        "peak_nits": max(nits) if nits else None,
        "display_in": _num(r"([\d.]+)\s*inches", g("Display/Size")),
        "res_w": min(int(res.group(1)), int(res.group(2))) if res else None,
        "res_h": max(int(res.group(1)), int(res.group(2))) if res else None,
        "ppi": _num(r"~(\d+)\s*ppi", display_res, int),
        # platform
        "os": os_text.split(",")[0] if os_text else None,
        "os_updates": _num(r"up to (\d+) major", os_text, int),
        "chipset": chipset,
        "cpu": g("Platform/CPU") or None,
        # memory
        "card_slot": not g("Memory/Card slot").lower().startswith("no") if g("Memory/Card slot") else None,
        "variants": parse_variants(g("Memory/Internal")),
        "storage_types": parse_storage_types(g("Memory/Internal")),
        # cameras
        "lenses": lenses,
        "selfie_mp": selfie[0]["mp"] if selfie else None,
        "video_8k": "8K" in video,
        "video_4k": "4K" in video or "2160p" in video,
        "video_4k60": bool(re.search(r"4K@[\d/]*60", video)),
        # sound / comms
        "stereo": "stereo" in g("Sound/Loudspeaker").lower(),
        "jack": _yes(g("Sound/3.5mm jack")),
        "nfc": _yes(g("Comms/NFC")),
        "has_5g": "5G" in g("Network/Technology"),
        "uwb": "UWB" in " ".join(v for k, v in r.items() if k.startswith(("Comms/", "Features/"))),
        "ir": _yes(g("Comms/Infrared port")),
        "esim": "eSIM" in g("Body/SIM"),
        # ultrasonic under-display fingerprint, or 3D face unlock (Face ID)
        "secure_unlock": bool(re.search(r"Fingerprint \(under display, ultrasonic\)|Face ID|3D face", sensors)),
        # battery
        "battery_mah": _num(r"(\d{3,5})\s*mAh", battery_text, int),
        "wired_w": _num(r"(\d+(?:\.\d+)?)W wired", charging),
        "charge_pct_per_min": _charge_rate(charging),
        "wireless_w": _num(r"(\d+(?:\.\d+)?)W wireless", charging),
        "reverse_wireless": "reverse wireless" in charging.lower(),
        "magsafe_or_qi2": bool(re.search(r"MagSafe|Qi2", charging)),
        # lab tests (only present for reviewed phones)
        "geekbench6": _num(r"GeekBench:\s*([\d,]+)\s*\(v6\)", perf, int),
        "wildlife_extreme": _num(r"3DMark:\s*([\d,]+)\s*\(Wild Life Extreme\)", perf, int),
        "antutu": int(antutu.group(1).replace(",", "")) if antutu else None,
        "antutu_ver": int(antutu.group(2)) if antutu else None,
        "measured_nits": _num(r"([\d,]+)\s*nits", g("Our Tests/Display"), int),
        "loudness_lufs": _num(r"(-[\d.]+)\s*LUFS", g("Our Tests/Loudspeaker")),
        "active_use_h": _hours(g("Our Tests/Battery")),
        "eu_endurance_h": _hours(g("EU LABEL/Battery")),
        "eu_free_fall": (re.search(r"Class ([A-E])", g("EU LABEL/Free fall")) or [None, None])[1],
        "battery_cycles": _num(r"(\d{3,4})\s*cycles", g("EU LABEL/Battery"), int),
        "eu_repairability": (re.search(r"Class ([A-E])", g("EU LABEL/Repairability")) or [None, None])[1],
        "price_text": g("Misc/Price") or None,
    }
