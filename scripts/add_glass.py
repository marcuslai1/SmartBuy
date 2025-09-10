from __future__ import annotations
import json, pathlib, shutil

# Input, output, and backup file paths
IN_PATH  = pathlib.Path("final_spec.json")
OUT_PATH = pathlib.Path("final_spec.json")
BAK_PATH = pathlib.Path("after_warranty_spec.json")

# Normalized glass durability dataset matches order of phones in final_spec.json
GLASS_DATA = [
    {"glass_type": "Corning Gorilla Glass", "mohs": None},
    {"glass_type": "unknown", "mohs": 5},
    {"glass_type": "Corning Gorilla Glass 5", "mohs": None},
    {"glass_type": "Corning Gorilla Glass Victus 2", "mohs": None},
    {"glass_type": "Corning Gorilla Glass Victus 2", "mohs": None},
    {"glass_type": "Corning Gorilla Glass 5", "mohs": None},
    {"glass_type": "Corning Gorilla Glass 5", "mohs": None},
    {"glass_type": "Xiaomi Shield Glass 2.0", "mohs": 6},
    {"glass_type": "Ceramic Shield", "mohs": None},
    {"glass_type": "Ceramic Shield", "mohs": None},
    {"glass_type": "Ceramic Shield", "mohs": None},
    {"glass_type": "Ceramic Shield", "mohs": None},
    {"glass_type": "Ceramic Shield", "mohs": None},
    {"glass_type": "Ceramic Shield", "mohs": None},
    {"glass_type": "Ceramic Shield", "mohs": None},
    {"glass_type": "Ceramic Shield", "mohs": None},
    {"glass_type": "unknown", "mohs": None},
    {"glass_type": "Corning Gorilla Glass Victus+", "mohs": 5},
    {"glass_type": "Corning Gorilla Glass Victus+", "mohs": 5},
    {"glass_type": "Corning Gorilla Glass Victus+", "mohs": 5},
    {"glass_type": "Corning Gorilla Glass Victus+", "mohs": 5},
    {"glass_type": "Corning Gorilla Armor", "mohs": None},
    {"glass_type": "Corning Gorilla Glass Victus 2", "mohs": 5},
    {"glass_type": "Corning Gorilla Armor 2", "mohs": 6},
    {"glass_type": "Corning Gorilla Glass Victus 2", "mohs": 5},
    {"glass_type": "unknown", "mohs": None},
    {"glass_type": "Corning Gorilla Glass 7i", "mohs": 4},
    {"glass_type": "Asahi Glass AGC DT-Star2", "mohs": None},
    {"glass_type": "Panda glass", "mohs": None},
    {"glass_type": "Corning Gorilla Glass 7i", "mohs": None},
    {"glass_type": "Corning Gorilla Glass Victus 2", "mohs": None},
    {"glass_type": "Asahi Glass AGC DT-Star2", "mohs": 4},
    {"glass_type": "Corning Gorilla Glass 7i", "mohs": 4},
    {"glass_type": "Corning Gorilla Glass 7i", "mohs": None},
    {"glass_type": "Corning Gorilla Glass 7i", "mohs": None},
    {"glass_type": "Corning Gorilla Glass 3", "mohs": 5},
    {"glass_type": "Corning Gorilla Glass 3", "mohs": 4},
    {"glass_type": "Corning Gorilla Glass Victus 2", "mohs": 4},
    {"glass_type": "Corning Gorilla Glass Victus 2", "mohs": 4},
    {"glass_type": "Corning Gorilla Glass Victus 2", "mohs": 4},
    {"glass_type": "unknown", "mohs": None},
    {"glass_type": "Corning Gorilla Glass Victus 2", "mohs": None},
    {"glass_type": "Corning Gorilla Glass 7i", "mohs": None},
    {"glass_type": "Ceramic Guard glass", "mohs": 4},
    {"glass_type": "Corning Gorilla Glass 5", "mohs": None},
    {"glass_type": "Corning Gorilla Glass 5", "mohs": None},
    {"glass_type": "unknown", "mohs": None},
    {"glass_type": "unknown", "mohs": None},
    {"glass_type": "unknown", "mohs": None},
    {"glass_type": "unknown", "mohs": 4},
    {"glass_type": "Schott Glass", "mohs": None},
    {"glass_type": "unknown", "mohs": None},
    {"glass_type": "unknown", "mohs": 4},
    {"glass_type": "Schott Xensation Alpha", "mohs": None},
    {"glass_type": "Diamond Shield Glass", "mohs": 4},
    {"glass_type": "unknown", "mohs": None},
    {"glass_type": "unknown", "mohs": None},
    {"glass_type": "unknown", "mohs": 4},
    {"glass_type": "unknown", "mohs": 4},
    {"glass_type": "unknown", "mohs": None},
    {"glass_type": "unknown", "mohs": 4},
    {"glass_type": "NanoCrystal Shield", "mohs": None},
    {"glass_type": "NanoCrystal Shield", "mohs": 5},
    {"glass_type": "unknown", "mohs": 6},
    {"glass_type": "ArmorShell glass", "mohs": None},
    {"glass_type": "unknown", "mohs": 5},
    {"glass_type": "unknown", "mohs": None},
    {"glass_type": "unknown", "mohs": 5},
    {"glass_type": "unknown", "mohs": None},
    {"glass_type": "Corning Gorilla Glass 7i", "mohs": None},
    {"glass_type": "ArmorShell glass", "mohs": 6},
    {"glass_type": "Corning Gorilla Glass Victus 2", "mohs": None},
    {"glass_type": "Corning Gorilla Glass 7i", "mohs": 6},
]

def main() -> None:
    # Ensure input file exists and contains a valid list
    assert IN_PATH.exists(), f"Could not find {IN_PATH}"
    data = json.loads(IN_PATH.read_text(encoding="utf-8"))
    assert isinstance(data, list), "final_specs.json must be a list of phone dicts"
    assert len(data) == len(GLASS_DATA), f"Length mismatch: specs={len(data)} vs glass={len(GLASS_DATA)}"

    # Create a one-time backup of the original file
    if not BAK_PATH.exists():
        shutil.copyfile(IN_PATH, BAK_PATH)

    unknown_glass = 0  
    none_mohs = 0       

    # Merge glass data into each phone entry
    for i, phone in enumerate(data):
        g = GLASS_DATA[i]
        gt = g.get("glass_type", "unknown")
        mh = g.get("mohs", None)
        phone["glass_type"] = gt
        phone["mohs"] = mh
        if (gt or "unknown") == "unknown":
            unknown_glass += 1
        if mh is None:
            none_mohs += 1

    # Write updated dataset to output file
    OUT_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_PATH} with {len(data)} phones; unknown glass={unknown_glass}, missing mohs={none_mohs}")

if __name__ == "__main__":
    main()
