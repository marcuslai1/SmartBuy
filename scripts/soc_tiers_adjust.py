import json
from pathlib import Path

# Load original list
with open("original_chipset_scores.json", "r", encoding="utf-8") as f:
    original = json.load(f)

# Convert to flat dict
score_map = {entry["Chipset"]: entry["Score"] for entry in original}

# Save to new JSON
with open("soc_scores.json", "w", encoding="utf-8") as f:
    json.dump(score_map, f, indent=2, ensure_ascii=False)

print(f"Converted {len(score_map)} entries into soc_scores.json")
