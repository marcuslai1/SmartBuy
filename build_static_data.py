#!/usr/bin/env python3
"""
Build Static Phone Data for GitHub Pages Deployment

This script:
1. Loads all phones from data/after_warranty_spec.json
2. Calculates scores for each phone using the scoring algorithm
3. Exports a JSON file to smartbuy-frontend/public/phones.json

Run this script before deploying to GitHub Pages:
    python build_static_data.py
"""

import json
import os
import sys

# Add the project root to path so we can import the scoring module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from phones.scoring import calculate_smartbuy_score


def load_phones(input_path: str) -> list:
    """Load phones from JSON file."""
    with open(input_path, "r", encoding="utf-8") as f:
        return json.load(f)


def calculate_scores_for_phone(phone: dict) -> dict:
    """Calculate all scores for a phone and add them to the dict."""
    smartbuy_score, raw_score, breakdown = calculate_smartbuy_score(phone)

    return {
        **phone,
        "smartbuy_score": round(smartbuy_score, 2),
        "raw_score": round(raw_score, 2),
        "breakdown": {k: round(v, 2) for k, v in breakdown.items()},
    }


def categorize_mode(phone: dict) -> str:
    """Categorize phone into budget/midrange/flagship based on price."""
    price = phone.get("price_sgd", 0) or 0
    if price <= 400:
        return "budget"
    elif price <= 800:
        return "midrange"
    else:
        return "flagship"


def build_static_data(input_path: str, output_path: str):
    """Build static phone data with pre-calculated scores."""
    print(f"Loading phones from {input_path}...")
    phones = load_phones(input_path)
    print(f"Loaded {len(phones)} phones")

    print("Calculating scores...")
    scored_phones = []
    for i, phone in enumerate(phones):
        try:
            scored = calculate_scores_for_phone(phone)
            scored["mode_category"] = categorize_mode(phone)
            scored_phones.append(scored)
        except Exception as e:
            print(f"  Warning: Failed to score {phone.get('model', 'unknown')}: {e}")

    print(f"Successfully scored {len(scored_phones)} phones")

    # Sort by smartbuy_score descending
    scored_phones.sort(key=lambda p: p.get("smartbuy_score", 0), reverse=True)

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Write output
    print(f"Writing to {output_path}...")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(scored_phones, f, indent=2, ensure_ascii=False)

    # Print summary stats
    print("\n--- Summary ---")
    print(f"Total phones: {len(scored_phones)}")

    budget = [p for p in scored_phones if p["mode_category"] == "budget"]
    midrange = [p for p in scored_phones if p["mode_category"] == "midrange"]
    flagship = [p for p in scored_phones if p["mode_category"] == "flagship"]

    print(f"Budget (<=$400): {len(budget)}")
    print(f"Midrange ($401-$800): {len(midrange)}")
    print(f"Flagship (>$800): {len(flagship)}")

    if scored_phones:
        top = scored_phones[0]
        print(f"\nTop SmartBuy pick: {top['model']} (Score: {top['smartbuy_score']}, Price: ${top['price_sgd']})")

    print(f"\nOutput saved to: {output_path}")
    print("Done!")


if __name__ == "__main__":
    # Paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(script_dir, "data", "after_warranty_spec.json")
    output_path = os.path.join(script_dir, "smartbuy-frontend", "public", "phones.json")

    # Check input exists
    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        sys.exit(1)

    build_static_data(input_path, output_path)
