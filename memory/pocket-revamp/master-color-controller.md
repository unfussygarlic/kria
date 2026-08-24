---
name: Master Color Controller
description: How the palettes.ts preset system works. Read to try new colors or add a preset.
type: project
---

# Master Color Controller

File: [`frontend/pocket/constants/palettes.ts`](../../frontend/pocket/constants/palettes.ts)

## What it is

A single-file switchboard for the Pocket light theme. Instead of editing 30 color tokens across `colors.ts`, you edit one line in `palettes.ts` to try an entirely different palette.

## How to swap presets

```ts
// constants/palettes.ts, near the bottom:
export const ACTIVE_PRESET: PresetKey = "blush_ink";
                                         //  ↑
                                         //  change to any key in LIGHT_PRESETS
```

Then:

```bash
cd frontend/pocket
npx expo start --clear   # --clear is REQUIRED — Metro caches StyleSheets
```

Reload the app on your device. Every screen picks up the new palette instantly because `colors.ts` derives the light `T.*` tokens from the active preset at module init.

## The 6-value contract

Each preset supplies six required colors:

| Field | Role |
|---|---|
| `primary` | Main brand color. Buttons, chips, money text, hero gradient start. |
| `deep` | Darker cousin of primary. Gradient end + pressed state. Usually ~25% darker. |
| `bg` | Whole page canvas. Off-white with a hint of the primary hue is usually best. |
| `surface` | Card / raised background. Almost always `#FFFFFF` so cards lift off the tinted canvas. |
| `text` | Primary text color. Near-black with a slight warm tint that matches the palette family. Must hit ≥4.5:1 contrast on `surface`. |
| `accent` | Secondary accent for tags, event badges, streak — anywhere that needs to differ from primary. Pick a color in a *different* hue family. |

Plus three optional overrides:

- `success` — Green for money/pay indicators. Defaults to `#059669`. Only override if your primary IS green.
- `error` — Red for validation errors. Defaults to `#DC2626`. Only override if your primary IS red.
- `shadow` — Card shadow tint. Defaults to warm plum `#3E1230`. Set to a very dark version of your primary hue if the default clashes.

## Presets included out of the box

| Key | Vibe | Primary | Accent |
|---|---|---|---|
| `blush_ink` | Warm, confident, playful (**current default**) | Hot pink `#FF2D7A` | Violet `#7C3AED` |
| `cream_lime` | Original Kria brand — lime + cream | Electric lime `#D4FF00` | Amber `#FFB92E` |
| `ocean_coral` | Cool, fresh, professional | Deep blue `#0F7BFF` | Coral `#FF6B4A` |
| `forest_amber` | Earthy, natural, grounded | Deep green `#0F7A3D` | Amber `#EA8B00` |
| `sunrise_plum` | Energetic, warm, cheerful | Warm orange `#FF7A00` | Plum `#9333EA` |
| `mono_red` | Editorial, monochrome, minimal | Near-black `#111111` | Red `#DC2626` |
| `slate_coral` | Professional with a warm accent | Slate `#334155` | Coral `#F87171` |
| `mint_violet` | Fresh, tech-forward | Mint `#10B981` | Violet `#8B5CF6` |

## Adding your own preset

1. Open `constants/palettes.ts`
2. Duplicate one of the entries in `LIGHT_PRESETS`
3. Give it a new key (lowercase snake_case) + `name` + `description`
4. Tweak `primary` / `deep` / `bg` / `surface` / `text` / `accent`
5. Optionally set `shadow`, `success`, `error`
6. Point `ACTIVE_PRESET` at your new key
7. `npx expo start --clear` + reload

### Picking colors that work together

Empirically what feels great:
- **Primary and accent from different hue families.** Pink+violet works (both cool-warm-ish neighbours). Green+red doesn't (fights). Blue+orange works (complements).
- **`bg` = primary tinted 3–5% into white.** e.g. `#FFF5F8` is pink tinted into white. Feels warmer than pure `#FFFFFF`.
- **`text` = primary hue's near-black.** For pink primary, `#171217` (slight red tint). For blue, `#0B1220`. This makes text feel part of the palette family instead of an alien black.
- **`deep` = primary darkened 20–30% (not 50%).** Too-deep gradients look muddy.

Contrast-check every preset before shipping:
- `text` on `surface` must hit **≥4.5:1** (WCAG AA body)
- `text` on `primary` must hit **≥4.5:1** (that's how the "obsidian on colored button" pattern stays readable)

Free tool: [contrast-ratio.com](https://contrast-ratio.com/) — paste hex, get ratio.

## What auto-derives from the preset

Once you set the 6 core values, `colors.ts` auto-computes:

- **`T.primary.50 – 900`** — a 9-step scale between white → primary → deep → black. Used by `MomentumChipRow` and a couple other places.
- **`T.secondary.50 – 900`** — a 9-step scale from text near-black up to white. Used for typography contrast steps.
- **`T.text.secondary`** — text mixed 45% into the canvas (warm mid-gray in the palette family)
- **`T.text.muted`** — text mixed 62% into the canvas (light gray)
- **`T.surface2 – 5`** — surface with 5%, 10%, 16%, 24% of the primary hue blended in (for input backgrounds, muted rows)
- **`T.border`** — 6% opacity of text color
- **`T.borderStrong`** — 10% opacity (still subtle — don't use as a visible outline)
- **All gradient tokens** — `gradBrand` / `gradPrimary` / `gradAccent` / `gradFire` all derive from `primary` / `deep` / `accent`
- **Two category-color slots** (`event_registration`, `booth_staff`) — follow the preset. The rest of `CategoryColors` is stable across presets so users still identify Hospitality/Photography by the same hue.

## Anti-patterns (things NOT to do with the controller)

- ❌ **Don't hardcode preset colors in individual files.** If you find yourself typing `#FF2D7A` in a screen, replace with `T.primary` — that way the preset swap actually works.
- ❌ **Don't set `success` or `error` unless your primary genuinely clashes.** The defaults (emerald + true-red) are semantically correct across almost every palette.
- ❌ **Don't test only in the Simulator.** Preset choice reads at module init; StyleSheets are cached. Always `npx expo start --clear` between preset changes.

## Extending the system later

Things not currently supported that would be easy adds if we need them:

- **A dark-preset controller** — right now dark theme is one hardcoded "Solar Flare" palette. Could mirror the light controller if we ever want dark alternates.
- **Multi-brand switching** — right now the preset is a compile-time constant. Could become a runtime pick (like the light/dark toggle already does) if we ever ship white-label variants.
- **Category color re-skin per preset** — right now only 2 category slots track the preset. Could auto-derive all 15+ via HSL rotation off the primary if categories start clashing on a specific preset.

Not done yet because no one has asked. When someone does, the extension points are `palettes.ts` + `colors.ts` — nothing at the screen level.
