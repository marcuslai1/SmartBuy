# SmartBuy

Which phone gives you the most for your money in Singapore? SmartBuy scores
phones on lab-tested specs, prices them from **official brand stores**, and
judges value against what's typical at that price.

**Live:** https://marcuslai1.github.io/SmartBuy/

> v2 (Oct 2026) is a rebuild of the original FYP project. The original is
> tagged [`v1-fyp`](https://github.com/marcuslai1/SmartBuy/tree/v1-fyp); its
> July 2025 prices are kept as the first entries in the price history.

## How it works

```
GSMArena (specs + lab tests) ──► data/specs_raw.json ─┐
                                                       ├─► pipeline.build ─► smartbuy-frontend/public/phones.json ─► static site
Lazada official stores, apple.com/sg,                  │
store.google.com/sg ──────────► data/prices.csv ───────┘   (append-only price history)
```

| Step | Command | What it does |
|---|---|---|
| Discover | `python -m pipeline.discover` | Lists phones announced since Jan 2025 from GSMArena brand pages (no tablets, watches, foldables or China/India-only lines) |
| Specs | `python -m pipeline.specs` | Fetches and parses every spec sheet (plus the 2025 phones) |
| Prices | `python -m pipeline.prices crawl` | Official-store listings → price rows, matched by model name and storage |
| Build | `python -m pipeline.build` | Scores everything and writes the site data |

GSMArena and Lazada both block plain scripts, so fetching uses a visible
Chrome window via Playwright (`pip install -r requirements.txt`). Pages are
cached in `.cache/`. If Lazada rate-limits, use
`python -m pipeline.prices crawl --lazada-browser` and solve the slider once.

A phone is on the site only if an official store currently sells it.

### Prices

* **Sources:** each brand's official Lazada store (fakes and grey imports are
  ignored), Apple Store SG and Google Store SG.
* **Exact variant:** every price is tied to the storage size it buys (from the
  store, the listing's SKU options, or the title), and the phone is scored on
  that variant. The old version paired 1TB specs with 256GB prices.
* **History:** `data/prices.csv` is append-only; each crawl adds rows.

### Scores

Nine categories, each 0–10 (`pipeline/config.py` holds every threshold):

| Category | Based on |
|---|---|
| Performance | GeekBench 6 multi-core (lab result; else same/similar chipset; else CPU-core estimate) |
| Camera | Main sensor size, OIS, telephoto zoom & sensor, ultrawide, video, selfie. Megapixels alone don't count |
| Battery life | GSMArena *Active use* hours (else estimated from EU label or capacity) |
| Display | Panel, refresh rate, LTPO, HDR, measured brightness, sharpness |
| Charging | Wired & wireless watts, reverse wireless |
| Build & durability | IP rating, glass, frame, EU drop test class |
| Memory & storage | RAM and storage of the priced variant |
| Software support | Years of OS upgrades promised |
| Features | 5G, NFC, stereo speakers, eSIM, headphone jack, UWB, IR |

Estimated inputs are flagged on the site.

* **Spec score** – weighted average of the categories. Presets (Balanced,
  Camera, Battery, Performance, Keep-it-for-years) change the weights.
* **Value score** – a line *expected score = a + b·ln(price)* is fitted across
  all phones; value is how far a phone sits above or below it (5 = typical,
  ~7 = one standard deviation better). Cheap phones don't win just for being cheap.
* **SmartBuy score** – 50% spec, 50% value. Default ranking.

## Development

```bash
pip install -r requirements.txt
python -m pytest tests          # parsing, matching, scoring, value, prices
python -m pipeline.build        # regenerate phones.json from committed data

cd smartbuy-frontend && npm install && npm run dev
```

Pushing to `main` runs the tests, rebuilds `phones.json` and deploys to GitHub Pages.
