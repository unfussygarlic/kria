---
name: Mobile App Theming
description: Solar Flare palette, semantic tokens, fonts, responsive utils, band colors
type: reference
---

# Mobile App — Solar Flare Theme

All tokens defined in `frontend/pocket/constants/colors.ts`. Change there to retheme the entire app.

## Palette

| Token | Value | Usage |
|-------|-------|-------|
| `T.primary` | `#D4FF00` | Lime — primary brand color, active states, text on dark |
| `T.secondary` | `#8097ff` | Cobalt — secondary accent |
| `T.bg` | `#0e0e0e` | Main background |
| `T.surface1` | `#131313` | Cards, headers |
| `T.surface2` | `#1a1919` | Elevated surface |
| `T.surface3` | `#201f1f` | Input backgrounds |
| `T.surface4` | `#262626` | Chips, tags |
| `T.text` | `#ffffff` | Primary text |
| `T.textSub` | `#adaaaa` | Secondary text |
| `T.textMuted` | `#777575` | Placeholder / label text |
| `T.textInverse` | `#000000` | Text on lime backgrounds |
| `T.border` | `rgba(255,255,255,0.10)` | Borders |
| `T.glass` | `rgba(38,38,38,0.4)` | Glassmorphism |
| `T.error` | `#ff7351` | Error states |

## Gradient Tokens

| Token | Colors | Use |
|-------|--------|-----|
| `T.gradDark` | `["#1a1919", "#0e0e0e"]` | Header backgrounds |
| `T.gradBrand` | `["#D4FF00", "#c4ec00"]` | Lime CTA buttons |

## Semantic Tokens (ALWAYS use — never raw T.primary as backgroundColor)

| Token | Value | When to use |
|-------|-------|-------------|
| `T.selBg` | lime | Background of selected chip / option card / filter pill |
| `T.selText` | black | Text/icon ON `T.selBg` |
| `T.selBorder` | lime | Border of selected element |
| `T.avatarBg` | lime | Initials circle background |
| `T.avatarText` | black | Letter inside initials circle |
| `T.ctaBg` | lime | Solid (non-gradient) CTA / submit / confirm button |
| `T.ctaText` | black | Text/icon on `T.ctaBg` |

**Rules:**
- `color: T.primary` (lime text on dark) = fine, leave it
- `colors={T.gradBrand}` gradient buttons = fine, do not replace
- Never use raw `T.primary` as `backgroundColor` for UI state

## Legacy Aliases

- `T.graphite` = `T.bg` = `#0e0e0e`
- `T.concrete` = `T.surface2` = `#1a1919`

## Fonts

- **Headlines:** `SpaceGrotesk_700Bold`
- **Labels / semibold:** `SpaceGrotesk_600SemiBold`
- Loaded in `app/_layout.tsx` via `useFonts`

## Responsive Utilities

`frontend/pocket/constants/responsive.ts` — base width 390px:
- `rw(px)` — responsive width/spacing
- `rf(size)` — responsive font size

All new screens use `rf()` for fonts, `rw()` for spacing/margins.

## Tab Bar Style

```typescript
tabBarStyle: {
  backgroundColor: "rgba(19,19,19,0.97)",
  borderTopWidth: 1,
  borderTopColor: T.border,
  height: 64,
  marginHorizontal: 16,
  marginBottom: 20,
  borderRadius: 24,
  elevation: 12,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.4,
  shadowRadius: 20,
}
```

Active tint: `T.primary`. Floating pill with shadow at bottom of screen.

## Momentum Band Colors (6-band, 0–1000)

| Band | Range | Hex | Usage |
|------|-------|-----|-------|
| Newcomer | 0–99 | `#777575` | gray |
| Building | 100–299 | `#ff7351` | coral |
| Reliable | 300–499 | `#8097ff` | cobalt |
| Trusted | 500–699 | `#FFC83D` | amber |
| Elite | 700–899 | `#D4FF00` | lime |
| Legend | 900–1000 | `#ffffff` | white |

Config: `frontend/pocket/constants/momentum.ts` (keep in sync with `backend/api/app/momentum/config.py`)

## JobCard — Explore Variant

- Category gradient color block header (height 72)
- Language tags: lime-tinted
- Gender tag: cobalt-tinted
- Everything centered (badges, title, company, description, pay, tags)
- Details (date/time/venue): icons size 15 in `T.primary`, text size 15 bold
- Apply overlay: lime `rgba(212,255,0,0.92)` with black icon/text
- Nav overlays: deep cobalt `rgba(45,91,255,0.80)` with white icons

## SwipeableJobCard

- Apply overlay: lime `rgba(212,255,0,0.92)` — black icon/text
- Nav overlays: deep cobalt `rgba(45,91,255,0.80)` — white icons
- When `canApply=false`: grey overlay + lock icon + "Host Mode" label

## SkillGraph (Arena screen)

- 5-axis radar chart using `react-native-svg`
- Score in center (band color), band label below
- Data polygon: band color fill at 18% opacity, 1.5px stroke
- Axis labels: SVG text, `rf(8.5)`, 0.75 opacity for data axes, 0.35 for no-data axes
- Rings: 4 concentric polygons at 25/50/75/100% of maxR
