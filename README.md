# Life Simulator

A web-based life simulation that explores how life unfolds at a mass scale. Watch virtual sims navigate education, careers, and life events—with outcomes determined by dice rolls modified by personal traits.

## Overview

This simulation models life as a series of stages where sims progress from high school through their careers, encountering various life events along the way. Each sim has five core traits that influence their success, but random chance (the dice) plays a crucial role in determining outcomes.

The simulation lets you:
- **Run a single life** to watch one sim's detailed journey unfold
- **Run mass simulations** (up to 100,000 sims) to analyze statistical patterns
- **Create cohorts** to filter and compare specific groups of sims
- **Analyze luck** to understand how much of success comes from fortune vs. talent

## The Five Traits

Each sim has five traits scored on a 0–20 scale (with 10 being average):

| Trait | Symbol | Description |
|-------|--------|-------------|
| **INT** | Brain | Intelligence — affects education, career placement, and strategic decisions |
| **WORK** | Hammer | Work ethic — influences job performance, skill development, and perseverance |
| **NEPO** | Crown | Nepotism/Connections — represents family wealth, social network, and insider access |
| **CHAR** | Sparkles | Charisma — impacts networking, negotiations, and social situations |
| **RISK** | Flame | Risk tolerance — determines whether sims attempt high-risk, high-reward opportunities |

### Trait Modifiers

Traits translate to dice roll bonuses using standard RPG-style modifiers:

```
Modifier = floor((Trait Score - 10) / 2)
```

| Score | Modifier |
|-------|----------|
| 0-1   | -5       |
| 2-3   | -4       |
| 4-5   | -3       |
| 6-7   | -2       |
| 8-9   | -1       |
| 10-11 | +0       |
| 12-13 | +1       |
| 14-15 | +2       |
| 16-17 | +3       |
| 18-19 | +4       |
| 20    | +5       |

## Life Stages

Each sim progresses through 9 life stages:

### Stage 1: Education
Where you land after high school. Roll 2d10 + modifiers (weighted: INT × 1.0, WORK × 0.5, NEPO × 1.0).

| Roll Total | Outcome | Growth Bonus |
|------------|---------|--------------|
| 20+ | Elite institution | +2.0% |
| 17-19 | Strong university | +1.0% |
| 13-16 | Regional/state school | +0.6% |
| 9-12 | Community/vocational | +0.3% |
| Below 9 | Straight to workforce | +0.0% |

Education also provides a bonus to career placement (Elite = +3, Strong = +2, Regional = +1, Community = 0, Workforce = -2).

### Stage 2: Career Placement
Your starting career. Roll 2d10 + education bonus + modifiers (weighted: NEPO × 1.5, INT × 0.75, CHAR × 0.5).

Rolling a natural 20 grants a 1.5× starting salary multiplier.

| Roll Total | Career | Starting Salary | Base Growth |
|------------|--------|-----------------|-------------|
| 0-3 | Food Service | $32,000 | 1.0% |
| 4-5 | Retail | $36,000 | 1.5% |
| 6-7 | Construction | $40,000 | 2.0% |
| 8-9 | Truck Driver | $44,000 | 2.2% |
| 10-11 | Healthcare | $48,000 | 2.5% |
| 12-13 | Creative Fields | $52,000 | 3.0% |
| 14-15 | Marketing | $56,000 | 3.5% |
| 16-17 | Tech | $60,000 | 4.0% |
| 18 | Finance | $64,000 | 4.5% |
| 19 | Lawyer | $68,000 | 5.0% |
| 20+ | Doctor | $72,000 | 5.5% |

### Stages 3-9: Life Events
Each stage, a life event is drawn from the deck and resolved. Events have different rarities, difficulty classes (DCs), and effects.

## Life Events

Events are drawn randomly from a weighted deck with 37 unique events across 5 rarity tiers:

| Rarity | Weight | Description |
|--------|--------|-------------|
| **Common** | 5 | Everyday career situations |
| **Uncommon** | 3 | Notable opportunities or challenges |
| **Rare** | 1 | Significant turning points |
| **Jackpot** | 0.3 | Life-changing windfalls |
| **Sinkhole** | 0.7 | Major setbacks |

### Event Resolution

1. **Risk Gate Check** (if applicable): Some events require a RISK check to even attempt. Roll d20 + RISK modifier vs. Gate DC (dice check). If you fail, you don't take the risk and the event has no effect.

2. **Main Check**: Roll d20 + relevant trait modifiers vs. Event DC to determine success or failure.

### Critical Rolls

Critical rolls add an additional **1.5× multiplier**.

- **Natural 20 (Critical Success)**: 1.5× effect magnitude. Any negative outcomes are flipped to positive.
- **Natural 1 (Critical Failure)**: 1.5× effect magnitude. Any positive outcomes are flipped to negative. Additionally, minimum penalties are enforced (-5% jump, -0.5% growth) to ensure critical failures always hurt.

### Event Effects

Events modify your trajectory through two mechanisms:

- **Jump%**: Immediate percentage change to income (one-time boost or penalty)
- **Growth Delta**: Permanent change to your annual growth rate (compounds over subsequent stages). Growth decays over time (by 0.5% per year) so that a sim can't get an early win and then coast on their laurels indefinitely

