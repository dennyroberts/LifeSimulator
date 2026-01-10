# Design Guidelines: Intelligence Is Overrated? — Life Sim

## Design Approach

**Selected Approach:** Design System-Based (Material Design)
**Justification:** This is a utility-focused, data-intensive simulation tool requiring clear information hierarchy, effective data visualization, and consistent interaction patterns. Material Design's principles of structured layouts, clear typography, and strong visual feedback systems align perfectly with the need to display complex statistical data, multiple input forms, and comparative visualizations.

**Key Design Principles:**
1. **Data Clarity First:** Every element serves the purpose of making simulation data easy to understand
2. **Scannable Hierarchies:** Dense information organized into digestible chunks
3. **Consistent Patterns:** Repeated components (trait displays, event cards, stat breakdowns) maintain identical structure
4. **Responsive Precision:** Charts and tables adapt gracefully across screen sizes

---

## Typography System

**Font Stack:** 
- Primary: Inter or Roboto (clean, legible for data)
- Monospace: JetBrains Mono or Roboto Mono (for numbers, stats, dice rolls)

**Hierarchy:**
- **H1 (Page Titles):** 2.5rem (40px), font-weight 700, tracking -0.02em
- **H2 (Section Headers):** 1.875rem (30px), font-weight 600
- **H3 (Card Titles/Stats Labels):** 1.25rem (20px), font-weight 600
- **Body:** 1rem (16px), font-weight 400, line-height 1.6
- **Small/Meta:** 0.875rem (14px), font-weight 400
- **Numbers/Stats:** Use monospace, font-weight 600, slightly larger (1.125rem)
- **Dice Rolls:** Monospace, 1.25rem, font-weight 700 for emphasis

---

## Layout System

**Spacing Primitives:** Tailwind units of **2, 4, 8, 12, 16, 24** (e.g., p-2, m-4, gap-8, py-12, px-16, space-y-24)

**Container Strategy:**
- **App Shell:** Full-width with max-w-7xl centered container
- **Tab Content:** max-w-6xl for optimal reading and chart viewing
- **Form Sections:** max-w-4xl for input areas
- **Data Tables/Charts:** Full container width with responsive overflow

**Grid Patterns:**
- **Trait Input Grid:** 5 columns on desktop (one per trait), 2 columns tablet, 1 column mobile
- **Event Timeline:** Vertical stack with consistent card width
- **Mass Sim Results:** 2-column layout (top 10 / bottom 10) on desktop, stacked mobile
- **Charts Section:** 2-column grid for scatter plots on desktop

---

## Component Library

### Navigation & Tabs
**Primary Tab Bar:**
- Horizontal tabs centered at top of main content
- Each tab: px-8 py-4, font-weight 600
- Active state: border-b-4 treatment
- Clean, Material Design-style tab indicator animation

### Input Components

**Trait Input Card:**
- Grouped card containing all 5 traits
- Each trait row: Label (4rem width) + Slider/Input + Current Value Display (monospace)
- Grid layout: grid-cols-5 gap-4 on desktop
- Include "+/- buttons" or slider for easy adjustment
- Display modifier calculation: "Score: 15 (Mod: +2)" in small text below

**Configuration Section:**
- Organized into logical groups with subtle dividers
- Dropdown for world mode (3 options with icons/descriptions)
- Toggle switches for "Same Deck" and other boolean options
- Seed input: Full-width text field with "Random Seed" button adjacent
- Agent count selector: Button group (1k / 10k / 50k) with active state

**Agent Name Input:**
- Text field with "Generate Random Name" button inline
- Shows generated name preview immediately

### Data Display Components

**Event Timeline Card (Single Life):**
- Vertical list of stage cards
- Each card structure:
  - **Header:** Stage number + Event name (H3)
  - **Body Grid (3 columns):**
    - Column 1: "Gate Check" (if applicable) - d20 roll + mods + DC threshold, Pass/Fail badge
    - Column 2: "Main Check" - d20 roll + total mods + DC, Success/Fail badge  
    - Column 3: "Effects" - Jump % and Growth Δ with +/- indicators
  - **Footer:** "Income After Stage: $XXX,XXX" (large, monospace)
