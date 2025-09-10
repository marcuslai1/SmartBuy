from django.db import models


class Phone(models.Model):
    # Basic identity fields
    model = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    brand = models.CharField(max_length=100)
    source_url = models.URLField()

    # Warranty info (e.g. "1", "2", "Unknown")
    warranty = models.CharField(max_length=10, default="Unknown")

    # Core specs
    chipset = models.CharField(max_length=100, null=True, blank=True)
    gpu = models.CharField(max_length=100, null=True, blank=True)
    soc_score = models.IntegerField(null=True, blank=True)

    ram_gb = models.FloatField(null=True, blank=True)
    storage_gb = models.FloatField(null=True, blank=True)

    battery_mah = models.IntegerField(null=True, blank=True)
    display_in = models.FloatField(null=True, blank=True)
    refresh_hz = models.IntegerField(null=True, blank=True)
    ppi = models.IntegerField(null=True, blank=True)
    display_type = models.CharField(max_length=32, null=True, blank=True)  

    charging_w = models.IntegerField(null=True, blank=True)

    main_mp = models.IntegerField(null=True, blank=True)
    front_mp = models.IntegerField(null=True, blank=True)
    # Used when multiple camera sensors are listed 
    camera_main_mp = models.CharField(max_length=128, null=True, blank=True)

    res_w = models.IntegerField(null=True, blank=True)
    res_h = models.IntegerField(null=True, blank=True)
    bt_ver = models.FloatField(null=True, blank=True)

    # Physical dimensions
    weight_g = models.FloatField(null=True, blank=True)
    thickness_mm = models.FloatField(null=True, blank=True)

    # Features and connectivity
    has_nfc = models.BooleanField(null=True)
    has_fast_charging = models.BooleanField(null=True)
    has_5g = models.BooleanField(null=True)
    has_wireless_charging = models.BooleanField(null=True)
    has_reverse_wireless_charging = models.BooleanField(null=True)
    has_ois = models.BooleanField(null=True)
    has_stereo_speakers = models.BooleanField(null=True)
    has_aptx = models.BooleanField(null=True)
    has_ldac = models.BooleanField(null=True)

    # Protection / durability
    glass_type = models.CharField(max_length=128, null=True, blank=True) 
    ip_rating = models.CharField(max_length=32, null=True, blank=True)   
    mohs = models.FloatField(null=True, blank=True)                      

    # Pricing info
    price_sgd = models.DecimalField(max_digits=10, decimal_places=2)
    price_url = models.URLField()

    # Metadata / scraping info
    scraped_at = models.DateTimeField()
    android_version = models.CharField(max_length=32, null=True, blank=True)

    def __str__(self) -> str:
        return f"{self.brand} {self.model} ({self.slug})"
