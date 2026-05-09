---
name: Solar Flare Light
colors:
  surface: '#f9fbe5'
  surface-dim: '#dadcc6'
  surface-bright: '#f9fbe5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f5df'
  surface-container: '#eef0da'
  surface-container-high: '#e8ead4'
  surface-container-highest: '#e2e4cf'
  on-surface: '#1a1d10'
  on-surface-variant: '#444932'
  inverse-surface: '#2f3223'
  inverse-on-surface: '#f1f2dc'
  outline: '#757a60'
  outline-variant: '#c5c9ac'
  surface-tint: '#536600'
  primary: '#536600'
  on-primary: '#ffffff'
  primary-container: '#d4ff00'
  on-primary-container: '#5f7400'
  inverse-primary: '#b0d500'
  secondary: '#4858ab'
  on-secondary: '#ffffff'
  secondary-container: '#96a5ff'
  on-secondary-container: '#27378a'
  tertiary: '#5f5e5e'
  on-tertiary: '#ffffff'
  tertiary-container: '#f0eded'
  on-tertiary-container: '#6c6b6b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#caf300'
  primary-fixed-dim: '#b0d500'
  on-primary-fixed: '#171e00'
  on-primary-fixed-variant: '#3e4c00'
  secondary-fixed: '#dee0ff'
  secondary-fixed-dim: '#bac3ff'
  on-secondary-fixed: '#00105b'
  on-secondary-fixed-variant: '#2f3f92'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474646'
  background: '#f9fbe5'
  on-background: '#1a1d10'
  surface-variant: '#e2e4cf'
typography:
  h1:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
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
    lineHeight: '1.3'
  body-lg:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-lg:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.02em
  label-md:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
  margin: 40px
---

## Brand & Style
This design system is built for Kria Grid, a recruitment-focused dashboard that balances high-precision technical utility with an energetic, forward-thinking aesthetic. The style is **Corporate / Modern** with a technical edge, utilizing aggressive geometric typography and a high-energy primary accent to signify speed and innovation. It prioritizes clarity and information density, ensuring recruiters can navigate complex talent data without cognitive fatigue. The visual language conveys reliability through structured layouts, while the "electric lime" accents provide a modern, "tech-first" pulse.

## Colors
The palette is anchored by an "Electric Lime" (#D4FF00) primary accent. Because of its high luminance, it is exclusively paired with dark text (#121212) for primary CTAs to ensure WCAG compliance. For smaller interactive elements where lime may be too vibrating, the "Soft Cobalt" (#5C6BC0) provides a professional, stable alternative. 

The background uses a cool off-white (#F8F9FA) to reduce screen glare during long working sessions, while pure white (#FFFFFF) is reserved for interactive surfaces and cards to create a clear "layering" effect.

## Typography
The design system exclusively uses **Space Grotesk** to maintain a cohesive, technical personality. Headlines utilize the 700 weight with tight letter-spacing to create a bold, structural hierarchy. Body text is set at 400 weight for maximum legibility in data-heavy views. Labels and metadata use the 600 weight, often in all-caps for functional distinction in the dashboard environment.

## Layout & Spacing
The design system employs a **Fixed Grid** model for dashboard content, typically a 12-column system with a 1280px max-width container. A strict 4px baseline rhythm ensures vertical alignment across disparate data widgets. Margins are generous (40px) to allow the "Electric Lime" accents to stand out without competing with edge-to-edge clutter.

## Elevation & Depth
Depth is achieved through **Low-contrast outlines** and subtle **Ambient shadows**. Surfaces use a 1px border `rgba(0,0,0,0.05)` to define boundaries. Shadows are extremely soft: `0 4px 12px rgba(0,0,0,0.03)`. Higher elevation levels (such as modals) increase the shadow spread and opacity slightly but avoid heavy dark blurs to maintain the "clean" dashboard aesthetic.

## Shapes
This design system uses a **Soft** shape language. Standard components like buttons and input fields use a 0.25rem (4px) corner radius. This slight rounding softens the technical edge of Space Grotesk without leaning into the playfulness of fully rounded UI, preserving a sense of professional precision.

## Components
- **Buttons:** Primary buttons use the #D4FF00 background with #121212 text. Secondary buttons use the #5C6BC0 background with white text. Ghost buttons use #121212 text with a subtle 1px border.
- **Cards:** White background, 1px `rgba(0,0,0,0.05)` border, and a 4px corner radius. Header sections within cards should have a subtle bottom border.
- **Input Fields:** 1px `rgba(0,0,0,0.1)` border, turning #5C6BC0 on focus. Labels sit above the field in 600 weight, 12px uppercase.
- **Chips/Badges:** For status indicators, use low-opacity fills of the Cobalt or Error colors with high-contrast text to ensure legibility without overwhelming the grid.
- **Data Grids:** Rows use #F8F9FA on hover to indicate interactivity. Borders between rows are kept at 0.5px `rgba(0,0,0,0.05)`.
- **Progress Indicators:** Use the #D4FF00 color for active progress bars to draw the eye to completion states.