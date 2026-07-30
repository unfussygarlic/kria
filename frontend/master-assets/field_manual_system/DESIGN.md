---
name: Field Manual System
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
  on-tertiary: '#621100'
  tertiary-container: '#ffdad2'
  on-tertiary-container: '#b23c1f'
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
  tertiary-fixed: '#ffdad2'
  tertiary-fixed-dim: '#ffb4a2'
  on-tertiary-fixed: '#3c0700'
  on-tertiary-fixed-variant: '#891e03'
  background: '#121508'
  on-background: '#e2e4cf'
  surface-variant: '#333627'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.1'
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Archivo Narrow
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: Archivo Narrow
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
  mono-data:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  lower-third-ratio: 33.33%
  upper-two-thirds-ratio: 66.66%
---

## Brand & Style
This design system adopts a high-precision, editorial "field-manual" aesthetic tailored for the modern gig economy. The visual narrative treats every task as a technical operation and every user as a specialized agent. 

The style is rooted in **Modern Brutalism** mixed with **Technical Schematic** design. It prioritizes clarity, structural integrity, and information density. The UI avoids all organic behaviors—there are no gradients, no blurs, and no 3D effects. Instead, it relies on thin geometric line art, flat fills, and a strict 1px or 2px stroke weight to create a blueprint-inspired environment. The emotional response is one of competence, urgency, and mathematical reliability.

## Colors
The palette is built on a high-contrast "Ink" foundation to ensure maximum legibility in outdoor or high-activity environments. 

- **Primary (Lime):** Reserved for critical actions, active states, and success indicators. It serves as the "active" signal in a technical display.
- **Secondary (Cobalt/Coral/Amber):** Used for categorization and status differentiation (e.g., Cobalt for logistics, Coral for urgent alerts, Amber for warnings/pending states).
- **Ink & Paper:** The background is a deep #0e0e0e, while all structural lines and primary text are pure #ffffff.

## Typography
The typography strategy utilizes three distinct families to reinforce the field-manual aesthetic:
1. **Space Grotesk:** Used for headlines and impactful display text. Its geometric quirks lean into the technical, futuristic vibe.
2. **Archivo Narrow:** Used for body copy and descriptions. Its condensed nature allows for high information density, mimicking technical documentation where space is at a premium.
3. **JetBrains Mono:** Used for labels, metadata, and status indicators. The monospaced nature evokes code and raw data output.

All "Labels" should be set in Uppercase with slight tracking to enhance the "stamped" or "printed" look.

## Layout & Spacing
The layout follows a strict "Split-Field" philosophy:
- **The Visual Field (Upper 2/3):** Dedicated to technical diagrams, maps, or flat-illustration imagery. This area should feel expansive and data-rich.
- **The Control Field (Lower 1/3):** A dedicated zone for textual information and primary actions. 

The grid is a 12-column system with 1px white lines occasionally used to visible divide sections (Architectural Grid). Elements should align to a 4px baseline shift to maintain technical precision.

## Elevation & Depth
In this design system, depth is conveyed through **Structural Layering** and **Line Logic** rather than shadows.
- **Flat Stack:** Objects do not "float." They are either on the base layer or contained within a 1px white border box.
- **Occlusion:** Overlapping elements should use solid #0e0e0e fills to cut through background lines, creating a "blueprint" stack effect.
- **No Shadows:** Absolutely no drop shadows or blurs. Use "Ghost Frames" (1px dashed lines) to indicate drop zones or secondary containers.

## Shapes
The shape language is strictly **Sharp**. All corners for buttons, inputs, and containers are set to 0px. This reinforces the "industrial" and "manual" aesthetic. 

Illustrations must use consistent 1px strokes. Use 45-degree chamfers (clipped corners) sparingly for specialized "Agent" or "Action" buttons to give them a tactical look.

## Components
- **Buttons:** Rectangular with 0px radius. "Primary" buttons are solid Lime (#D4FF00) with Black text. "Secondary" buttons are transparent with a 1px White border and White text.
- **Chips/Status Tags:** Use JetBrains Mono. Small rectangular boxes with a solid fill in one of the secondary accent colors (Cobalt, Coral, Amber) and black text.
- **Input Fields:** 1px White bottom-border only. Labels sit above the line in JetBrains Mono, 10px, uppercase.
- **Lists:** Separated by 1px solid white horizontal rules. Each list item should have a "Lead-in" monospaced index (e.g., 01, 02, 03).
- **Cards:** No background fill difference from the main Ink background. Defined solely by a 1px white perimeter stroke. 
- **Icons:** Custom-drawn 24px grid icons using 1px strokes. Avoid filled shapes; use outlines only.
- **Data Visuals:** Use thin white lines and Lime accents for graphs. No curved lines; use "stepped" or "angular" line charts only.