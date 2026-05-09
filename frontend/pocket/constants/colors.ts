// Kria Color Palette
// Theme: Solar Flare — deep black, electric lime primary, white/obsidian secondary
// Dark backgrounds, neon lime accent, glassmorphism surfaces
//
// Usage: import { T } from "@/constants/colors"
//   T.primary     → electric lime #D4FF00
//   T.secondary   → white #ffffff
//   T.bg          → deep background #0e0e0e
//   T.text        → white #ffffff
//   T.gradBrand   → lime gradient

// ─────────────────────────────────────────────────────────────────────────────
// Internal full palette
// ─────────────────────────────────────────────────────────────────────────────

const palette = {
  // Primary — Electric Lime
  primary: {
    DEFAULT:   "#D4FF00",
    container: "#c4ec00",
    dim:       "#a8cc00",
    fixed:     "#d1fc00",
    50:  "#f9ffe0",
    100: "#f2ffc0",
    200: "#e8ff80",
    300: "#D4FF00",
    400: "#c4ec00",
    500: "#a8cc00",
    600: "#7a9600",
    700: "#556800",
    800: "#3c4a00",
    900: "#2a3300",
  },
  // Secondary — White / Obsidian
  secondary: {
    DEFAULT:   "#ffffff",
    container: "#262626",   // obsidian — dark surface / CTA backgrounds
    dim:       "#1a1919",   // deep obsidian
    50:  "#f5f5f5",
    100: "#ebebeb",
    200: "#d4d4d4",
    300: "#b0b0b0",
    400: "#8a8a8a",
    500: "#666666",
    600: "#444444",
    700: "#2c2c2c",
    800: "#1a1a1a",
    900: "#111111",
  },
  // Tertiary — Amber
  tertiary: {
    DEFAULT:   "#ffeb9c",
    container: "#fcdc43",
    dim:       "#edce35",
  },
  // Error / Coral
  error: "#ff7351",
  // Backgrounds (darkest → lightest)
  bg:      "#0e0e0e",
  surface0: "#000000",
  surface1: "#131313",
  surface2: "#1a1919",
  surface3: "#201f1f",
  surface4: "#262626",
  surface5: "#2c2c2c",
  // Text
  text: {
    primary:   "#ffffff",
    secondary: "#adaaaa",
    muted:     "#777575",
    inverse:   "#000000",   // black on lime
    onPrimary: "#000000",
  },
  // Borders
  border:       "rgba(255,255,255,0.10)",
  borderStrong: "rgba(255,255,255,0.20)",
  // Glass
  glass:   "rgba(38,38,38,0.4)",
  glassHi: "rgba(255,255,255,0.05)",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// T — flat theme variables (the only import screens need)
// ─────────────────────────────────────────────────────────────────────────────

export const T = {
  // ── Primary lime
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

  // ── Secondary white/obsidian
  secondary:          palette.secondary.DEFAULT,
  secondaryContainer: palette.secondary.container,
  secondaryDim:       palette.secondary.dim,   // deep obsidian #1a1919
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

  // ── Tertiary amber
  tertiary:          palette.tertiary.DEFAULT,
  tertiaryContainer: palette.tertiary.container,

  // ── Legacy aliases (keep old screens compiling)
  graphite: palette.surface0,    // was #111111 → now #000000
  concrete: palette.surface4,    // was #2B2B2B → now #262626
  steel:    palette.text.muted,  // was #6B7280 → now #777575

  // ── Accent = lime (replaces old signal yellow/cyan)
  accent:      palette.primary.DEFAULT,
  accentLight: palette.primary[200],
  accentDark:  palette.primary.container,

  // ── Semantic
  success: palette.primary.DEFAULT,  // lime for pay/success on dark
  warning: palette.tertiary.DEFAULT, // amber for warnings
  error:   palette.error,

  // ── Surfaces
  bg:       palette.bg,
  surface:  palette.surface2,   // general surface
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

  // ── Semantic: selected / active option state
  // Used for chips, cards, pills, option buttons when selected.
  // Change these two lines to retheme every selected state in the app.
  selBg:     palette.primary.DEFAULT,   // background of selected element  → lime
  selText:   palette.text.onPrimary,    // text / icon on selBg             → black
  selBorder: palette.primary.DEFAULT,   // border of selected element       → lime

  // ── Semantic: avatar / initials circle
  // Used for user initials circles throughout the app.
  avatarBg:   palette.primary.DEFAULT,  // initials circle background       → lime
  avatarText: palette.text.onPrimary,   // letter on avatarBg               → black

  // ── Semantic: primary action button (non-gradient)
  // Used for solid-background CTA buttons (submit, confirm, done).
  ctaBg:   palette.primary.DEFAULT,     // solid button background          → lime
  ctaText: palette.text.onPrimary,      // button label                     → black

  // ── Momentum accent (lime)
  momentum:      palette.primary.DEFAULT,
  momentumLight: "rgba(212,255,0,0.15)",

  // ── Gradient arrays
  gradBrand:    ["#D4FF00", "#c4ec00"] as const,            // Lime gradient
  gradObsidian:   ["#262626", "#1a1919"] as const,           // Obsidian gradient
  gradLimeWhite: ["#D4FF00", "#ffffff"] as const,            // Lime → white (progress)
  gradFire:     ["#ffeb9c", "#ff7351"] as const,            // Amber → coral
  gradDark:     ["#1a1919", "#0e0e0e"] as const,            // Dark surface gradient
  gradPrimary:  ["#D4FF00", "#c4ec00"] as const,            // Primary lime
  gradAccent:   ["#D4FF00", "#ffffff"] as const,            // Lime to white
  gradGlass:    ["rgba(38,38,38,0.7)", "rgba(20,20,20,0.9)"] as const,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Category colors — neon/vibrant on black
// ─────────────────────────────────────────────────────────────────────────────

export const CategoryColors: Record<string, string> = {
  // Event & Promotion
  event_registration:    "#D4FF00",  // Lime
  usher:                 "#c4ec00",  // Lime dim
  booth_staff:           "#a8f060",  // Yellow-green
  promoter:              "#ffeb9c",  // Amber
  sampling_promoter:     "#fde68a",  // Light yellow
  lead_collection:       "#c084fc",  // Purple
  event_helper:          "#777575",  // Muted
  // Hospitality
  hospitality_staff:     "#fb923c",  // Warm orange
  guest_management:      "#fdba74",  // Peach
  front_desk:            "#fcd34d",  // Gold
  // Technical Support
  event_tech_support:    "#b0b0b0",  // Light silver
  sound_light_assistant: "#94a3b8",  // Slate
  // Media & Content
  photographer:          "#ff7351",  // Coral
  videographer:          "#f97316",  // Orange
  social_media_creator:  "#f472b6",  // Pink
  // Stage & Hosting
  emcee:                 "#8097ff",  // Cobalt
  other:                 "#adaaaa",  // Gray
};

// ─────────────────────────────────────────────────────────────────────────────
// Colors — kept for rare full-palette access
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
