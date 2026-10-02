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
| Lab results | `python -m pipeline.labs` | Refreshes DXOMARK camera scores (`data/dxomark_scores.json`). Notebookcheck stress tests are kept by hand in `data/notebookcheck_stress.csv` with review links |
| Build | `python -m pipeline.build` | Scores everything and writes the site data |

GSMArena and Lazada both block plain scripts, so fetching uses a visible
Chrome window via Playwright (`pip install -r requirements.txt`). Pages are
cached in `.cache/`. If Lazada rate-limits, use
`python -m pipeline.prices crawl --lazada-browser` and solve the slider once.

A phone is on the site only if an official store currently sells it. Foldables
are left out: they're priced for the form factor, not the specs.

### Prices

* **Sources:** each brand's official Lazada store (fakes and grey imports are
  ignored), Apple Store SG and Google Store SG.
* **Exact variant:** every price is tied to the storage size it buys (from the
  store, the listing's SKU options, or the title), and the phone is scored on
  that variant. The old version paired 1TB specs with 256GB prices.
* **History:** `data/prices.csv` is append-only; each crawl adds rows.
* **Typical price:** value is judged at the median of the cheapest offer per
  crawl over the last 90 days, so a one-day flash sale doesn't reorder the
  ranking. The current price is still what's shown and filtered on. (This only
  smooths anything once several crawls exist.)

### Scores

Nine categories, each 0–10 (`pipeline/config.py` holds every threshold):

| Category | Based on |
|---|---|
| Performance | Half CPU: GeekBench 6 multi-core. Half *sustained* GPU: 3DMark Wild Life Extreme peak × the share kept in Notebookcheck's stress test (phones that overheated get the lowest share seen; untested phones borrow from the same chip, else the same brand). Lab results; else same/similar chipset; else estimated |
| Camera | Main sensor size, OIS, telephoto zoom & sensor, ultrawide, video, selfie (megapixels alone don't count), moved halfway to DXOMARK's measured camera score where tested. Untested phones only borrow from an identical-camera twin (full if same chip, half if same line) or, for Apple and Google, half from a same-chip sibling. Unpublished sensor sizes are estimated from same-megapixel cameras on phones with similar performance |
| Battery life | GSMArena *Active use* hours (else estimated from EU label or capacity) |
| Display | Panel, refresh rate, LTPO, HDR, measured brightness, sharpness |
| Charging | Wired & wireless watts, reverse wireless |
| Build & durability | IP rating, glass, frame, EU drop test class, battery lifespan (EU-label charge cycles) |
| Memory & storage | RAM, storage size and storage speed (UFS/eMMC) of the priced variant |
| Software support | Years of OS upgrades *still to come*: the promise minus time since release. If a phone's sheet states no promise, it's borrowed from the closest same-series phone, else a brand default |
| Features | 5G, NFC, stereo speakers, eSIM, headphone jack, UWB, IR, ultrasonic fingerprint or 3D face unlock |

Every input that's estimated, borrowed or assumed is flagged on the site with
the reason. Lab results that disagree wildly (>25%) with other phones on the
same chip are treated as bad runs and replaced by the chip median.

* **Spec score** – weighted average of the categories. Presets (Balanced,
  Camera, Battery, Performance, Keep-it-for-years) change the weights.
* **Value score** – a curve *expected score = a + b·x + c·x²* (x = ln price)
  is fitted across all phones. It bends because each extra dollar buys less at
  the top end (a straight line under-rated every phone above ~S$1500), and it is
  held flat past its peak. Value is how far a phone sits above or below it
  (5 = typical, ~7 = one standard deviation better). Cheap phones don't win just
  for being cheap.
* **SmartBuy score** – 50% spec, 50% value. Default ranking. Phones with the
  same rounded score share a rank (“=3”).
* **Likely rank** – the ranking is recomputed 400 times with the preset weights
  (±30%), prices (±8%) and every estimated input nudged by its plausible error;
  each phone's page shows the middle 90% of ranks it lands at.

## Development

```bash
pip install -r requirements.txt
python -m pytest tests          # parsing, matching, scoring, value, prices
python -m pipeline.build        # regenerate phones.json from committed data

cd smartbuy-frontend && npm install && npm run dev
```

Pushing to `main` runs the tests, rebuilds `phones.json` and deploys to GitHub Pages.
