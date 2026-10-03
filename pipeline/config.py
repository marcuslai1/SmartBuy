"""All scoring knobs in one place. Every category is scored 0-10 and every
category can actually reach 10 with real phones (the old engine capped camera
at ~8.1 and extras at 6.5 because some inputs never existed in the data).
"""

CATEGORIES = [
    ("performance", "Performance"),
    ("camera", "Camera"),
    ("battery", "Battery life"),
    ("display", "Display"),
    ("charging", "Charging"),
    ("build", "Build & durability"),
    ("memory", "RAM & storage speed"),
    ("software", "Software support"),
    ("extras", "Features"),
]

# Priority presets: category weights (normalised at use, so only ratios matter)
PRESETS = {
    "balanced": {
        "label": "Balanced",
        "blurb": "A bit of everything, weighted the way most people use a phone.",
        "weights": {"performance": 1.5, "camera": 2.0, "battery": 2.0, "display": 1.5, "charging": 0.75,
                    "build": 1.0, "memory": 1.0, "software": 1.0, "extras": 0.75},
    },
    "camera": {
        "label": "Camera first",
        "blurb": "Photos and video above all else.",
        "weights": {"performance": 1.0, "camera": 5.0, "battery": 1.5, "display": 1.25, "charging": 0.5,
                    "build": 0.75, "memory": 1.0, "software": 0.75, "extras": 0.5},
    },
    "battery": {
        "label": "Battery first",
        "blurb": "Lasts longest and tops up fastest.",
        "weights": {"performance": 1.0, "camera": 1.25, "battery": 5.0, "display": 1.0, "charging": 2.0,
                    "build": 0.75, "memory": 0.75, "software": 0.75, "extras": 0.5},
    },
    "performance": {
        "label": "Performance",
        "blurb": "Gaming and heavy apps: speed, smooth screen, plenty of RAM.",
        "weights": {"performance": 5.0, "camera": 1.0, "battery": 1.75, "display": 2.0, "charging": 1.0,
                    "build": 0.5, "memory": 2.0, "software": 0.75, "extras": 0.5},
    },
    "longevity": {
        "label": "Keep it for years",
        "blurb": "Long software support, tough build, good battery.",
        "weights": {"performance": 1.5, "camera": 1.0, "battery": 2.0, "display": 1.0, "charging": 0.5,
                    "build": 2.5, "memory": 1.5, "software": 4.0, "extras": 0.5},
    },
}

# Price brackets only label the chart; value is judged on one curve
TIERS = [("budget", 0, 400), ("midrange", 400, 800), ("flagship", 800, 10**9)]

# ---------------------------------------------------------------- performance
# CPU: GeekBench 6 multi-core, log-scaled. ~1200 = Helio G85 class, ~11000 = 2026 flagship
PERF_GB6_LO, PERF_GB6_HI = 1200, 11000
# GPU: sustained 3DMark Wild Life Extreme = peak score x stress-test stability (the
# share of peak a phone keeps under load, from Notebookcheck; see labs.py), log-scaled.
# ~200 = Helio G81 class, ~5500 = best sustained result on sale in 2026
PERF_GPU_LO, PERF_GPU_HI = 200, 5500
PERF_GPU_SHARE = 0.5  # performance = CPU and GPU halves (CPU only when no GPU figure exists)
STABILITY_FLAG_BELOW = 0.9  # flag a borrowed stability as an estimate only when it matters
# A lab result more than this far from the median of other phones on the same chip
# (at least two of them) is treated as a bad run and replaced by that median
LAB_OUTLIER = 0.25

# ---------------------------------------------------------------- camera
CAMERA = {
    "main_sensor_max": 4.0,          # 1" type main sensor
    "main_sensor_lo_in": 0.33,       # 1/3" type and below = 0
    "main_sensor_hi_in": 1.0,
    "main_ois": 1.0,
    "tele_base": 1.0,                # any optical telephoto (>= 2x)
    "tele_zoom_max": 1.0,            # 2x -> 0, 5x+ -> full
    "tele_sensor_max": 0.5,          # big periscope sensors (>= 1/2")
    "uw_base": 0.6,
    "uw_hires": 0.4,                 # >= 48 MP ultrawide (sharper, doubles as macro)
    "video_4k60": 0.8,
    "video_8k": 0.2,
    "video_4k30": 0.4,
    "selfie_max": 0.5,               # >= 32 MP
}

