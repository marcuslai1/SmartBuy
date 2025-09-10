import json
from pathlib import Path

DEFAULT_WARRANTY = {
    "xiaomi":   "2",
    "realme":   "2",
    "oppo":     "2",
    "apple":    "1",
    "samsung":  "1",
    "google":   "1",
    "vivo":     "1",
    "honor":    "1",
    "nothing":  "1",
    "oneplus":  "1",
}

def normalize_warranty(w):
    if not w:
        return "Unknown"
    w = str(w).strip().lower().replace("y", "")
    return w if w in {"1", "2"} else "Unknown"

path = Path("final_spec.json")
phones = json.loads(path.read_text())

for phone in phones:
    brand = phone.get("brand", "").lower()
    default = DEFAULT_WARRANTY.get(brand)
    existing = phone.get("warranty")
    phone["warranty"] = normalize_warranty(default or existing)

path.write_text(json.dumps(phones, indent=2))
print("Warranty fields updated in final_spec.json")
