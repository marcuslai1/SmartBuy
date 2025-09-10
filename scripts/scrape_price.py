import json
import re
import time
from pathlib import Path
from typing import List, Dict, Optional

from bs4 import BeautifulSoup 
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# List of Lazada SG product URLs to scrape
URLS: List[str] = [
    "https://www.lazada.sg/products/pdp-i3297702480-s22144609541.html",
    "https://www.lazada.sg/products/pdp-i3423315653.html",
    "https://www.lazada.sg/products/pdp-i3319676929.html",
    "https://www.lazada.sg/products/pdp-i3319745633.html",
    "https://www.lazada.sg/products/pdp-i3319671884.html",
    "https://www.lazada.sg/products/pdp-i3297532896.html",
    "https://www.lazada.sg/products/pdp-i3369065378.html",
    "https://www.lazada.sg/products/pdp-i3369149072.html",
    "https://www.lazada.sg/products/pdp-i1987602883.html",
    "https://www.lazada.sg/products/pdp-i2462589004.html",
    "https://www.lazada.sg/products/pdp-i2881998799.html",
    "https://www.lazada.sg/products/pdp-i3372113250.html",
    "https://www.lazada.sg/products/pdp-i3177179138.html",
    "https://www.lazada.sg/products/pdp-i3177087566.html",
    "https://www.lazada.sg/products/pdp-i3177066417.html",
    "https://www.lazada.sg/products/pdp-i3177041293.html",
    "https://www.lazada.sg/products/pdp-i3395547747.html",
    "https://www.lazada.sg/products/pdp-i3395467856.html",
    "https://www.lazada.sg/products/pdp-i3395463837.html",
    "https://www.lazada.sg/products/pdp-i3395640499.html",
    "https://www.lazada.sg/products/pdp-i3183308663.html",
    "https://www.lazada.sg/products/pdp-i2970781093.html",
    "https://www.lazada.sg/products/pdp-i3321625696.html",
    "https://www.lazada.sg/products/pdp-i3321630575.html",
    "https://www.lazada.sg/products/pdp-i3321924025.html",
    "https://www.lazada.sg/products/pdp-i2937530578.html",
    "https://www.lazada.sg/products/pdp-i3405815345.html",
    "https://www.lazada.sg/products/pdp-i2951186999.html",
    "https://www.lazada.sg/products/pdp-i3023449510.html",
    "https://www.lazada.sg/products/pdp-i3075609069.html",
    "https://www.lazada.sg/products/pdp-i3075476351.html",
    "https://www.lazada.sg/products/pdp-i3394303255.html",
    "https://www.lazada.sg/products/pdp-i3296475684.html",
    "https://www.lazada.sg/products/pdp-i3229017701.html",
    "https://www.lazada.sg/products/pdp-i3229017688.html",
    "https://www.lazada.sg/products/pdp-i3053280196.html",
    "https://www.lazada.sg/products/pdp-i3397270024.html",
    "https://www.lazada.sg/products/pdp-i3136280608.html",
    "https://www.lazada.sg/products/pdp-i3214726481.html",
    "https://www.lazada.sg/products/pdp-i3116257116.html",
    "https://www.lazada.sg/products/pdp-i3124212649-s21261899804.html",
    "https://www.lazada.sg/products/pdp-i3007376044.html",
    "https://www.lazada.sg/products/pdp-i3318575960.html",
    "https://www.lazada.sg/products/pdp-i3318646528.html",
    "https://www.lazada.sg/products/pdp-i3016178168.html",
    "https://www.lazada.sg/products/pdp-i3148865628-s21440338865.html",
    "https://www.lazada.sg/products/pdp-i3031925860-s21208958636.html",
    "https://www.lazada.sg/products/pdp-i3261670077.html",
    "https://www.lazada.sg/products/pdp-i3095664108.html",
    "https://www.lazada.sg/products/pdp-i2882223012.html",
    "https://www.lazada.sg/products/pdp-i359518387.html",
    "https://www.lazada.sg/products/pdp-i3208574634.html",
    "https://www.lazada.sg/products/pdp-i3403540947.html",
    "https://www.lazada.sg/products/pdp-i3181796214.html",
    "https://www.lazada.sg/products/pdp-i3362073853.html",
    "https://www.lazada.sg/products/pdp-i3475820378.html",
    "https://www.lazada.sg/products/pdp-i3218914062.html",
    "https://www.lazada.sg/products/pdp-i3436896040.html",
    "https://www.lazada.sg/products/pdp-i3452113118.html",
    "https://www.lazada.sg/products/pdp-i3116435429.html",
    "https://www.lazada.sg/products/pdp-i3452034426.html",
    "https://www.lazada.sg/products/pdp-i3028973719.html",
    "https://www.lazada.sg/products/pdp-i3321859318.html",
    "https://www.lazada.sg/products/pdp-i3474300478.html",
    "https://www.lazada.sg/products/pdp-i3098891605.html",
    "https://www.lazada.sg/products/pdp-i3300548438.html",
    "https://www.lazada.sg/products/pdp-i3361954892.html",
    "https://www.lazada.sg/products/pdp-i3445412935.html",
    "https://www.lazada.sg/products/pdp-i3208006828.html",
    "https://www.lazada.sg/products/pdp-i3153935031.html",
    "https://www.lazada.sg/products/pdp-i3464090740.html",
    "https://www.lazada.sg/products/pdp-i3076055073.html",
    "https://www.lazada.sg/products/pdp-i3464286083.html",
]
    
