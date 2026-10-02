"""Match free-text store listing titles to catalog models and storage variants.

Titles are tokenized so that 'Reno15F', 'Reno 15 F' and 'RENO15 F' look the
same, and a model only matches if the tokens right after it don't turn it into
a different model ('Galaxy S26' must not match 'Galaxy S26 Ultra').
"""
from __future__ import annotations

import re

# Tokens that, directly after a model name, mean "a different model"
MODIFIERS = {
    "pro", "plus", "ultra", "max", "lite", "fe", "e", "s", "t", "mini", "edge", "air", "neo",
    "power", "c", "x", "a", "i", "r", "d", "f", "fs", "v", "special", "gt", "prime", "turbo", "energy", "elite",
    "fold", "flip",
}
# Product-line words: a match preceded by one of these belongs to another line
LINE_WORDS = {"redmi", "note", "poco", "galaxy", "reno", "find", "pixel", "iphone", "magic", "nord",
              "cmf", "narzo", "iqoo"}
# Words dropped before matching (brand names and filler)
NOISE = {"apple", "samsung", "google", "xiaomi", "mi", "oppo", "vivo", "honor", "realme", "oneplus",
         "nothing", "the", "new", "smartphone", "phone", "mobile", "5g", "ai"}


def tokens(text: str) -> list[str]:
    t = text.lower()
    t = t.replace("+", " plus ").replace("&", " ")
    t = re.sub(r"\blte\b", " 4g ", t)
    t = re.sub(r"(?<=\d),(?=\d{3}\b)", "", t)  # '7,500mAh' is one number
    t = re.sub(r"[()\[\]【】|/,:;~_\-]", " ", t)
    t = re.sub(r"(?<=[a-z])(?=\d)|(?<=\d)(?=[a-z])", " ", t)  # split letter/digit runs
    return t.split()


def model_tokens(name: str) -> list[str]:
    toks = [x for x in tokens(name) if x not in NOISE]
    # GSMArena names 'Galaxy S26' / 'iPhone 17' / 'Pixel 10'; keep line names
    return toks


def _strip_noise(toks: list[str]) -> list[str]:
    out = []
    i = 0
    while i < len(toks):
        # drop '5 g' / '4 g' network suffix noise but remember 4g
        if toks[i] == "5" and i + 1 < len(toks) and toks[i + 1] == "g":
            i += 2
            continue
        if toks[i] in NOISE:
            i += 1
            continue
        out.append(toks[i])
        i += 1
    return out


def _find(seq: list[str], sub: list[str]) -> list[int]:
    n = len(sub)
    return [i for i in range(len(seq) - n + 1) if seq[i:i + n] == sub]


def matches(title: str, model_name: str, strict_4g: bool = True) -> bool:
    """True if model_name appears in title and isn't followed by a modifier.
    strict_4g: a trailing '4G' means a different (4G) model."""
    t = _strip_noise(tokens(title))
    m = _strip_noise(model_tokens(model_name))
    if not m:
        return False
    for i in _find(t, m):
        # Bare-number names ('Realme 15', 'Honor 500', 'Xiaomi 17T') must lead the title,
        # otherwise '... Android 15' or '7,500mAh' would match them
        if m[0].isdigit() and i != 0:
            continue
        prev = t[i - 1] if i > 0 else None
        if prev in LINE_WORDS and prev not in m:
            continue  # 'Xiaomi 17' must not match inside 'Redmi Note 17'
        rest = t[i + len(m):i + len(m) + 3] + [None, None, None]
        nxt, nxt2, nxt3 = rest[:3]
        if nxt in MODIFIERS:
            continue
        # '... 4G' means the 4G model, but Xiaomi writes RAM as '4G+128G'
        if strict_4g and nxt == "4" and nxt2 == "g" and nxt3 != "plus" and m[-2:] != ["4", "g"]:
            continue
        return True
    return False


def best_match(title: str, models: list[dict], name_key: str = "match_name") -> dict | None:
    """Pick the single most specific model named in a listing title.
    Returns None when nothing matches or the title names several different
    models (bundles / multi-model listings are ambiguous)."""
    hits = [m for m in models if matches(title, m[name_key])]
    if not hits:
        # '4G' only rules a model out when a separate 4G model exists to match instead
        hits = [m for m in models if matches(title, m[name_key], strict_4g=False)]
    if not hits:
        return None
    hits.sort(key=lambda m: len(model_tokens(m[name_key])), reverse=True)
    best = hits[0]
    # Other hits must be prefixes of the best match (e.g. 'S26' inside 'S26 FE' can't
    # happen thanks to modifiers, so any other hit means the title lists two models)
    best_toks = _strip_noise(model_tokens(best[name_key]))
    for other in hits[1:]:
        o = _strip_noise(model_tokens(other[name_key]))
        if best_toks[:len(o)] != o:
            return None
    return best


_STORAGE_RE = re.compile(r"(?<![\d.])(\d{2,4})\s*(gb|g|tb|t)\b", re.I)
_RAM_PLUS_RE = re.compile(r"(?<![\d.])(\d{1,2})\s*(?:gb|g)?\s*\+\s*(\d{1,2})\s*(?:gb|g)?\s*(?:extended|expanded)?\s*(?:ram)?\s*\+?\s*(\d{2,4})\s*(gb|g|tb|t)\b", re.I)


def storages_in(title: str) -> list[int]:
    """Storage sizes mentioned in a title, in GB (64/128/256/512/1024)."""
    out = []
    for num, unit in _STORAGE_RE.findall(title):
        gb = int(num) * (1024 if unit.lower().startswith("t") else 1)
        if gb in (32, 64, 128, 256, 512, 1024, 2048) and gb not in out:
            out.append(gb)
    if re.search(r"(?<!\d)1\s*tb?\b", title, re.I) and 1024 not in out:
        out.append(1024)
    return sorted(out)


def pick_variant(title: str, variants: list[dict]) -> dict | None:
    """Variant a listing price applies to.

    Lazada search shows the cheapest SKU price, so when a title lists several
    storages (e.g. '6GB+128GB / 8GB+256GB') the price belongs to the smallest.
    With no storage in the title the price is taken as the base variant's.
    """
    if not variants:
        return None
    base = sorted(variants, key=lambda v: (v["storage_gb"], v["ram_gb"]))
    found = [s for s in storages_in(title) if any(v["storage_gb"] == s for v in variants)]
    if not found:
        return base[0]
    target = found[0]
    options = [v for v in base if v["storage_gb"] == target]
    return options[0]
