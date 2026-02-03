"""
Scoring Configuration for SmartBuy Phone Recommendations

All hardcoded thresholds and weights are centralized here for easy tuning.
This configuration is designed to reflect real-world phone performance more accurately.

Key Design Principles:
1. Camera quality depends heavily on computational photography, not just megapixels
2. Battery life depends on efficiency (SoC, display), not just capacity
3. Premium features like wireless charging add meaningful value
4. Brand-specific software optimization matters for camera and battery
"""

SCORING_CONFIG = {
    # =========================================================================
    # CATEGORY WEIGHTS (Total: 15.0)
    # Adjusted to better reflect real-world importance
    # =========================================================================
    "weights": {
        "soc": 1.75,        # Processor - slightly reduced, most mid-range chips are good enough
        "ram": 1.25,        # Memory - reduced, 8GB is plenty for most users
        "storage": 1.0,     # Storage - unchanged, 128GB minimum is standard
        "display": 1.5,     # Display - unchanged, OLED + 120Hz matters
        "camera": 2.0,      # Camera - increased, most important feature for users
        "battery": 1.5,     # Battery - unchanged, but scoring now includes efficiency
        "charging": 1.0,    # Charging - increased, fast charging is now expected
        "extras": 1.0,      # Extras - 5G, NFC, stereo, wireless charging
        "durability": 1.25, # Durability - slightly reduced
        "protection": 0.75, # IP rating - reduced, many good phones lack it
    },

    # =========================================================================
    # SOC (PROCESSOR) TIERS
    # Smoother curve with more granular tiers
    # Based on real-world benchmarks (Geekbench, AnTuTu)
    # =========================================================================
    "soc_tiers": [
        (9.5, 2.00),  # Flagship+ (Snapdragon 8 Gen 3, A17 Pro, Dimensity 9300)
        (9.0, 1.90),  # Flagship (Snapdragon 8 Gen 2, A16 Bionic)
        (8.5, 1.75),  # High-end (Snapdragon 8+ Gen 1, Dimensity 9200)
        (8.0, 1.60),  # Upper mid-range+ (Snapdragon 8 Gen 1, A15)
        (7.5, 1.45),  # Upper mid-range (Dimensity 8200, Snapdragon 7+ Gen 2)
        (7.0, 1.30),  # Mid-range+ (Snapdragon 7 Gen 3, Dimensity 7200)
        (6.5, 1.15),  # Mid-range (Snapdragon 6 Gen 1, Dimensity 6100)
        (6.0, 1.00),  # Lower mid-range (Helio G99, Snapdragon 695)
        (5.5, 0.85),  # Budget+ (Dimensity 700, Snapdragon 680)
        (5.0, 0.70),  # Budget (Helio G85, Snapdragon 460)
        (4.0, 0.50),  # Entry-level
    ],

    # =========================================================================
    # RAM TIERS
    # More realistic scoring - 8GB is plenty for most users
    # =========================================================================
    "ram_tiers": [
        (24, 2.0),   # 24GB (gaming phones, overkill)
        (16, 1.85),  # 16GB (flagship, future-proof)
        (12, 1.65),  # 12GB (high-end, great multitasking)
        (8, 1.35),   # 8GB (mid-range standard, sufficient for most)
        (6, 0.90),   # 6GB (budget, noticeable limitations)
        (4, 0.50),   # 4GB (entry-level, struggles with modern apps)
    ],

    # =========================================================================
    # STORAGE TIERS
    # =========================================================================
    "storage_tiers": [
        (1024, 2.0),  # 1TB
        (512, 1.75),  # 512GB (flagship standard)
        (256, 1.45),  # 256GB (comfortable for most)
        (128, 1.10),  # 128GB (minimum recommended)
        (64, 0.60),   # 64GB (tight for apps and media)
        (32, 0.30),   # 32GB (very limited)
    ],

    # =========================================================================
    # BATTERY TIERS
    # Based on capacity, but efficiency multiplier is applied in scoring.py
    # =========================================================================
    "battery_tiers": [
        (6500, 2.0),   # 6500+ mAh (endurance champions)
        (6000, 1.85),  # 6000+ mAh
        (5500, 1.70),  # 5500+ mAh
        (5000, 1.50),  # 5000+ mAh (flagship standard)
        (4500, 1.25),  # 4500+ mAh (mid-range standard)
        (4000, 1.00),  # 4000+ mAh
        (3500, 0.75),  # 3500+ mAh (compact phones)
        (3000, 0.50),  # 3000+ mAh (very compact)
    ],

    # =========================================================================
    # CHARGING SPEED TIERS
    # Faster charging is increasingly important
    # =========================================================================
    "charging_tiers": [
        (120, 2.0),   # 120W+ (ultra-fast, full charge in ~20 min)
        (80, 1.80),   # 80W+ (very fast)
        (65, 1.60),   # 65W+ (fast)
        (50, 1.40),   # 50W+ (good)
        (33, 1.15),   # 33W+ (decent)
        (25, 0.90),   # 25W+ (standard fast charging)
        (18, 0.70),   # 18W+ (basic fast charging)
        (15, 0.50),   # 15W (slow)
    ],

    # =========================================================================
    # WIRELESS CHARGING BONUS
    # Added to extras scoring
    # =========================================================================
    "wireless_charging_bonus": 0.4,  # Bonus for having wireless charging
    "reverse_wireless_bonus": 0.1,   # Additional bonus for reverse wireless

    # =========================================================================
    # BRAND CAMERA BIAS - DISABLED
    # Disabled because brand bias is too arbitrary and doesn't account for
    # differences between models within the same brand.
    # Instead, we use SoC-based ISP quality bonus below.
    # =========================================================================
    "brand_camera_bias": {
        "apple": 1.8,
        "google": 1.6,
        "samsung": 1.0,
    },
    "enable_brand_bias": False,  # DISABLED - use ISP quality bonus instead

    # =========================================================================
    # ISP QUALITY BONUS (based on SoC tier)
    # Better SoCs have better Image Signal Processors = better computational
    # photography. This explains why a 108MP budget phone takes worse photos
    # than a 50MP flagship - the ISP processing makes the difference.
    # Scaled down to prevent score inflation above 10.
    # =========================================================================
    "isp_quality_tiers": [
        (9.5, 1.5),   # Flagship+ ISP (A17 Pro, Snapdragon 8 Gen 3) - exceptional
        (9.0, 1.35),  # Flagship ISP (A16, Snapdragon 8 Gen 2)
        (8.5, 1.2),   # High-end ISP (Snapdragon 8+ Gen 1)
        (8.0, 1.05),  # Upper mid-range+ ISP (Snapdragon 8 Gen 1, A15)
        (7.5, 0.9),   # Upper mid-range ISP (Dimensity 8200)
        (7.0, 0.75),  # Mid-range+ ISP (Dimensity 7200, Snapdragon 7 Gen 3)
        (6.5, 0.55),  # Mid-range ISP (Snapdragon 6 Gen 1)
        (6.0, 0.4),   # Lower mid-range ISP (Helio G99)
        (5.5, 0.3),   # Budget+ ISP (Dimensity 700)
        (5.0, 0.2),   # Budget ISP (Helio G85)
        (4.0, 0.1),   # Entry-level ISP - basic processing only
    ],
    "isp_quality_max": 1.5,  # Maximum ISP bonus

    # =========================================================================
    # BATTERY EFFICIENCY MULTIPLIERS
    # Applied based on SoC efficiency tier
    # Accounts for the fact that efficient chips = better battery life
    # =========================================================================
    "efficiency_multipliers": {
        "flagship_efficient": 1.15,   # A-series chips, Tensor, efficient flagships
        "flagship_standard": 1.05,    # Snapdragon flagships
        "midrange_efficient": 1.10,   # Dimensity chips (very efficient)
        "midrange_standard": 1.00,    # Standard midrange
        "budget": 0.95,               # Budget chips (less efficient)
    },

    # =========================================================================
    # VALUE ADJUSTMENT GUARDRAILS
    # Removed bonuses that push scores above 10. Only penalties remain.
    # =========================================================================
    "guardrails": {
        "low_spec_threshold": 5.0,   # Raw score below this triggers penalty
        "low_spec_penalty": 0.85,    # 15% reduction for very low spec phones
        "mid_spec_threshold": 6.0,   # Raw score below this triggers minor penalty
        "mid_spec_penalty": 0.95,    # 5% reduction
    },

    # =========================================================================
    # DISPLAY SCORING PARAMETERS
    # =========================================================================
    "display": {
        "oled_bonus": 0.55,           # AMOLED/OLED panels
        "ltpo_bonus": 0.15,           # LTPO (variable refresh rate)
        "lcd_bonus": 0.25,            # LCD panels
        "hdr_bonus": 0.10,            # HDR10+ or Dolby Vision support
        "refresh_thresholds": [       # (min_hz, points)
            (144, 0.45),              # 144Hz gaming displays
            (120, 0.40),              # 120Hz flagship standard
            (90, 0.30),               # 90Hz mid-range
            (60, 0.15),               # 60Hz budget
        ],
        "resolution_thresholds": [    # (min_width, points) - short side
            (1440, 0.55),             # QHD+
            (1220, 0.45),             # 1.5K
            (1080, 0.35),             # FHD+
            (720, 0.15),              # HD+
        ],
        "ppi_thresholds": [           # (min_ppi, points)
            (500, 0.50),              # Ultra sharp
            (450, 0.45),              # Very sharp
            (400, 0.40),              # Sharp
            (350, 0.30),              # Good
            (300, 0.20),              # Acceptable
        ],
        "brightness_thresholds": [    # (min_nits, points) - peak brightness
            (2000, 0.15),             # Excellent outdoor visibility
            (1500, 0.12),             # Very good
            (1000, 0.08),             # Good
            (800, 0.05),              # Acceptable
        ],
    },

    # =========================================================================
    # CAMERA SCORING PARAMETERS
    # Reduced megapixel weight, increased OIS importance
    # =========================================================================
    "camera": {
        "mp_max_score": 2.0,          # Reduced from 3.0 - MP isn't everything
        "mp_reference": 50.0,         # 50MP = full MP score
        "mp_diminishing": True,       # Apply diminishing returns above 50MP
        "ois_bonus": 1.5,             # Increased - OIS is crucial for photo quality
        "ultrawide_bonus": 0.4,       # Useful ultrawide (12MP+)
        "telephoto_bonus": 0.5,       # Optical telephoto lens
        "selfie_max_bonus": 0.3,      # Front camera quality
        "selfie_reference": 32.0,     # 32MP front = full selfie bonus
        "raw_max": 7.0,               # Cap for raw camera score (before brand bias)
        "video_4k_bonus": 0.2,        # 4K video recording
        "video_8k_bonus": 0.3,        # 8K video recording
    },

    # =========================================================================
    # IP RATING SCORES
    # First digit: Dust (5=protected, 6=tight/sealed)
    # Second digit: Water (0=none, 7=immersion 1m, 8=immersion 1.5m+)
    # IP6X rated higher than IP5X at same water level (dust-tight matters)
    # =========================================================================
    "ip_scores": {
        # IP5X series (dust-protected, not sealed)
        "IP52": 0.20,   # Dripping water
        "IP53": 0.25,   # Spraying water
        "IP54": 0.30,   # Splashing water
        "IP55": 0.40,   # Water jets
        # IP6X series (dust-tight/sealed - better)
        "IP64": 0.50,   # Dust-tight + splashing
        "IP65": 0.60,   # Dust-tight + water jets
        "IP66": 0.70,   # Dust-tight + powerful water jets
        "IP67": 0.82,   # Dust-tight + 1m immersion 30 min
        "IP68": 0.95,   # Dust-tight + 1.5m+ immersion 30 min (flagship standard)
        "IP69": 1.00,   # Dust-tight + high-pressure/steam (industrial grade)
        "UNKNOWN": 0.08,  # No certification - minimal score
    },

    # =========================================================================
    # GLASS DURABILITY BASELINES
    # Updated with latest glass types
    # =========================================================================
    "glass_baselines": [
        ("gorilla armor 2", 1.00),
        ("armor 2", 0.98),
        ("gorilla armor", 0.95),
        ("armor gorilla", 0.95),
        ("victus 2", 0.90),
        ("victus+2", 0.88),
        ("victus + 2", 0.88),
        ("gorilla glass 7i", 0.82),
        ("victus+", 0.80),
        ("gorilla glass victus", 0.78),
        ("victus", 0.75),
        ("ceramic shield", 0.85),      # Apple's ceramic-infused glass
        ("xensation alpha", 0.75),
        ("gorilla glass 6", 0.65),
        ("gorilla glass 5", 0.55),
        ("gorilla glass 3", 0.45),
        ("gorilla", 0.50),
        ("panda glass", 0.48),
        ("panda", 0.46),
        ("asahi dragontrail", 0.50),
        ("dragontrail", 0.48),
        ("asahi", 0.46),
        ("dt-star", 0.46),
        ("shield glass", 0.45),
        ("ceramic guard", 0.45),
        ("nano", 0.42),
    ],
    "unknown_glass_baseline": 0.35,
    "default_glass_baseline": 0.42,

    # =========================================================================
    # MOHS HARDNESS ADJUSTMENTS
    # =========================================================================
    "mohs_deltas": [
        (7.0, 0.20),   # Exceptional scratch resistance
        (6.5, 0.15),   # Very scratch resistant
        (6.0, 0.10),
        (5.5, 0.05),
        (5.0, 0.02),
        (4.5, 0.00),   # Average
        (4.0, -0.03),  # Below average
    ],
    "mohs_minimum_delta": -0.10,  # For very soft screens

    # =========================================================================
    # EXTRAS SCORING
    # Rebalanced for more even distribution - no single feature dominates
    # Total possible: ~3.0 (normalized against weight)
    # =========================================================================
    "extras": {
        "5g_bonus": 0.65,             # 5G connectivity - important but not dominant
        "mmwave_bonus": 0.15,         # mmWave 5G (mainly US carriers, niche)
        "nfc_bonus": 0.45,            # NFC for payments - very useful
        "stereo_bonus": 0.45,         # Stereo speakers - noticeable improvement
        "wireless_charging": 0.40,    # Qi wireless charging - convenient
        "reverse_wireless": 0.10,     # Reverse wireless charging - niche
        "ir_blaster": 0.10,           # IR blaster - niche but handy
        "sd_card": 0.35,              # MicroSD expansion - valuable for many users
        "headphone_jack": 0.30,       # 3.5mm jack - still valued by many
        "notification_led": 0.05,     # LED notification - minor convenience
    },
}
