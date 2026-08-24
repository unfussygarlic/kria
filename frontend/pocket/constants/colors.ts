// Kria Color Palette
//
// ── Runtime theme selection ──────────────────────────────────────────────────
// Pocket ships **light as the default**, with a dark mode opt-in surfaced in
// Settings. We use a synchronous read from SecureStore at module init so the
// exported `T` object is already the correct theme before any screen mounts.
// A toggle in Settings persists the choice and reloads the JS bundle, which
// re-runs this module and re-imports the right palette across every screen —
// avoiding a 55-file `useTheme()` refactor.
//
// Usage: `import { T } from "@/constants/colors"` — unchanged from before.
//   T.primary     → deep emerald green (was electric lime in v1)
//   T.secondary   → obsidian (near-black warm neutral)
//   T.bg          → milk white (was #0e0e0e)
//   T.text        → obsidian (was #ffffff)
//   T.gradBrand   → emerald gradient
//
// To flip: `setStoredTheme("dark")` then call `reloadForTheme()` from
// constants/theme.ts — both live there, kept out of this file to keep the
// palette definitions pure.

import * as SecureStore from "expo-secure-store";
import {
  getActivePreset,
  getActiveDarkPreset,
  type LightPreset,
  type DarkPreset,
} from "./palettes";

// ─────────────────────────────────────────────────────────────────────────────
// Sync preference read
// ─────────────────────────────────────────────────────────────────────────────

export const THEME_KEY = "kria:pocket-theme";
export type ThemeName = "light" | "dark";

/** Synchronous read at module init — do not call before init. */
function readActiveTheme(): ThemeName {
  try {
    // SecureStore.getItem (SDK 51+) is a sync alternative to getItemAsync.
    // Returns null if missing, or throws on some Android edge cases (which
    // we treat as "no preference stored" → default light).
    const stored = SecureStore.getItem(THEME_KEY);
    return stored === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export const activeTheme: ThemeName = readActiveTheme();

// ─────────────────────────────────────────────────────────────────────────────
// LIGHT palette — derived from the ACTIVE_PRESET in constants/palettes.ts
// ─────────────────────────────────────────────────────────────────────────────
// The user picks a preset (blush_ink, ocean_coral, forest_amber, ...) in
// palettes.ts. This block expands that 6-value preset into the full ~30-token
// palette shape the app expects, using small hex-math helpers so most
// derived values (tinted surfaces, muted text, borders, primary scale)
// stay proportional to the base colors.

// ── Hex-math helpers ────────────────────────────────────────────────────────

/** Parse "#RRGGBB" → [r, g, b] (0-255). */
function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function toHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const px = (n: number) => clamp(n).toString(16).padStart(2, "0");
  return `#${px(r)}${px(g)}${px(b)}`;
}
/** Blend two hex colors — t=0 → a, t=1 → b. */
function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  return toHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}
/** rgba() from a hex + alpha (0-1). */
function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
/** WCAG relative luminance (0–1). Used to pick contrasty foreground text. */
function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
/**
 * Pick the more-contrasty text color for a given background.
 * Uses the WCAG luminance threshold (~0.5) but nudged to 0.55 so a
 * mid-tone teal / plum defaults to *white* text (safer for hero surfaces
 * where you'd rather over-contrast than under-contrast).
 */
function textOn(bgHex: string, dark = "#111111", light = "#FFFFFF"): string {
  return luminance(bgHex) > 0.55 ? dark : light;
}
/** Text on a gradient — reference the darker endpoint so text stays legible across the sweep. */
function textOnGradient(a: string, b: string, dark = "#111111", light = "#FFFFFF"): string {
  const ref = luminance(a) < luminance(b) ? a : b;
  return textOn(ref, dark, light);
}

// ── Build palette_light from the active preset ─────────────────────────────

const preset: LightPreset = getActivePreset();

// Auto-derive a 9-step primary scale between white ↔ primary ↔ deep.
const primaryScale = {
  50:  mix("#FFFFFF", preset.primary, 0.06),
  100: mix("#FFFFFF", preset.primary, 0.14),
  200: mix("#FFFFFF", preset.primary, 0.30),
  300: mix("#FFFFFF", preset.primary, 0.55),
  400: mix("#FFFFFF", preset.primary, 0.80),
  500: preset.primary,
  600: mix(preset.primary, preset.deep, 0.5),
  700: preset.deep,
  800: mix(preset.deep, "#000000", 0.20),
  900: mix(preset.deep, "#000000", 0.40),
};

