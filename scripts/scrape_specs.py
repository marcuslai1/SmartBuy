import json, time, pathlib, re
from datetime import datetime
from typing import Dict, List

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


URLS = [
    "https://versus.com/en/xiaomi-redmi-13",
    "https://versus.com/en/xiaomi-redmi-a5-4g",
    "https://versus.com/en/xiaomi-redmi-note-14-5g",
    "https://versus.com/en/xiaomi-redmi-note-14-pro-5g-global",
    "https://versus.com/en/xiaomi-redmi-note-14-pro-plus-5g-global",
    "https://versus.com/en/xiaomi-14t",
    "https://versus.com/en/xiaomi-15",
    "https://versus.com/en/xiaomi-15-ultra",
    "https://versus.com/en/apple-iphone-13",
    "https://versus.com/en/apple-iphone-14",
    "https://versus.com/en/apple-iphone-15",
    "https://versus.com/en/apple-iphone-16e",
    "https://versus.com/en/apple-iphone-16",
    "https://versus.com/en/apple-iphone-16-plus",
    "https://versus.com/en/apple-iphone-16-pro",
    "https://versus.com/en/apple-iphone-16-pro-max",
    "https://versus.com/en/samsung-galaxy-a06-5g",
    "https://versus.com/en/samsung-galaxy-a26-5g",
    "https://versus.com/en/samsung-galaxy-a36-5g-256gb-8gb-ram",
    "https://versus.com/en/samsung-galaxy-a56-5g",
    "https://versus.com/en/samsung-galaxy-s24-fe",
    "https://versus.com/en/samsung-galaxy-s24-ultra",
    "https://versus.com/en/samsung-galaxy-s25-plus",
    "https://versus.com/en/samsung-galaxy-s25-ultra",
    "https://versus.com/en/samsung-galaxy-s25",
    "https://versus.com/en/oppo-a18",
    "https://versus.com/en/oppo-a5-pro-global",
    "https://versus.com/en/oppo-reno12-f-5g",
    "https://versus.com/en/oppo-reno11-f",
    "https://versus.com/en/oppo-reno12",
    "https://versus.com/en/oppo-reno12-pro",
    "https://versus.com/en/oppo-reno13-f",
    "https://versus.com/en/oppo-reno13-5g",
    "https://versus.com/en/oppo-find-x8",
    "https://versus.com/en/oppo-find-x8-pro",
    "https://versus.com/en/google-pixel-8a",
    "https://versus.com/en/google-pixel-9a",
    "https://versus.com/en/google-pixel-9",
    "https://versus.com/en/google-pixel-9-pro",
    "https://versus.com/en/google-pixel-9-pro-xl",
    "https://versus.com/en/oneplus-nord-4-256gb-12gb-ram",
    "https://versus.com/en/oneplus-12r",
    "https://versus.com/en/oneplus-13r",
    "https://versus.com/en/oneplus-13",
    "https://versus.com/en/nothing-phone-2a",
    "https://versus.com/en/nothing-phone-2a-plus",
    "https://versus.com/en/vivo-y03",
    "https://versus.com/en/vivo-y28s-5g",
    "https://versus.com/en/vivo-y38-5g",
    "https://versus.com/en/vivo-y29s",
    "https://versus.com/en/vivo-y39-5g",
    "https://versus.com/en/vivo-v40-lite-5g",
    "https://versus.com/en/vivo-v50-lite-5g",
    "https://versus.com/en/vivo-v40-5g",
    "https://versus.com/en/vivo-v50",
    "https://versus.com/en/honor-x6c",
    "https://versus.com/en/honor-x9c-5g",
    "https://versus.com/en/honor-400-lite",
    "https://versus.com/en/honor-400-5g",
    "https://versus.com/en/honor-200-pro",
    "https://versus.com/en/honor-400-pro-5g",
    "https://versus.com/en/honor-magic-6-pro",
    "https://versus.com/en/honor-magic-7-pro",
    "https://versus.com/en/realme-c71",
    "https://versus.com/en/realme-c75x",
    "https://versus.com/en/realme-c75",
    "https://versus.com/en/realme-14x-5g-global",
    "https://versus.com/en/realme-14-5g",
    "https://versus.com/en/realme-13-plus-5g",
    "https://versus.com/en/realme-13-pro-5g",
    "https://versus.com/en/realme-gt-7t",
    "https://versus.com/en/realme-gt-6",
    "https://versus.com/en/realme-gt-7",
]

HEADLESS = True
TIMEOUT = 7
SCROLL_PAD = 0.7

ROW_SEL = "div[class*='Property__property'], div[class*='Property_property']"
LABEL_SELS = [
    "a[class*='Property__propertyLabel']",
    "span[class*='Property__label']",
]
VALUE_SELS = [
    "p[class*='Number__number']",
    "div[class*='Value__value']",
]