### Example Events

| Event | Rarity | DC | Traits | Success Effect | Fail Effect |
|-------|--------|-----|--------|----------------|-------------|
| You Get Promoted | Common | 12 | WORK, CHAR, INT | +10% jump, +0.3% growth | No effect |
| Side Hustle | Uncommon | 17 | WORK, INT, CHAR | +15% jump, +1.5% growth | -3% jump, -0.6% growth |
| You Found a Startup | Jackpot | 20 | NEPO, CHAR, WORK, INT | +20% jump, +3% growth | -10% jump, -1.5% growth |
| Your Industry Tanks | Sinkhole | 14 | WORK, NEPO, CHAR, INT | -5% jump, -0.8% growth | -15% jump, -2% growth |

## World Modes

Three world modes adjust how much each trait matters:

### Normal World
All traits weighted equally (1.0×). Represents a balanced society.

### Nepotism World
Connections and charm dominate:
- NEPO: 2.0×
- CHAR: 1.6×
- INT: 0.4×
- WORK: 0.4×

### Meritocracy World
Hard work and intelligence rewarded:
- INT: 2.0×
- WORK: 2.0×
- NEPO: 0.2×
- CHAR: 0.4×

## Luck Analysis

The simulation tracks two types of luck to understand how much of a sim's success comes from fortune vs. talent:

### Opportunity Luck (What cards you were dealt)

Measures the quality of events drawn, independent of the sim's traits.

```
Opportunity Luck = EV(Hand) - EV(Baseline Hand)
```

- **EV(Hand)**: The expected value of the specific events this sim received
- **EV(Baseline)**: The expected value of an average draw from the deck

A positive score means the sim got better-than-average events. This is pure luck—the sim had no control over which events appeared.

### Roll Luck (How the dice fell)

Measures how the actual dice rolls compared to statistical expectation.

```
Roll Luck = Sum of (Each Roll - Average Roll)
```

For d20 rolls, the average is 10.5. For 2d10 rolls (education/career), the average is 11.

Rolling above average = positive roll luck. This is also pure luck—the sim's traits don't affect whether they roll high or low.

### Z-Score Normalization

To make luck values comparable across different scales, the simulation normalizes both luck types to z-scores:

```
Opportunity Luck Z = Opportunity Luck / 0.50 (empirical std dev)
Roll Luck Z = Roll Deviation / 18.2 (theoretical std dev)
Total Luck Z = (Opportunity Z + Roll Z) / 2
```

A z-score of +1 means the sim was 1 standard deviation luckier than average. About 68% of sims fall within ±1 z-score.

## Mass Simulation Mode

Run simulations with up to 100,000 sims to analyze statistical distributions.

### Same Deck Mode

When enabled, all sims face the exact same sequence of events. This isolates the effect of traits by removing opportunity luck variation—only roll luck and trait differences remain.

### Statistics Provided

- **Final Income**: Distribution of ending salaries
- **Peak Income**: Highest salary achieved during the simulation
- **Lifetime Earnings**: Total earnings across all stages
- **Luck Metrics**: Distributions of opportunity luck, roll luck, and total luck

### Visualization

- **Histograms**: See the distribution of outcomes
- **Scatter Plots**: Explore correlations (e.g., Total Luck vs. Final Income)

## Cohort Creator

Filter mass simulation results to analyze specific subgroups:

### Trait Filters
Select sims with traits above/below certain thresholds (e.g., "INT ≥ 15" or "NEPO ≤ 5").

### Luck Filters
Select sims by their luck z-scores:
- Roll Luck (how the dice favored them)
- Opportunity Luck (what events they received)
- Total Luck (combined luck score)

### Outcome Filters
Filter by career placement, education outcome, or specific life events experienced.

### Event Occurrence Matching
When filtering by events, selecting the same event multiple times requires multiple occurrences. For example, selecting "Promoted" twice finds sims who were promoted at least twice during their life.

## Technical Details

### Stage Length and Income Progression

Each of the 9 life stages represents approximately 6 years. Income compounds **annually** within each stage:

```
Year N Income = Previous Year Income × (1 + Growth Rate)
Stage Lifetime Earnings = Sum of all 6 years of income within the stage
```

**Example:** If you start a stage at $68K salary with 5.6% growth:
- Year 1: $68,000
- Year 2: $68,000 × 1.056 = $71,808
- Year 3: $71,808 × 1.056 = $75,829
- ...and so on for 6 years

When a life event occurs, it applies a **jump%** to your current (compounded) income and may modify your growth rate for future years. Income has a floor of $1,000. If a sim hits the income floor while having a negative growth rate, the growth rate resets to 0% to allow recovery.

### Seeded Randomness

All randomness uses a seeded pseudo-random number generator (mulberry32). This means:
- Simulations are reproducible given the same seed
- Seeds can be shared via URL to replicate exact results

### Expected Value Calculations

Event EV considers remaining years and annual compounding:

```
EV = Σ(withEffect[year] - baseline[year]) for all remaining years
```

Where effects compound annually through the growth rate delta.

## Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5000`.

## Built With

- React + TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Custom SVG charts (no external charting libraries)

## License

MIT License
