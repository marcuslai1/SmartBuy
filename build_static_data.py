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


def normalize_value_within_tiers(phones: list) -> list:
    """
    Normalize value scores to 0-10 within each price tier.

    This ensures phones are compared fairly within their bracket:
    - Best value in budget tier = 10
    - Best value in flagship tier = 10
    - Worst value in each tier approaches 0
    """
    # Group by tier
    tiers = {"budget": [], "midrange": [], "flagship": []}
    for phone in phones:
        tier = phone.get("mode_category", "budget")
        tiers[tier].append(phone)

    print("\nNormalizing value scores by tier...")

    for tier_name, tier_phones in tiers.items():
        if not tier_phones:
            continue

        if len(tier_phones) == 1:
            # Only one phone in tier - give it a good score
            tier_phones[0]["value_score"] = 7.5
            continue

        # Get raw value ratios (raw_score / price) for this tier
        # Higher ratio = better value
        raw_values = [p["smartbuy_score"] for p in tier_phones]
        min_val = min(raw_values)
        max_val = max(raw_values)

        if max_val == min_val:
            # All same value - give neutral scores
            for p in tier_phones:
                p["value_score"] = 5.0
        else:
            # Normalize to 0-10 scale
            # Best value = 10, worst value = 1 (not 0, to avoid harsh "0" display)
            for p in tier_phones:
                raw = p["smartbuy_score"]
                # Linear interpolation from 1 to 10
                normalized = 1.0 + ((raw - min_val) / (max_val - min_val)) * 9.0
                p["value_score"] = round(normalized, 1)

        # Stats for this tier
        values = [p["value_score"] for p in tier_phones]
        print(f"  {tier_name.capitalize()}: {len(tier_phones)} phones, "
              f"value range {min(values):.1f} - {max(values):.1f}")

    return phones


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

    # Normalize value scores within each tier (0-10 scale)
    scored_phones = normalize_value_within_tiers(scored_phones)

    # Sort by value_score descending (within their tier context)
    scored_phones.sort(key=lambda p: p.get("value_score", 0), reverse=True)

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

    # Show top pick in each tier
    print("\n--- Top Value Picks by Tier ---")
    for tier_name, tier_phones in [("Budget", budget), ("Midrange", midrange), ("Flagship", flagship)]:
        if tier_phones:
            # Sort by value_score to find the best in this tier
            top = max(tier_phones, key=lambda p: p.get("value_score", 0))
            print(f"{tier_name}: {top['model']} "
                  f"(Value: {top['value_score']}/10, Raw: {top['raw_score']}/10, ${top['price_sgd']})")

    print(f"\nOutput saved to: {output_path}")
    print("Done!")


if __name__ == "__main__":
    # Paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(script_dir, "data", "final_spec.json")
    output_path = os.path.join(script_dir, "smartbuy-frontend", "public", "phones.json")

    # Check input exists
    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        sys.exit(1)

    build_static_data(input_path, output_path)