// Auto-derive a 9-step secondary scale from text (near-black) → white.
const secondaryScale = {
  50:  mix(preset.text, "#FFFFFF", 0.95),
  100: mix(preset.text, "#FFFFFF", 0.90),
  200: mix(preset.text, "#FFFFFF", 0.75),
  300: mix(preset.text, "#FFFFFF", 0.55),
  400: mix(preset.text, "#FFFFFF", 0.40),
  500: mix(preset.text, "#FFFFFF", 0.25),
  600: mix(preset.text, "#FFFFFF", 0.15),
  700: mix(preset.text, "#FFFFFF", 0.08),
  800: preset.text,
  900: mix(preset.text, "#000000", 0.30),
};

const palette_light = {
  primary: {
    DEFAULT:   preset.primary,
    container: preset.deep,
    dim:       preset.deep,
    fixed:     preset.primary,
    50:  primaryScale[50],
    100: primaryScale[100],
    200: primaryScale[200],
    300: primaryScale[300],
    400: primaryScale[400],
    500: primaryScale[500],
    600: primaryScale[600],
    700: primaryScale[700],
    800: primaryScale[800],
    900: primaryScale[900],
  },
  secondary: {
    DEFAULT:   preset.text,
    container: secondaryScale[700],
    dim:       secondaryScale[900],
    50:  secondaryScale[50],
    100: secondaryScale[100],
    200: secondaryScale[200],
    300: secondaryScale[300],
    400: secondaryScale[400],
    500: secondaryScale[500],
    600: secondaryScale[600],
    700: secondaryScale[700],
    800: secondaryScale[800],
    900: secondaryScale[900],
  },
  tertiary: {
    DEFAULT:   preset.accent,
    container: mix(preset.accent, "#FFFFFF", 0.15),
    dim:       mix(preset.accent, "#000000", 0.15),
  },
  error: preset.error ?? "#DC2626",
  bg:       preset.bg,
  surface0: preset.surface,
  surface1: preset.surface,
  // Slightly-tinted variants — blend the primary hue into surface so input
  // backgrounds feel from the same family as the CTA colors.
  surface2: mix(preset.surface, preset.primary, 0.05),
  surface3: mix(preset.surface, preset.primary, 0.10),
  surface4: mix(preset.surface, preset.primary, 0.16),
  surface5: mix(preset.surface, preset.primary, 0.24),
  text: {
    primary:   preset.text,
    // Warm-gray hierarchy — auto-blended toward the canvas so it inherits
    // the palette's family (pink family → pinkish grays, blue → cool grays).
    secondary: mix(preset.text, preset.bg, 0.45),
    muted:     mix(preset.text, preset.bg, 0.62),
    inverse:   "#FFFFFF",
    // ── Foreground on primary/accent/deep/gradient — LUMINANCE-AWARE ──────
    // The old version hardcoded `preset.text` for onPrimary. That breaks
    // for presets where primary and text are both dark (mono_red: primary
    // #111 + text #111 → invisible selText, ctaText, avatarText).
    // Now each "on*" token defaults to white/near-black based on the
    // background's luminance, and each preset can override explicitly.
    onPrimary:     preset.onPrimary     ?? textOn(preset.primary, preset.text, "#FFFFFF"),
    onAccent:      preset.onAccent      ?? textOn(preset.accent,  preset.text, "#FFFFFF"),
    onDeep:        preset.onDeep        ?? textOn(preset.deep,    preset.text, "#FFFFFF"),
    onGradAccent:  preset.onGradAccent  ?? textOnGradient(preset.primary, preset.accent, preset.text, "#FFFFFF"),
    onGradBrand:   preset.onGradBrand   ?? textOnGradient(preset.primary, preset.deep,   preset.text, "#FFFFFF"),
  },
  // Borders: subtle hairlines only. The old obsidian-outline system read
  // as amateur-hour; modern apps separate cards with SHADOWS not lines.
  border:       withAlpha(preset.text, 0.06),
  borderStrong: withAlpha(preset.text, 0.10),
  // Solid surfaces only — glass tokens kept for backwards compat but
  // resolve to solid values in light mode.
  glass:   preset.surface,
  glassHi: preset.surface,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// DARK palette — derived from the ACTIVE_DARK_PRESET in constants/palettes.ts
// ─────────────────────────────────────────────────────────────────────────────
// Same derivation pattern as `palette_light`, just with dark-appropriate
// semantics: surfaces step LIGHTER from `bg` (not tinted by primary), text
// hierarchy blends toward `bg` instead of surface, borders use rgba(text).

const darkPreset: DarkPreset = getActiveDarkPreset();

// Auto-derive a 9-step primary scale (same math as light).
const darkPrimaryScale = {
  50:  mix("#FFFFFF", darkPreset.primary, 0.06),
  100: mix("#FFFFFF", darkPreset.primary, 0.14),
  200: mix("#FFFFFF", darkPreset.primary, 0.30),
  300: mix("#FFFFFF", darkPreset.primary, 0.55),
  400: mix("#FFFFFF", darkPreset.primary, 0.80),
  500: darkPreset.primary,
  600: mix(darkPreset.primary, darkPreset.deep, 0.5),
  700: darkPreset.deep,
  800: mix(darkPreset.deep, "#000000", 0.20),
  900: mix(darkPreset.deep, "#000000", 0.40),
};

// Auto-derive a 9-step secondary (near-white → grey) scale from text.
const darkSecondaryScale = {
  50:  darkPreset.text,
  100: mix(darkPreset.text, darkPreset.bg, 0.08),
  200: mix(darkPreset.text, darkPreset.bg, 0.20),
  300: mix(darkPreset.text, darkPreset.bg, 0.35),
  400: mix(darkPreset.text, darkPreset.bg, 0.50),
  500: mix(darkPreset.text, darkPreset.bg, 0.65),
  600: mix(darkPreset.text, darkPreset.bg, 0.78),
  700: mix(darkPreset.text, darkPreset.bg, 0.87),
  800: mix(darkPreset.text, darkPreset.bg, 0.93),
  900: darkPreset.bg,
};

// Surfaces — stepped lightness from `bg` toward white. Ratios picked so
// Solar Flare (bg=#0e0e0e) reproduces the original Kria hex values
// (surface1≈#131313, surface2≈#1a1a1a, surface3≈#20, surface4≈#26,
// surface5≈#2c). Any dark preset scales proportionally.
const darkSurfaceStep = (t: number) => mix(darkPreset.bg, "#FFFFFF", t);

const palette_dark = {
  primary: {
    DEFAULT:   darkPreset.primary,
    container: darkPreset.deep,
    dim:       mix(darkPreset.deep, "#000000", 0.20),
    fixed:     darkPreset.primary,
    50:  darkPrimaryScale[50],
    100: darkPrimaryScale[100],
    200: darkPrimaryScale[200],
    300: darkPrimaryScale[300],
    400: darkPrimaryScale[400],
    500: darkPrimaryScale[500],
    600: darkPrimaryScale[600],
    700: darkPrimaryScale[700],
    800: darkPrimaryScale[800],
    900: darkPrimaryScale[900],
  },
  secondary: {
    DEFAULT:   darkPreset.text,
    container: darkSurfaceStep(0.10),
    dim:       darkSurfaceStep(0.05),
    50:  darkSecondaryScale[50],
    100: darkSecondaryScale[100],
    200: darkSecondaryScale[200],
    300: darkSecondaryScale[300],
    400: darkSecondaryScale[400],
    500: darkSecondaryScale[500],
    600: darkSecondaryScale[600],
    700: darkSecondaryScale[700],
    800: darkSecondaryScale[800],
    900: darkSecondaryScale[900],
  },
  tertiary: {
    DEFAULT:   darkPreset.accent,
    container: mix(darkPreset.accent, "#000000", 0.15),
    dim:       mix(darkPreset.accent, "#000000", 0.30),
  },
  error: darkPreset.error ?? "#ff7351",
  bg:       darkPreset.bg,
  surface0: mix(darkPreset.bg, "#000000", 0.5),   // even darker than bg
  surface1: darkSurfaceStep(0.020),
  surface2: darkSurfaceStep(0.050),
  surface3: darkSurfaceStep(0.075),
  surface4: darkSurfaceStep(0.100),
  surface5: darkSurfaceStep(0.125),
  text: {
    primary:   darkPreset.text,
    // Muted variants — blend text into bg (not surface) so hierarchy holds
    // across every surface level.
    secondary: mix(darkPreset.text, darkPreset.bg, 0.32),
    muted:     mix(darkPreset.text, darkPreset.bg, 0.55),
    inverse:   "#000000",
    // Foreground-on-* — luminance-aware, same as light. Dark presets flip
    // to near-BLACK text on bright fills (lime primary, cream accent, etc.),
    // or WHITE if the fill happens to be dark (unusual for a dark preset).
    onPrimary:     darkPreset.onPrimary     ?? textOn(darkPreset.primary, "#000000", darkPreset.text),
    onAccent:      darkPreset.onAccent      ?? textOn(darkPreset.accent,  "#000000", darkPreset.text),
    onDeep:        darkPreset.onDeep        ?? textOn(darkPreset.deep,    "#000000", darkPreset.text),
    onGradAccent:  darkPreset.onGradAccent  ?? textOnGradient(darkPreset.primary, darkPreset.accent, "#000000", darkPreset.text),
    onGradBrand:   darkPreset.onGradBrand   ?? textOnGradient(darkPreset.primary, darkPreset.deep,   "#000000", darkPreset.text),
  },
  border:       withAlpha(darkPreset.text, 0.08),
  borderStrong: withAlpha(darkPreset.text, 0.14),
  glass:        withAlpha(darkSurfaceStep(0.14), 0.4),
  glassHi:      withAlpha(darkPreset.text, 0.05),
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Build T from the active palette. Structure is identical to the pre-existing
// dark-only T so every screen keeps compiling without a rename.
// ─────────────────────────────────────────────────────────────────────────────

type Palette = typeof palette_dark;
const palette: Palette = activeTheme === "dark" ? palette_dark : (palette_light as unknown as Palette);

// Gradients — both themes now derive from their active preset. Same
// contract: [start, end]. Naming is legacy from the Solar Flare days
// (gradLimeWhite doesn't literally mean "lime + white" anymore — for a
// non-lime dark preset it's just "primary + text/canvas contrast pair").
const _lightSecondaryDark = mix(preset.text, "#000000", 0.10);
const _darkSurfaceHi = mix(darkPreset.bg, "#FFFFFF", 0.14);
const _darkSurfaceLo = mix(darkPreset.bg, "#FFFFFF", 0.05);

const gradBrand    = activeTheme === "dark"
  ? [darkPreset.primary, darkPreset.deep] as const
  : [preset.primary, preset.deep] as const;

const gradObsidian = activeTheme === "dark"
  ? [_darkSurfaceHi, _darkSurfaceLo] as const
  : [_lightSecondaryDark, preset.text] as const;

// "gradLimeWhite" (legacy name) — the neon-on-radiant-white hero moment.
// In dark it's primary → text (bright vs bright — reads as a luminous card).
const gradLimeWhite = activeTheme === "dark"
  ? [darkPreset.primary, darkPreset.text] as const
  : [preset.primary, "#FFFFFF"] as const;

const gradFire     = activeTheme === "dark"
  ? [darkPreset.accent, darkPreset.error ?? "#ff7351"] as const
  : [preset.primary, preset.accent] as const;

const gradDark     = activeTheme === "dark"
  ? [_darkSurfaceLo, darkPreset.bg] as const
  : [_lightSecondaryDark, preset.text] as const;

const gradPrimary  = activeTheme === "dark"
  ? [darkPreset.primary, darkPreset.deep] as const
  : [preset.primary, preset.deep] as const;

// Accent gradient — the brand-defining hero. primary → accent in both themes.
const gradAccent   = activeTheme === "dark"
  ? [darkPreset.primary, darkPreset.accent] as const
  : [preset.primary, preset.accent] as const;

const gradGlass    = activeTheme === "dark"
  ? [withAlpha(_darkSurfaceHi, 0.7), withAlpha(darkPreset.bg, 0.9)] as const
  : [withAlpha(preset.surface, 0.82), withAlpha(preset.bg, 0.94)] as const;

// Momentum accent tint — 14% of primary over surface. Auto-adapts per preset.
const momentumLight = activeTheme === "dark"
  ? withAlpha(darkPreset.primary, 0.15)
  : withAlpha(preset.primary, 0.14);

// Softer variants of the "on gradient" tokens — for muted subtitles / meta
// text inside hero cards. Computed at 85% / 65% alpha of the base "on"
// choice so they auto-flip between white / near-black per luminance and
// track whichever active preset (light or dark) is loaded.
const _onGradAccentBase = activeTheme === "dark"
  ? (palette_dark.text as any).onGradAccent as string
  : (palette_light.text as any).onGradAccent as string;
const _onGradBrandBase  = activeTheme === "dark"
  ? (palette_dark.text as any).onGradBrand as string
  : (palette_light.text as any).onGradBrand  as string;
const onGradAccentSoft  = withAlpha(_onGradAccentBase, 0.85);
const onGradAccentMuted = withAlpha(_onGradAccentBase, 0.65);
const onGradBrandSoft   = withAlpha(_onGradBrandBase,  0.85);

// Money / success — universally reads green.
//   • Dark: preset.success ?? emerald #22c55e (non-lime dark presets should
//     leave the default; Solar Flare declares success: "#D4FF00" so its
//     lime primary doubles as success and stays in-family).
//   • Light: preset.success ?? emerald #059669 (bright emerald reads better
//     on white than dark emerald on black).
const successColor = activeTheme === "dark"
  ? (darkPreset.success ?? "#22c55e")
  : (preset.success  ?? "#059669");

export const T = {
  // ── Primary (lime in dark, emerald in light)
  primary:          palette.primary.DEFAULT,
  primaryContainer: palette.primary.container,
  primaryDim:       palette.primary.dim,
  primary50:  palette.primary[50],
  primary100: palette.primary[100],
  primary200: palette.primary[200],
  primary300: palette.primary[300],
  primary400: palette.primary[400],
  primary500: palette.primary[500],
  primary600: palette.primary[600],
  primary700: palette.primary[700],
  primary800: palette.primary[800],
  primary900: palette.primary[900],

  // ── Secondary (white in dark, obsidian in light)
  secondary:          palette.secondary.DEFAULT,
  secondaryContainer: palette.secondary.container,
  secondaryDim:       palette.secondary.dim,
  secondary50:  palette.secondary[50],
  secondary100: palette.secondary[100],
  secondary200: palette.secondary[200],
  secondary300: palette.secondary[300],
  secondary400: palette.secondary[400],
  secondary500: palette.secondary[500],
  secondary600: palette.secondary[600],
  secondary700: palette.secondary[700],
  secondary800: palette.secondary[800],
  secondary900: palette.secondary[900],

  // ── Tertiary (amber in dark, burnt caramel in light)
  tertiary:          palette.tertiary.DEFAULT,
  tertiaryContainer: palette.tertiary.container,

  // ── Legacy aliases
  graphite: palette.surface0,
  concrete: palette.surface4,
  steel:    palette.text.muted,

  // ── Accent
  accent:      palette.primary.DEFAULT,
  accentLight: palette.primary[200],
  accentDark:  palette.primary.container,

  // ── Semantic
  // success stays green in light mode even though primary is coral — money
  // and completion universally read green; using coral here would confuse
  // it with regular CTAs. In dark mode, lime primary IS the success color.
  success: successColor,
  warning: palette.tertiary.DEFAULT,
  error:   palette.error,

  // ── Surfaces
  bg:       palette.bg,
  surface:  palette.surface2,
  surface1: palette.surface1,
  surface2: palette.surface2,
  surface3: palette.surface3,
  surface4: palette.surface4,
  border:   palette.border,
  borderStrong: palette.borderStrong,

  // ── Glass
  glass:   palette.glass,
  glassHi: palette.glassHi,

  // ── Text
  text:          palette.text.primary,
  textSub:       palette.text.secondary,
  textMuted:     palette.text.muted,
  textInverse:   palette.text.inverse,
  textOnPrimary: palette.text.onPrimary,

  // ── Foreground-on-* — luminance-aware, safe for any palette.
  // Use these instead of hardcoding "#FFFFFF" on gradient hero cards
  // (e.g. NextShiftHero, Profile momentum card, earnings hero, wallet).
  onPrimary:    palette.text.onPrimary,
  onAccent:     palette.text.onAccent,
  onDeep:       palette.text.onDeep,
  onGradAccent: palette.text.onGradAccent,
  onGradBrand:  palette.text.onGradBrand,
  // Soft / muted alpha variants — for subtitles and meta text inside
  // hero cards. Flip automatically with the underlying "on" token.
  onGradAccentSoft,
  onGradAccentMuted,
  onGradBrandSoft,

  // ── Selected / active option state
  selBg:     palette.primary.DEFAULT,
  selText:   palette.text.onPrimary,
  selBorder: palette.primary.DEFAULT,

  // ── Avatar
  avatarBg:   palette.primary.DEFAULT,
  avatarText: palette.text.onPrimary,

  // ── Primary CTA
  ctaBg:   palette.primary.DEFAULT,
  ctaText: palette.text.onPrimary,

  // ── Momentum accent
  momentum:      palette.primary.DEFAULT,
  momentumLight: momentumLight,

  // ── Gradients
  gradBrand,
  gradObsidian,
  gradLimeWhite,
  gradFire,
  gradDark,
  gradPrimary,
  gradAccent,
  gradGlass,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Category colors — theme-adapted
// ─────────────────────────────────────────────────────────────────────────────
// Same identity across themes; light-mode variants are muted / less neon so
// they read well on white without vibrating.

const CategoryColors_dark: Record<string, string> = {
  event_registration:    "#D4FF00",
  usher:                 "#c4ec00",
  booth_staff:           "#a8f060",
  promoter:              "#ffeb9c",
  sampling_promoter:     "#fde68a",
  lead_collection:       "#c084fc",
  event_helper:          "#777575",
  hospitality_staff:     "#fb923c",
  guest_management:      "#fdba74",
  front_desk:            "#fcd34d",
  event_tech_support:    "#b0b0b0",
  sound_light_assistant: "#94a3b8",
  photographer:          "#ff7351",
  videographer:          "#f97316",
  social_media_creator:  "#f472b6",
  emcee:                 "#8097ff",
  other:                 "#adaaaa",
};

// Light-mode categories: the two most-visible slots follow the active
// preset so category chips align with the palette. The rest keep a stable
// vibrant mix that reads well against any preset — swapping the palette
// won't change how the user identifies "hospitality" or "photography".
const CategoryColors_light: Record<string, string> = {
  event_registration:    preset.primary,           // ← follows active preset
  usher:                 mix(preset.primary, "#FFFFFF", 0.25),
  booth_staff:           preset.accent,            // ← follows active preset
  promoter:              "#FFB92E",   // amber
  sampling_promoter:     "#FCD34D",   // sunny yellow
  lead_collection:       "#A855F7",   // soft violet
  event_helper:          "#C4C0B5",   // warm grey
  hospitality_staff:     "#FB923C",   // peach
  guest_management:      "#FDBA74",   // light peach
  front_desk:            "#FCD34D",   // gold
  event_tech_support:    "#94A3B8",   // slate
  sound_light_assistant: "#64748B",   // deep slate
  photographer:          "#F472B6",   // pink
  videographer:          "#FB7185",   // rose
  social_media_creator:  "#F0ABFC",   // light magenta
  emcee:                 "#8097FF",   // cobalt
  other:                 "#C4C0B5",   // warm grey
};

export const CategoryColors: Record<string, string> =
  activeTheme === "dark" ? CategoryColors_dark : CategoryColors_light;

// ─────────────────────────────────────────────────────────────────────────────
// Legacy Colors export
// ─────────────────────────────────────────────────────────────────────────────
/** @deprecated Use T instead */
export const Colors = {
  primary:    palette.primary,
  secondary:  palette.secondary,
  error:      palette.error,
  background: palette.bg,
  surface:    palette.surface2,
  border:     palette.border,
  text:       palette.text,
  graphite:   palette.surface0,
  concrete:   palette.surface4,
  steel:      palette.text.muted,
  gradients: {
    brand:   T.gradBrand,
    fire:    T.gradFire,
    dark:    T.gradDark,
    primary: T.gradPrimary,
    accent:  T.gradAccent,
  },
} as const;
