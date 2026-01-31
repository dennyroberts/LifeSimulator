# Intelligence Is Overrated? — Life Sim

## Overview
An interactive life simulation web application that models career trajectories using D&D-style d20 mechanics. The app simulates lives as a series of life-event cards, tracking Income as the main scoring metric and analyzing luck components (opportunity luck vs roll luck).

## Current State
MVP implementation complete with:
- Single Life mode: Configure agent traits, run simulation, view timeline and luck analysis
- Mass Simulation mode: Run 1K-50K agents, view statistics, histograms, and scatter plots
- Three world modes: Normal, Nepotism, Meritocracy
- Reproducible seeded RNG with URL sharing
- Dark/Light theme support

## Project Architecture

### Frontend (React + TypeScript + Vite)
```
client/src/
├── components/
│   ├── SingleLife.tsx      # Single life simulation UI
│   ├── MassSim.tsx         # Mass simulation UI
│   ├── TraitInput.tsx      # Trait input/display components
│   ├── Timeline.tsx        # Life event timeline cards
│   ├── Charts.tsx          # SVG charts (income, histogram, scatter)
│   ├── LuckAnalysis.tsx    # Luck breakdown panel
│   └── ThemeToggle.tsx     # Dark/light mode toggle
├── data/
│   ├── config.json         # Simulation configuration
│   ├── events.json         # Life event definitions
│   ├── worldModes.json     # World mode multipliers
│   └── names.json          # First/last names for generation
├── lib/
│   ├── rng.ts              # Seeded RNG (mulberry32)
│   └── sim.ts              # Core simulation engine
└── App.tsx                 # Main app with tabs
```

### Simulation Model
- 8 life stages: Stage 1 (Education) + Stages 2-8 (Random events)
- Traits: INT, WORK, SOC, CHAR, RISK (0-20 scale)
- D20 checks with trait modifiers
- Income progression with jump% and growth% mechanics
- Risk gates on certain events

### Key Files
- `client/src/lib/sim.ts` - All simulation logic, EV calculations, luck computation
- `client/src/lib/rng.ts` - Deterministic seeded random number generator
- `client/src/data/events.json` - 27 life events with rarities and effects

## User Preferences
- Using Inter font for UI, JetBrains Mono for numbers/stats
- Material Design-inspired data visualization
- Simple SVG charts (no heavy chart libraries)

## Recent Changes
- Initial MVP implementation (January 2026)
- Created complete simulation engine with luck analysis
- Built all UI components following design guidelines
- Implemented dark/light theme toggle
- Changed income model to annual compounding (6 years per stage)
- Removed growth rate caps (-10%/+40% limits eliminated)
- Added growth rate reset to 0% when hitting income floor with negative growth
- Updated EV calculations to use annual compounding
- Removed 2x effect multiplier (effectMultiplier now 1.0) - criticals still get 1.5x
- Added growth decay: growth above 5% decays by 0.25% per year (prevents perpetual compounding)
- Updated all EV calculations to account for growth decay
- Fixed opportunity luck z-score: now uses computed std from actual deck variance (computeOpportunityLuckStd)