IMPORTANT_KEYS = {
    "screen size",
    "resolution",
    "refresh rate",
    "Display type",
    "pixel density",
    "Chipset (SoC) name",
    "GPU name",
    "RAM",
    "internal storage",
    "battery power",
    "charging speed",
    "wireless charging speed",
    "has wireless charging",
    "Supports fast charging",
    "has reverse wireless charging",
    "megapixels (main camera)",
    "megapixels (front camera)",
    "video recording (main camera)",
    "has built-in optical image stabilization",
    "Android version",
    "has 5G support",
    "Wi-Fi version",
    "Bluetooth version",
    "has NFC",
    "USB version",
    "SIM cards",
    "weight",
    "thickness",
    "Ingress Protection (IP) rating",
    "Gorilla Glass version",
    "has stereo speakers",
    "has aptX",
    "has LDAC",
}


# Scraper config
HEADLESS = True
TIMEOUT = 7
SCROLL_PAD = 0.7

# CSS selectors for extracting specs
ROW_SEL = "div[class*='Property__property'], div[class*='Property_property']"
LABEL_SELS = ["a[class*='Property__propertyLabel']", "span[class*='Property__label']"]
VALUE_SELS = ["p[class*='Number__number']", "div[class*='Value__value']"]

# Only keep these keys from the specs table
IMPORTANT_KEYS = {
    "screen size", "resolution", "refresh rate", "Display type", "pixel density",
    "Chipset (SoC) name", "GPU name", "RAM", "internal storage", "battery power",
    "charging speed", "wireless charging speed", "has wireless charging",
    "Supports fast charging", "has reverse wireless charging",
    "megapixels (main camera)", "megapixels (front camera)",
    "video recording (main camera)", "has built-in optical image stabilization",
    "Android version", "has 5G support", "Wi-Fi version", "Bluetooth version",
    "has NFC", "USB version", "SIM cards", "weight", "thickness",
    "Ingress Protection (IP) rating", "Gorilla Glass version",
    "has stereo speakers", "has aptX", "has LDAC",
}

# Helpers to generate safe identifiers
slug = lambda url: re.sub(r"[^0-9A-Za-z._-]", "_", url.rstrip("/").rsplit("/", 1)[-1])
extract_model = lambda url: slug(url).replace("-", " ").title()


def clean_specs(specs: Dict[str, str], model_name: str) -> Dict[str, str]:
    # Keep only important specs and clean values
    cleaned = {}
    for k, v in specs.items():
        if k not in IMPORTANT_KEYS:
            continue
        v = v.replace(model_name, "").strip()
        if "Unknown. Help us" in v:
            continue
        if v in ("✔", "✔️"):
            v = True
        elif v in ("✖", "✖️"):
            v = False
        cleaned[k] = v
    return cleaned


def scrape_one(url: str) -> Dict[str, str]:
    # Launch a browser session
    opts = Options()
    if HEADLESS:
        opts.add_argument("--headless=new")
        opts.add_argument("--disable-gpu")
    opts.add_argument(
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137 Safari/537.36"
    )
    drv = webdriver.Chrome(options=opts)

    try:
        drv.get(url)

        # Open "Specs" tab if available
        try:
            WebDriverWait(drv, 6).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "a[href$='#specs']"))
            ).click()
        except Exception:
            pass

        # Scroll until spec rows appear
        start = time.time()
        while not drv.find_elements(By.CSS_SELECTOR, ROW_SEL):
            drv.execute_script(f"window.scrollBy(0, window.innerHeight*{SCROLL_PAD});")
            time.sleep(0.5)
            if time.time() - start > TIMEOUT:
                raise RuntimeError("Timeout: no spec rows found")

        # Click "Show more" if present
        try:
            drv.find_element(By.XPATH, "//button[contains(.,'Show more')]").click()
            time.sleep(0.4)
        except Exception:
            pass

        # Parse page for spec labels and values
        soup = BeautifulSoup(drv.page_source, "html.parser")
        raw_specs = {}
        for row in soup.select(ROW_SEL):
            label = next((row.select_one(sel) for sel in LABEL_SELS if row.select_one(sel)), None)
            value = next((row.select_one(sel) for sel in VALUE_SELS if row.select_one(sel)), None)
            if label and value:
                raw_specs[label.get_text(strip=True)] = value.get_text(strip=True)

        model = extract_model(url)
        specs = clean_specs(raw_specs, model)

        return {
            "model": model,
            "slug": slug(url),
            "brand": model.split()[0],
            "specs": specs,
            "prices": [],
            "score": None,
            "source_url": url,
            "timestamp": datetime.now().isoformat(),
        }
    finally:
        drv.quit()


def main() -> None:
    # Loop through all URLs and scrape phone specs
    if not URLS:
        print("No URLs defined.")
        return

    phones = []
    for idx, link in enumerate(URLS, 1):
        print(f"[{idx}/{len(URLS)}] Scraping {link}")
        try:
            phone = scrape_one(link)
            phones.append(phone)
            print(f"  ✓ Saved {phone['model']} ({len(phone['specs'])} specs)")
        except Exception as e:
            print(f"  ✗ Failed: {e}")

        # small delay between requests
        if idx != len(URLS):
            time.sleep(1.0)

    # Save scraped results
    pathlib.Path("initial_phone.json").write_text(
        json.dumps(phones, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"\nDone - {len(phones)} phones saved to initial_phone.json")


if __name__ == "__main__":
    main()