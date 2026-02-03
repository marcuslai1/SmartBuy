# SmartBuy - Phone Recommendation System

SmartBuy is a phone comparison and recommendation platform that helps users find the best value smartphones based on their preferences and budget. It uses a scoring algorithm to evaluate phones across multiple categories and calculate a "SmartBuy Score" that represents value for money.

**Live Demo:** [https://marcuslai1.github.io/SmartBuy/](https://marcuslai1.github.io/SmartBuy/)

## Features

- **Smart Scoring Algorithm** - Evaluates phones across 10 categories with configurable weights
- **ISP Quality Scoring** - Camera scores account for computational photography based on SoC tier
- **Multiple Modes** - Budget, Midrange, and Flagship filtering options
- **Brand Filtering** - Filter by specific manufacturers
- **Price Filtering** - Set maximum budget in SGD
- **Phone Comparison** - Side-by-side comparison with category breakdowns
- **Static Deployment** - No backend required, works on GitHub Pages

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Lucide React** - Icons
- **Python** - Scoring algorithm and data generation

## Quick Start

### 1. Generate Phone Data

```bash
# Install Python dependencies
pip install -r requirements.txt

# Generate static phone data with scores
python build_static_data.py
```

### 2. Run Frontend

```bash
cd smartbuy-frontend
npm install
npm run dev
```

The app will be available at http://localhost:5173/

## Scoring System

Phones are scored on a 0-10 scale across 10 categories:

| Category | Weight | Description |
|----------|--------|-------------|
| Camera | 2.0 | Sensor, OIS, ultrawide, ISP quality |
| SoC | 1.75 | Processor performance tier |
| Display | 1.5 | Panel type, refresh rate, resolution |
| Battery | 1.5 | Capacity with efficiency multipliers |
| Durability | 1.25 | Glass type and hardness |
| RAM | 1.25 | Memory capacity |
| Charging | 1.0 | Wired charging speed |
| Storage | 1.0 | Internal storage |
| Extras | 1.0 | 5G, NFC, stereo speakers, etc. |
| Protection | 0.75 | IP rating |

### Camera ISP Quality Bonus

Camera scores include an ISP bonus based on SoC tier, accounting for computational photography:

| SoC Tier | ISP Bonus | Examples |
|----------|-----------|----------|
| 9.5+ | +1.5 | A17 Pro, Snapdragon 8 Gen 3 |
| 8.0 | +1.05 | Snapdragon 8 Gen 1, A15 |
| 7.0 | +0.75 | Dimensity 7200 |
| 5.0 | +0.2 | Helio G85 |

### Value Score (Tier-Relative)

The Value Score (0-10) measures how good a deal a phone is **within its price bracket**:

- **Budget** (≤$400) - Compared against other budget phones
- **Midrange** ($401-$800) - Compared against other midrange phones
- **Flagship** (>$800) - Compared against other flagship phones

```
Raw Value = (Spec Score / Price) × 100
Value Score = Normalize(Raw Value) within tier → 0-10 scale
```

This ensures fair comparisons - a flagship at $900 can score 10/10 value if it's the best deal among flagships, rather than always losing to cheaper budget phones.

| Value Score | Meaning |
|-------------|---------|
| 8-10 | Excellent value in this tier |
| 5-7 | Average value for the price |
| 1-4 | Below average value |

### Protection (IP Rating) Scoring

IP ratings are scored with proper differentiation between dust protection levels:

| Rating | Score | Description |
|--------|-------|-------------|
| IP68 | 0.95 | Dust-tight + 1.5m submersion (flagship standard) |
| IP67 | 0.82 | Dust-tight + 1m submersion |
| IP66 | 0.70 | Dust-tight + powerful water jets |
| IP65 | 0.60 | Dust-tight + water jets |
| IP55 | 0.40 | Dust-protected + water jets |
| IP54 | 0.30 | Dust-protected + splashing |

### Extras Scoring

Extra features are balanced to avoid any single feature dominating:

| Feature | Score | Notes |
|---------|-------|-------|
| 5G | 0.65 | Important but not dominant |
| NFC | 0.45 | Mobile payments |
| Stereo speakers | 0.45 | Media experience |
| Wireless charging | 0.40 | Convenience feature |
| SD card slot | 0.35 | Expandable storage |
| Headphone jack | 0.30 | Still valued by many users |

## Project Structure

```
SmartBuy/
├── build_static_data.py      # Generates phones.json with scores
├── phones/
│   ├── scoring.py            # Scoring algorithm
│   └── scoring_config.py     # Configurable weights and tiers
├── scripts/
│   ├── scrape_specs.py       # Scrapes phone specs from versus.com
│   ├── scrape_price.py       # Scrapes prices from Lazada.sg
│   └── add_glass.py          # Adds glass/durability data to phones
├── data/
│   └── final_spec.json       # Source phone data (with glass/durability info)
├── smartbuy-frontend/
│   ├── public/
│   │   └── phones.json       # Generated static data
│   ├── src/
│   │   ├── App.jsx           # Main app component
│   │   ├── components/
│   │   │   ├── HeroIntro.jsx
│   │   │   ├── ModeSelector.jsx
│   │   │   ├── BrandSelector.jsx
│   │   │   ├── FilterBar.jsx
│   │   │   ├── PhoneCard.jsx
│   │   │   └── CompareView.jsx
│   │   └── index.css
│   └── vite.config.js
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Pages deployment
└── README.md
```

## Configuration

Scoring parameters are in `phones/scoring_config.py`:

- Category weights
- SoC/RAM/Storage/Battery/Charging tiers
- Display scoring thresholds
- Camera and ISP quality tiers
- Glass durability baselines
- IP rating scores

After modifying, regenerate data:
```bash
python build_static_data.py
```

## License

Educational project for FYP (Final Year Project).