# Scraper settings
TIMEOUT_SEC = 8
OUT_FILE = Path("lazada_prices.json")


def launch_driver() -> webdriver.Chrome:
    # Configure Chrome for stable scraping
    opts = Options()
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--disable-logging")
    opts.add_argument("--log-level=3")
    opts.add_argument("--window-size=1920,1080")
    opts.add_argument("--lang=en-SG")
    return webdriver.Chrome(options=opts)


# Fallback regex for price detection inside HTML
JSON_PRICE_RE = re.compile(r'"price"\s*:\s*"([\d.]+)"')


def scrape_page(driver: webdriver.Chrome, url: str) -> Dict[str, Optional[str]]:
    # Try multiple strategies to extract price and product name
    driver.get(url)
    price_raw = None

    # Directly read visible price span
    try:
        WebDriverWait(driver, TIMEOUT_SEC).until(
            EC.text_to_be_present_in_element((By.CSS_SELECTOR, "span.pdp-price"), "$")
        )
        price_raw = driver.find_element(By.CSS_SELECTOR, "span.pdp-price").text
    except Exception:
        pass

    # Parse JSON-LD structured metadata
    if not price_raw:
        soup = BeautifulSoup(driver.page_source, "lxml")
        ld = soup.find("script", type="application/ld+json")
        if ld and ld.string:
            try:
                data = json.loads(ld.string)
                if isinstance(data, dict):
                    price_raw = data.get("offers", {}).get("price")
                elif isinstance(data, list):
                    for d in data:
                        price_raw = d.get("offers", {}).get("price")
                        if price_raw:
                            break
            except json.JSONDecodeError:
                pass

    # Regex fallback
    if not price_raw:
        m = JSON_PRICE_RE.search(driver.page_source)
        price_raw = m.group(1) if m else None

    # Extract product name
    try:
        name = driver.find_element(By.CSS_SELECTOR, "h1.pdp-mod-product-badge-title").text.strip()
    except Exception:
        og = BeautifulSoup(driver.page_source, "lxml").find("meta", property="og:title")
        name = og["content"].split("|")[0].strip() if og else None

    # Clean price string to float
    try:
        price_sgd = float(price_raw.replace("$", "").replace(",", "")) if price_raw else None
    except ValueError:
        price_sgd = None

    return {"name": name, "price_sgd": price_sgd, "source_url": url}


def main() -> None:
    # Loop through URLs, scrape data, save to JSON
    if not URLS:
        print("Add at least one Lazada URL to scrape.")
        return

    results: List[Dict[str, Optional[str]]] = []
    driver = launch_driver()

    try:
        for idx, url in enumerate(URLS, 1):
            print(f"[{idx}/{len(URLS)}] {url} … ", end="", flush=True)
            data = scrape_page(driver, url)
            print("Success" if data["price_sgd"] else "Failed")
            results.append(data)
            if idx != len(URLS):
                # short delay between requests
                time.sleep(1.0)  
    finally:
        driver.quit()

    # Save results to file
    print(json.dumps(results, indent=2, ensure_ascii=False))
    OUT_FILE.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nSaved to {OUT_FILE.resolve()}")


if __name__ == "__main__":
    main()