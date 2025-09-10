import json
import re
from django.core.management.base import BaseCommand
from django.utils.dateparse import parse_datetime
from phones.models import Phone

# Pattern matchers for numeric tokens, IP ratings, and resolutions
_num = re.compile(r"[-+]?\d*\.?\d+")
_ip = re.compile(r"\bIP\s*([0-9]{2})\s*[A-Z]?\b", re.IGNORECASE)
_res = re.compile(r"(\d+)\s*[x×]\s*(\d+)", re.IGNORECASE)

# Values treated as empty/unknown when coalescing
SKIP_STRS = {"", "-", "—", "N/A", "n/a", "na", "None", "none", "unknown", "Unknown"}

# Return the first value that isn't blank or a sentinel
def first_nonempty(*vals):
    for v in vals:
        if v is None:
            continue
        s = str(v).strip() if isinstance(v, str) else v
        if s not in SKIP_STRS:
            return v
    return None

# Extract first number from a value and cast to int
def to_int(val):
    if val is None:
        return None
    if isinstance(val, (int,)):
        return val
    m = _num.search(str(val))
    return int(float(m.group())) if m else None

# Extract first number from a value and cast to float
def to_float(val):
    if val is None:
        return None
    if isinstance(val, (float, int)):
        return float(val)
    m = _num.search(str(val))
    return float(m.group()) if m else None

# Normalise IP strings to 'IPNN' 
def norm_ip(v):
    if not v:
        return None
    s = str(v).strip().upper()
    if len(s) >= 4 and s.startswith("IP") and s[2:4].isdigit():
        return f"IP{s[2:4]}"
    m = _ip.search(s)
    return f"IP{m.group(1)}" if m else None

# Lowercase a string value or return None
def norm_lower(v):
    return str(v).strip().lower() if v is not None else None

# Parse resolution from '1080 x 2400'
def parse_resolution(v):
    if v is None:
        return (None, None)
    if isinstance(v, dict):
        w, h = v.get("w"), v.get("h")
        return (to_int(w), to_int(h))
    m = _res.search(str(v))
    if not m:
        return (None, None)
    return (to_int(m.group(1)), to_int(m.group(2)))

# Management command: import/merge phones from a final_spec JSON file
class Command(BaseCommand):
    help = "Import phones from a final_spec JSON file (idempotent upsert)."

    # CLI: path to JSON file
    def add_arguments(self, parser):
        parser.add_argument("json_file", help="Path to final_spec JSON")

    # Read JSON, normalise fields, and upsert Phone rows by slug
    def handle(self, json_file, *args, **kwargs):
        with open(json_file, encoding="utf-8") as f:
            data = json.load(f)

        # Accept list[phone] or dict[slug] to phone
        if isinstance(data, dict):
            items = list(data.values())
        elif isinstance(data, list):
            items = data
        else:
            raise SystemExit("JSON must be a list or dict of phone objects.")

        created = updated = skipped = 0

        for item in items:
            slug = item.get("slug")
            if not slug:
                skipped += 1
                continue

            # Camera MPs: keep original string and derive numeric main MP
            camera_main_mp_str = first_nonempty(item.get("camera_main_mp"))
            main_mp_num = to_int(camera_main_mp_str) or to_int(item.get("main_mp"))

            # Resolution: prefer numeric fields, otherwise parse pretty string
            res_w = to_int(first_nonempty(item.get("res_w")))
            res_h = to_int(first_nonempty(item.get("res_h")))
            if res_w is None or res_h is None:
                w2, h2 = parse_resolution(first_nonempty(item.get("resolution")))
                res_w = res_w or w2
                res_h = res_h or h2

            # Payload for update_or_create
            defaults = {
                # Identity / source
                "model": item.get("model"),
                "brand": item.get("brand"),
                "source_url": item.get("source_url"),

                # Platform
                "soc_score": item.get("soc_score"),
                "chipset": item.get("chipset"),
                "gpu": item.get("gpu"),
                "bt_ver": to_float(first_nonempty(item.get("bt_ver"), item.get("bluetooth_version"))),

                # Memory / storage
                "ram_gb": to_float(first_nonempty(item.get("ram_gb"), item.get("ram"))),
                "storage_gb": to_float(first_nonempty(item.get("storage_gb"), item.get("storage"))),

                # Display
                "display_in": to_float(first_nonempty(item.get("display_in"), item.get("display_size"))),
                "refresh_hz": to_int(first_nonempty(item.get("refresh_hz"), item.get("refresh_rate"))),
                "ppi": to_int(first_nonempty(item.get("ppi"), item.get("pixel_density"))),
                "display_type": norm_lower(first_nonempty(item.get("display_type"))),

                # Resolution
                "res_w": res_w,
                "res_h": res_h,

                # Battery / charging
                "battery_mah": to_int(first_nonempty(item.get("battery_mah"), item.get("battery"))),
                "charging_w": to_int(first_nonempty(item.get("charging_w"), item.get("charging_speed"))),

                # Camera
                "main_mp": main_mp_num,
                "front_mp": to_int(first_nonempty(item.get("front_mp"), item.get("camera_front_mp"))),
                "camera_main_mp": camera_main_mp_str,
                "has_ois": item.get("has_ois"),

                # Features
                "has_5g": item.get("has_5g"),
                "has_nfc": item.get("has_nfc"),
                "has_fast_charging": item.get("has_fast_charging"),
                "has_wireless_charging": item.get("has_wireless_charging"),
                "has_reverse_wireless_charging": item.get("has_reverse_wireless_charging"),
                "has_stereo_speakers": item.get("has_stereo_speakers"),
                "has_aptx": item.get("has_aptx"),
                "has_ldac": item.get("has_ldac"),

                # Protection / durability
                "glass_type": first_nonempty(
                    item.get("glass_type"),
                    item.get("display_protection"),
                    item.get("front_glass"),
                ),
                "ip_rating": norm_ip(first_nonempty(item.get("ip_rating"), item.get("ip"))),
                "mohs": to_float(item.get("mohs")),

                # Physical
                "weight_g": to_float(first_nonempty(item.get("weight_g"), item.get("weight"))),
                "thickness_mm": to_float(first_nonempty(item.get("thickness_mm"), item.get("thickness"))),

                # Pricing
                "price_sgd": item.get("price_sgd"),
                "price_url": item.get("price_url"),

                # Metadata
                "scraped_at": parse_datetime(item.get("scraped_at")) if item.get("scraped_at") else None,
                "warranty": first_nonempty(item.get("warranty")),
                "android_version": first_nonempty(item.get("android_version")),
            }

            # Upsert by slug
            _, was_created = Phone.objects.update_or_create(slug=slug, defaults=defaults)
            created += int(was_created)
            updated += int(not was_created)

        # Summary output
        self.stdout.write(self.style.SUCCESS(
            f"Phones imported successfully. updated={updated} created={created} skipped={skipped}"
        ))
