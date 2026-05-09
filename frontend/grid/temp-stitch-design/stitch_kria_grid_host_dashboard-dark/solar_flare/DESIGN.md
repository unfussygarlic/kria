---
name: Solar Flare
colors:
  surface: '#121508'
  surface-dim: '#121508'
  surface-bright: '#383b2b'
  surface-container-lowest: '#0d0f04'
  surface-container-low: '#1a1d10'
  surface-container: '#1e2113'
  surface-container-high: '#292b1d'
  surface-container-highest: '#333627'
  on-surface: '#e2e4cf'
  on-surface-variant: '#c5c9ac'
  inverse-surface: '#e2e4cf'
  inverse-on-surface: '#2f3223'
  outline: '#8f9378'
  outline-variant: '#444932'
  surface-tint: '#b0d500'
  primary: '#ffffff'
  on-primary: '#2a3400'
  primary-container: '#caf300'
  on-primary-container: '#596c00'
  inverse-primary: '#536600'
  secondary: '#b8c3ff'
  on-secondary: '#002487'
  secondary-container: '#223da1'
  on-secondary-container: '#a1b1ff'
  tertiary: '#ffffff'
  on-tertiary: '#1b343d'
  tertiary-container: '#cde7f3'
  on-tertiary-container: '#506873'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#caf300'
  primary-fixed-dim: '#b0d500'
  on-primary-fixed: '#171e00'
  on-primary-fixed-variant: '#3e4c00'
  secondary-fixed: '#dde1ff'
  secondary-fixed-dim: '#b8c3ff'
  on-secondary-fixed: '#001355'
  on-secondary-fixed-variant: '#223da1'
  tertiary-fixed: '#cde7f3'
  tertiary-fixed-dim: '#b1cad7'
  on-tertiary-fixed: '#041e28'
  on-tertiary-fixed-variant: '#324a54'
  background: '#121508'
  on-background: '#e2e4cf'
  surface-variant: '#333627'
typography:
  h1:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  h2:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  h3:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: '0'
  body-lg:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
  label-lg:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  label-md:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Space Grotesk
    fontSize: 10px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin: 24px
---

## Brand & Style

This design system is engineered for high-performance data environments where precision meets kinetic energy. It draws from **Minimalism** and **High-Contrast** movements, utilizing a "Grid-first" philosophy. The aesthetic is professional yet aggressive, designed to evoke a sense of urgency and technical superiority. It targets power users who require high data density without sacrificing visual clarity. The emotional response is one of controlled power—the "calm before the storm" of a solar event, visualized through electric accents against a void-black foundation.

## Colors

The palette is anchored by a deep obsidian background to maximize the luminance of the accent colors. The primary accent, an electric lime, is reserved for high-priority actions and active states, acting as a beacon within the UI. The secondary cobalt blue provides a technical contrast for secondary metrics and functional depth. Surfaces are tiered through subtle value shifts rather than saturation, ensuring that the hierarchy is felt through luminosity. The coral error color is tuned to be visible but integrated, avoiding jarring vibration against the lime.

## Typography

This design system exclusively uses **Space Grotesk** to lean into its technical, futuristic personality. The typeface's geometric quirks are celebrated in large headlines while maintaining high legibility in dense data tables. Headlines are set with tight tracking and heavy weights to command attention. Labels utilize the 600 weight and uppercase styling to differentiate functional metadata from body content. For data-heavy views, prefer `body-sm` and `label-md` to maintain a high information density while preserving the grid's integrity.

## Layout & Spacing

The layout philosophy follows a **Fixed-Fluid Hybrid Grid**. Core containers adhere to a 12-column grid system with 16px gutters, while internal component spacing follows a strict 4px/8px modular scale. High data density is achieved by minimizing vertical padding in lists and tables, allowing the 1px borders to define the structure rather than excessive whitespace. Margins are kept generous at the screen edges (24px) to frame the dense internal content, creating a professional, gallery-like presentation of technical data.

## Elevation & Depth

Depth in this design system is achieved through **Tonal Layering** and **Low-Contrast Outlines**. Instead of traditional shadows, which can muddy a dark UI, we use 1px borders in `rgba(255, 255, 255, 0.10)` to define the edges of objects. 

- **Level 0 (Base):** `#0e0e0e` for the main canvas.
- **Level 1 (Cards):** `#131313` with a 1px border.
- **Level 2 (Elevated/Modals):** `#1a1919` with a slightly more prominent border or a subtle 10% lime inner glow for active focus.
- **Level 3 (Interactive):** Inputs use `#201f1f` to create a "sunken" feel, while chips use `#262626` to pop against card surfaces.

Transitions between levels should be instant or extremely fast (150ms) to maintain the "high-energy" technical feel.

## Shapes

The shape language balances the rigidity of the grid with organic, modern curves. A consistent radius of **16px to 20px** is applied to all primary containers and buttons. This creates a sophisticated "industrial design" aesthetic, reminiscent of premium hardware. Small components like chips or checkboxes may scale down to 8px, but the primary containers must maintain the larger radius to anchor the visual style. 1px borders are mandatory on all shaped elements to ensure definition against the pitch-black background.

## Components

- **Buttons:** Primary buttons are solid `#D4FF00` with black text, no border. Secondary buttons are transparent with a 1px cobalt blue border and cobalt text. 
- **Inputs:** Use `#201f1f` background with a 1px border. On focus, the border transitions to `#D4FF00`.
- **Chips:** Small, `#262626` background, using `label-sm` typography. Active chips utilize a cobalt blue text treatment.
- **Cards:** Base `#131313` with 16px-20px corner radius and a 1px white (10% alpha) border.
- **Data Grids:** Use 1px horizontal dividers. Header rows should use `#1a1919` background with `label-md` text for clear categorization.
- **Status Indicators:** Use small 8px circles. Use the electric lime for "optimal," cobalt blue for "processing," and coral for "critical/error."
- **Progress Bars:** Thin 4px tracks in `#201f1f` with a `#D4FF00` fill. For multi-stage data, alternate with the cobalt blue.