- Use subtle card elevation (shadow-sm)
- Spacing: gap-6 between cards

**Luck Analysis Panel:**
- 4-column grid on desktop (Opportunity / Roll / Trait Advantage / Net Luck)
- Each metric in its own card:
  - Large number (monospace, 2rem)
  - Label below
  - Small explanation text
- Include EV breakdown section below with collapsible details

**Education Outcome Display:**
- Special card at Stage 1
- Shows threshold ladder with visual indicator of where agent landed
- Roll calculation breakdown clearly shown
- Growth delta applied highlighted

### Mass Simulation Components

**Results Table (Top/Bottom 10):**
- Clean table with alternating row treatment
- Columns: Rank | Name | Traits (compact grid) | Final Income | Luck Components | Event Summary (collapsed/expandable)
- Fixed header on scroll
- Monospace for all numeric columns
- Name column: font-weight 600

**Event Summary (per agent):**
- Compact list showing: Event name + ✓/✗ badge
- Expandable accordion to see full details
- Max-height with scroll for long lists

### Charts & Visualizations

**Income Timeline (Single Life):**
- Line chart with clearly marked stage points
- X-axis: Stage 1-8
- Y-axis: Income ($)
- Grid lines for readability
- Data point markers at each stage
- Dimensions: Full container width, height: 400px

**Income Distribution Histogram (Mass Sim):**
- Bar chart with 20-30 bins
- X-axis: Income ranges
- Y-axis: Agent count
- Show mean/median lines as overlays
- Dimensions: Full width, height: 500px

**Trait/Luck Scatter Plots:**
- 6 scatter plots in 2-column grid (3 rows)
- Each plot: Trait/Luck component vs Final Income
- Points with subtle opacity for overlap handling
- Trend line if correlation significant
- Dimensions: Square aspect ratio, ~300px per plot

### Buttons & Actions

**Primary Actions:**
- "Run Simulation" / "Simulate Mass" - Large, prominent (px-8 py-4)
- "Generate Random Traits" - Secondary style (outlined)
- "Share Simulation" - Icon + text button

**Secondary Actions:**
- "Reset" / "Clear" - Minimal style, smaller padding
- Chart export buttons - Icon-only, small

---

## Interaction Patterns

**Form Validation:**
- Real-time feedback for trait score bounds (0-20)
- Clamping behavior clearly indicated
- Disabled state for "Run" button until valid configuration

**Loading States:**
- Progress indicator for mass simulations
- Show estimated time for large runs
- Skeleton loaders for charts during render

**Expandable Sections:**
- EV formula breakdowns: Collapsed by default, expand on click
- Event details in mass sim: Accordion pattern
- Smooth transitions (200-300ms)

**Data Sharing:**
- URL updates with seed + configuration
- "Copy Link" button with success feedback
- Toast notifications for clipboard actions

---

## Responsive Behavior

**Breakpoints:**
- Mobile: < 768px - Single column, stacked forms
- Tablet: 768px - 1024px - 2-column grids where applicable  
- Desktop: > 1024px - Full multi-column layouts

**Mobile Optimizations:**
- Horizontal scroll for wide tables
- Collapsed trait inputs (tap to expand each)
- Charts: Full width, increased height for readability
- Tabs: Horizontal scroll if needed

---

## Accessibility

**Focus Management:**
- Clear focus indicators on all interactive elements (2px outline)
- Logical tab order through forms
- Skip links for navigation

**ARIA Labels:**
- All charts labeled with descriptive titles
- Form inputs with associated labels
- Loading states announced to screen readers

**Contrast & Readability:**
- Ensure all text meets WCAG AA standards
- Sufficient spacing between interactive elements (min 44px touch targets)
- Clear visual distinction between enabled/disabled states

---

## Images

**No Images Required:** This is a data visualization application with no need for decorative or illustrative imagery. All visual communication happens through typography, layout, charts, and data displays.