# Lab camera results (DXOMARK, see labs.py)
CAMERA_LAB_WEIGHT = 0.5        # a tested phone moves this far from its hardware score to its lab result
CAMERA_SHARE = 0.5             # share passed to a relative that isn't an exact camera-and-chip twin
CAMERA_LAB_MIN_FIT = 8         # phones needed to put a DXOMARK protocol version on our scale
TWIN_SENSOR_TOL = 0.03         # main sensors within 3% count as the same sensor
CAMERA_PIPELINE_BRANDS = ("Apple", "Google")   # one processing pipeline across the range

# ---------------------------------------------------------------- battery
# GSMArena "Active use score" hours, log-scaled so each extra hour counts a bit
# less than the one before: 9h = 0, 12h = 2.8, 16h = 5.6, 20h = 7.8, 25h = 10
# (~25h = the longest-lasting phones on sale in 2026)
BATTERY_H_LO, BATTERY_H_HI = 9.0, 25.0

# ---------------------------------------------------------------- display
DISPLAY = {
    "oled": 3.0, "lcd": 1.0,
    "refresh": [(144, 1.5), (120, 1.3), (90, 0.8), (0, 0.0)],
    "ltpo": 0.5,
    "hdr": 0.5,
    "brightness_max": 2.5, "nits_lo": 500, "nits_hi": 1800,   # measured nits
    "claimed_peak_factor": 0.6,      # claimed 'peak' nits overstate real brightness
    "sharp_max": 1.5, "ppi_lo": 300, "ppi_hi": 460,
    "hires_short_side": 1200, "hires": 0.5,
}

# ---------------------------------------------------------------- charging
CHARGING = {
    "wired_max": 7.0, "w_lo": 15, "w_hi": 120,     # log-scaled watts; 120W = the fastest on sale
    "wireless": [(50, 2.5), (25, 2.0), (15, 1.5), (0.1, 1.0)],
    "reverse_wireless": 0.5,
}

# ---------------------------------------------------------------- build
IP_POINTS = {"IP69": 4.5, "IP68": 4.0, "IP67": 3.2, "IP66": 2.4, "IP65": 2.2, "IP64": 1.8,
             "IP55": 1.2, "IP54": 1.0, "IP53": 0.6, "IP52": 0.5}
# (substring, points) first match wins; checked lowercase
GLASS_TIERS = [
    ("armor 2", 3.0), ("ceramic shield 2", 3.0), ("victus 3", 3.0), ("kunlun", 3.0), ("dragon crystal", 2.8),
    ("victus 2", 2.7), ("gorilla armor", 2.8), ("ceramic shield", 2.6), ("victus+", 2.5), ("victus", 2.4),
    ("armorshell", 2.2), ("nanocrystal", 2.2), ("shield glass", 2.0), ("7i", 2.0), ("dt-star", 1.8),
    ("gorilla glass 6", 1.8), ("gorilla glass 5", 1.6), ("xensation", 1.6), ("schott", 1.5),
    ("gorilla glass 3", 1.2), ("panda", 1.2), ("dragontrail", 1.2), ("gorilla glass", 1.4),
]
GLASS_UNKNOWN = 0.8
FRAME_POINTS = {"titanium": 1.5, "stainless steel": 1.5, "aluminum": 1.2, "plastic": 0.4}
FRAME_UNKNOWN = 0.8
FREE_FALL_POINTS = {"A": 1.0, "B": 0.7, "C": 0.4, "D": 0.2, "E": 0.1}
FREE_FALL_UNKNOWN = 0.5
# Battery lifespan: EU-label charge cycles to 80% capacity. Build = 85% the physical
# points above + up to 1.5 for cycles (800 = EU minimum -> 0, 2000 -> 1.5)
BUILD_PHYSICAL_SHARE = 0.85
CYCLES_MAX, CYCLES_LO, CYCLES_HI = 1.5, 800, 2000
CYCLES_UNKNOWN = 1000          # the most common label value

# ---------------------------------------------------------------- memory
# Storage size isn't scored: it's a need the buyer picks (STORAGE_NEEDS below) and every
# phone is priced at its cheapest variant with at least that much. This category is the
# RAM and storage speed of that variant (0-1 each, interpolated).
RAM_POINTS = [(16, 1.0), (12, 0.84), (8, 0.6), (6, 0.3), (4, 0.1), (0, 0.0)]
MEMORY_RAM_SHARE = 0.7         # the rest is storage speed
STORAGE_SPEED = [("NVMe", 1.0), ("UFS 4", 1.0), ("UFS 3", 0.67), ("UFS 2", 0.27), ("eMMC", 0.0)]
STORAGE_SPEED_UNKNOWN = 0.27   # sheets that don't say are almost all budget phones

