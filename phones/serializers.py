from rest_framework import serializers
from .models import Phone


class PhoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Phone
        fields = [
            # Identity & metadata
            "model", "slug", "brand", "source_url", "warranty", "scraped_at",

            # Pricing
            "price_sgd", "price_url",

            # SoC / platform
            "soc_score", "chipset", "gpu", "bt_ver",

            # Memory / storage
            "ram_gb", "storage_gb",

            # Display
            "display_in", "refresh_hz", "ppi", "res_w", "res_h", "display_type",


            # Battery / charging
            "battery_mah", "charging_w",

            # Camera
            "main_mp", "camera_main_mp", "front_mp", "has_ois",

            # Connectivity / extras
            "has_5g", "has_nfc", "has_fast_charging",
            "has_wireless_charging", "has_reverse_wireless_charging",
            "has_stereo_speakers", "has_aptx", "has_ldac",

            # Durability / protection
            "glass_type", "mohs", "ip_rating",
        ]
