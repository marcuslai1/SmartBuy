import json, sys
from pathlib import Path

# Merge two JSON lists by index, attaching price fields into specs
def main(spec_path: Path, price_path: Path, out_path: Path):
    specs  = json.loads(spec_path.read_text(encoding="utf-8"))
    prices = json.loads(price_path.read_text(encoding="utf-8"))

    # Ensure lists are aligned by length
    if len(specs) != len(prices):
        raise ValueError(
            f"List lengths differ: {len(specs)} specs vs {len(prices)} prices"
        )

    # Merge price info into each spec
    for spec, price in zip(specs, prices):
        spec["price_sgd"] = price["price_sgd"]
        spec["price_url"] = price["source_url"]

    # Write merged result
    out_path.write_text(json.dumps(specs, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Merged {len(specs)} items into {out_path.resolve()}")

# CLI entry point
if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python merge_by_index.py <specs.json> <prices.json> <out.json>")
        sys.exit(1)

    main(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]))