# ---------------------------------------------------------------- storage needs
# The site's storage choice: phones are priced at their cheapest variant with at least
# this much (0 = any size, the cheapest listing). Ranked phones in data/ use the default.
STORAGE_NEEDS = [0, 128, 256, 512]
STORAGE_NEED_DEFAULT = 128
# A size the phone comes in (per GSMArena) that no store lists is priced from the next
# size down: each doubling adds STORAGE_STEP_SHARE of the price, at least STORAGE_STEP_MIN.
# Store prices seen: Apple +S$300 a step (14-32%), Samsung ~13%, Xiaomi +10% and +S$80.
STORAGE_STEP_SHARE = 0.15
STORAGE_STEP_MIN = 50

# ---------------------------------------------------------------- software
# Years of major OS upgrades still to come: promised years minus time since
# release (as of the price date). GSMArena states the promise for most Android
# phones; otherwise it's taken from the closest same-series phone, then these
# brand defaults (Apple doesn't publish a number, 6 matches its recent track record).
OS_UPDATES_DEFAULT = {"Apple": 6, "Google": 7, "Samsung": 4, "OnePlus": 4, "Nothing": 3, "Xiaomi": 3,
                      "OPPO": 3, "vivo": 3, "Honor": 3, "realme": 2}
OS_UPDATES_MAX = 7

# ---------------------------------------------------------------- extras
EXTRAS = {"has_5g": 2.0, "nfc": 2.0, "stereo": 1.5, "esim": 1.0, "jack": 1.0, "uwb": 0.5, "ir": 0.5,
          "secure_unlock": 0.5}   # ultrasonic fingerprint or 3D face unlock

# 10/10 should mean "best on sale". The build warns when this many ranked phones
# share a 10 in one category: its top anchor needs raising.
SATURATION_WARN = 3

# ---------------------------------------------------------------- best buys
# A phone is a best buy when nothing that costs the same or less scores higher (it sits
# on the price ladder). Specs, prices and priorities are uncertain, so the site redraws
# the ladder UNCERTAINTY_DRAWS times (below) and calls a phone a "Best buy" if it's on
# it in at least BEST_BUY_SURE of the draws, a "Close call" from BEST_BUY_CLOSE.
BEST_BUY_SURE = 0.5
BEST_BUY_CLOSE = 0.2

# ---------------------------------------------------------------- uncertainty
# Each draw scales every category weight by up to +-WEIGHT_WOBBLE, every price by up to
# +-PRICE_WOBBLE (the median sale discount seen; plus EST_PRICE_WOBBLE per estimated
# storage step) and nudges each estimated category score by a normal error with these
# standard deviations (score points). The site runs the draws in the browser
# (smartbuy-frontend/src/lib/engine.js) from these values, exported in phones.json.
UNCERTAINTY_DRAWS = 400
WEIGHT_WOBBLE = 0.3
PRICE_WOBBLE = 0.08
EST_PRICE_WOBBLE = 0.08
ESTIMATE_NOISE = {
    "performance": 0.6,   # borrowed / estimated benchmarks
    "battery": 1.0,       # EU-label or capacity estimate: median miss ~1.5h = ~1 point mid-range
    "camera": 0.4,        # assumed main sensor size
    "display": 0.6,       # claimed rather than measured brightness
    "build": 0.5,         # glass / frame / drop class / cycles not published
    "memory": 0.4,        # storage type not published
    "software": 1.7,      # update policy not stated: +-1 year
}

# ---------------------------------------------------------------- prices
# Value is judged at the typical price: median of the cheapest offer per crawl in this window
TYPICAL_WINDOW_DAYS = 90
# Rough FX for sanity-checking store prices against GSMArena's USD/EUR street price
FX_TO_SGD = {"$": 1.30, "€": 1.50, "£": 1.72}
PRICE_SANITY = (0.45, 4.0)   # accept if reference*lo <= price <= reference*hi (fakes are cheap; big storage tiers aren't)
LISTING_REJECT = r"\b(bundle|demo|display set|refurb|pre-?owned|used|care\+|\+ ?buds|\+ ?watch|\+ ?case|trade-?in)\b"
