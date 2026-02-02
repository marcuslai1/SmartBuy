# SmartBuy - Phone Recommendation System

SmartBuy is a phone comparison and recommendation platform that helps users find the best value smartphones based on their preferences and budget. It uses a sophisticated scoring algorithm to evaluate phones across multiple categories and calculate a "SmartBuy Score" that represents value for money.

## Features

- **Smart Scoring Algorithm** - Evaluates phones across 10 categories with configurable weights
- **ISP Quality Scoring** - Camera scores account for computational photography capabilities based on SoC tier
- **Multiple Modes** - Budget, Midrange, and Flagship filtering options
- **Brand Filtering** - Filter by specific manufacturers
- **Price Filtering** - Set maximum budget in SGD
- **Phone Comparison** - Side-by-side comparison with category breakdowns
- **Premium UI** - Glass-morphism design with smooth animations

## Tech Stack

### Backend
- **Django** - Python web framework
- **SQLite** - Database (development)
- **Custom Scoring Engine** - Configurable phone evaluation system

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Lucide React** - Icons

## Scoring System

The scoring algorithm evaluates phones on a 0-10 scale across multiple categories:

### Category Weights (Total: 13.0)
| Category | Weight | Description |
|----------|--------|-------------|
| Camera | 2.0 | Main sensor, OIS, ultrawide, telephoto, ISP quality |
| SoC | 1.75 | Processor performance tier |
| Display | 1.5 | Panel type, refresh rate, resolution, PPI, brightness |
| Battery | 1.5 | Capacity with efficiency multipliers |
| Durability | 1.25 | Glass type and Mohs hardness |
| RAM | 1.25 | Memory capacity |
| Charging | 1.0 | Wired charging speed |
| Storage | 1.0 | Internal storage capacity |
| Extras | 1.0 | 5G, NFC, stereo speakers, wireless charging, etc. |
| Protection | 0.75 | IP rating |

### Camera Scoring

Camera quality is evaluated using hardware specs plus an **ISP Quality Bonus** based on SoC tier:

| Component | Max Points | Description |
|-----------|------------|-------------|
| Megapixels | 2.0 | Diminishing returns above 50MP |
| OIS | 1.5 | Optical image stabilization |
| ISP Quality | 1.5 | Based on SoC tier (computational photography) |
| Ultrawide | 0.4 | 12MP+ secondary camera |
| Telephoto | 0.5 | Optical zoom lens |
| Selfie | 0.3 | Front camera (32MP = max) |

The ISP bonus accounts for computational photography differences - explaining why a flagship 50MP phone often produces better photos than a budget 108MP phone.

### ISP Quality Tiers
| SoC Tier | ISP Bonus | Examples |
|----------|-----------|----------|
| 9.5+ | +1.5 | A17 Pro, Snapdragon 8 Gen 3 |
| 9.0 | +1.35 | A16, Snapdragon 8 Gen 2 |
| 8.0 | +1.05 | Snapdragon 8 Gen 1, A15 |
| 7.0 | +0.75 | Dimensity 7200, Snapdragon 7 Gen 3 |
| 6.0 | +0.4 | Helio G99 |
| 5.0 | +0.2 | Helio G85 |
| 4.0 | +0.1 | Entry-level chips |

### SmartBuy Score

The final SmartBuy Score represents value for money:

```
SmartBuy Score = (Raw Score / Price) × 100
```

Higher scores indicate better value. A phone with a raw score of 7.5 at $300 would have a SmartBuy Score of 2.5, while the same phone at $500 would score 1.5.

## Configuration

All scoring parameters are centralized in `phones/scoring_config.py` for easy tuning:

- Category weights
- SoC/RAM/Storage/Battery/Charging tiers
- Display scoring thresholds
- Camera scoring parameters
- ISP quality tiers
- Glass durability baselines
- IP rating scores

## Setup

### Backend
From the project root:
```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start server
python manage.py runserver
```

### Frontend
```bash
cd smartbuy-frontend
npm install
npm run dev -- --host
```

Once started, the app will be available at:
- Local: http://localhost:5173/
- Network: http://[your-ip]:5173/

## Project Structure

```
Scraper/
├── phones/                    # Django app
│   ├── scoring.py            # Scoring algorithm
│   ├── scoring_config.py     # Scoring configuration
│   ├── models.py             # Phone model
│   └── views.py              # API endpoints
├── data/                      # Phone data JSON files
│   ├── after_warranty_spec.json
│   ├── cleaned_specs.json
│   └── final_spec.json
├── smartbuy-frontend/         # React frontend
│   └── src/
│       ├── components/
│       │   ├── HeroIntro.jsx      # Splash screen
│       │   ├── ModeSelector.jsx   # Budget/Midrange/Flagship
│       │   ├── BrandSelector.jsx  # Brand selection
│       │   ├── FilterBar.jsx      # Search filters
│       │   ├── PhoneCard.jsx      # Phone display card
│       │   ├── CompareView.jsx    # Comparison view
│       │   └── ...
│       └── index.css          # Global styles
├── manage.py
├── requirements.txt
└── README.md
```

## UI Components

### Premium Design System
- **Glass-morphism** - Translucent cards with backdrop blur
- **Gradient accents** - Subtle color gradients for visual hierarchy
- **Smooth animations** - Framer Motion powered transitions
- **Score visualization** - Circular progress rings and progress bars
- **Dark theme** - Optimized for dark mode viewing

### Key Components
- **HeroIntro** - Animated splash screen with particle effects
- **ModeSelector** - Budget/Midrange/Flagship selection cards
- **BrandSelector** - Brand filtering with color-coded cards
- **FilterBar** - Search and filter controls with portal-based dropdowns
- **PhoneCard** - Phone display with score ring and spec details
- **CompareView** - Side-by-side comparison with fullscreen mode

## License

This project is for educational purposes as part of an FYP (Final Year Project).
