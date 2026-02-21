// Kriya Color Palette
// Theme: Burnt Orange + Graphite — bold, industrial, high-contrast
// Light mode only - vibrant primary with dark neutrals
//
// Usage: import { T } from "@/constants/colors"
//   T.primary     → burnt orange #F05A28
//   T.graphite    → graphite black #111111
//   T.bg          → background
//   T.text        → primary text
//   T.accent      → signal yellow #FFC83D
//   T.gradBrand   → burnt orange gradient for LinearGradient

// ─────────────────────────────────────────────────────────────────────────────
// Internal full palette (used to build T below; rarely imported directly)
// ─────────────────────────────────────────────────────────────────────────────

const palette = {
  // Primary - Burnt Orange
  primary: {
    DEFAULT: "#F05A28",
    50:  "#FFF4EE",
    100: "#FFE6D5",
    200: "#FFCBAA",
    300: "#FFA574",
    400: "#FF7A3C",
    500: "#F05A28",
    600: "#E03E0E",
    700: "#B82F0C",
    800: "#942812",
    900: "#7A2412",
  },
  // Secondary - Graphite & Concrete Grays
  secondary: {
    DEFAULT: "#2B2B2B",  // Concrete Gray
    50:  "#F9F9F9",
    100: "#F3F3F3",
    200: "#E5E5E5",
    300: "#D4D4D4",
    400: "#A3A3A3",
    500: "#6B7280",      // Steel Gray
    600: "#2B2B2B",      // Concrete Gray
    700: "#1F1F1F",
    800: "#171717",
    900: "#111111",      // Graphite Black
  },
  // Accent - Signal Yellow
  accent: {
    DEFAULT: "#FFC83D",
    light:   "#FFE89D",
    dark:    "#E6A500",
  },
  success: "#16A34A",
  warning: "#FFC83D",  // Use Signal Yellow for warnings
  error:   "#DC2626",
  background: "#FAFAFA",
  surface:    "#FFFFFF",
  border:     "#E5E5E5",
  // Graphite (primary dark)
  graphite: "#111111",
  concrete: "#2B2B2B",
  steel:    "#6B7280",
  text: {
    primary:   "#111111",  // Graphite Black
    secondary: "#2B2B2B",  // Concrete Gray
    muted:     "#6B7280",  // Steel Gray
    inverse:   "#FFFFFF",
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// T — flat theme variables (the only import screens need)
// ─────────────────────────────────────────────────────────────────────────────

export const T = {
  // ── Primary burnt orange
  primary:    palette.primary.DEFAULT,
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

  // ── Secondary grays (graphite & concrete)
  secondary:    palette.secondary.DEFAULT,
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

  // ── Named dark colors
  graphite: palette.graphite,  // #111111
  concrete: palette.concrete,  // #2B2B2B
  steel:    palette.steel,     // #6B7280

  // ── Accent (Signal Yellow)
  accent:      palette.accent.DEFAULT,
  accentLight: palette.accent.light,
  accentDark:  palette.accent.dark,

  // ── Semantic
  success: palette.success,
  warning: palette.warning,
  error:   palette.error,

  // ── Surfaces
  bg:      palette.background,
  surface: palette.surface,
  border:  palette.border,

  // ── Text
  text:        palette.text.primary,
  textSub:     palette.text.secondary,
  textMuted:   palette.text.muted,
  textInverse: palette.text.inverse,

  // ── Momentum (FICO-style trust score)
  // Used for the "Momentum Boost" badge and generic momentum UI accents.
  // Band-specific colors live in constants/momentum.ts.
  momentum:      "#FFC83D",   // Signal yellow — boost / default Momentum accent
  momentumLight: "#FFF0C0",   // Light yellow — boost badge background

  // ── Gradient arrays (pass directly to LinearGradient colors prop)
  gradBrand:    ["#FF7A3C", "#F05A28"] as const,           // Burnt orange gradient
  gradFire:     ["#FFC83D", "#FF7A3C", "#F05A28"] as const, // Yellow to orange
  gradDark:     ["#2B2B2B", "#111111"] as const,           // Concrete to graphite
  gradPrimary:  ["#F05A28", "#E03E0E"] as const,           // Primary shades
  gradAccent:   ["#FFE89D", "#FFC83D"] as const,           // Signal yellow gradient
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Category colors — burnt orange, graphite, and warm neutrals
// ─────────────────────────────────────────────────────────────────────────────

export const CategoryColors: Record<string, string> = {
  registration_desk: "#F05A28",  // Primary burnt orange
  ushering:          "#FF7A3C",  // Light burnt orange
  booth_staff:       "#E03E0E",  // Dark burnt orange
  brand_ambassador:  "#FFC83D",  // Signal yellow
  sampling:          "#FFA574",  // Light orange
  lead_generation:   "#B82F0C",  // Deep orange
  hospitality:       "#942812",  // Dark orange-brown
  tech_support:      "#6B7280",  // Steel gray
  photography:       "#DC2626",  // Red
  social_media:      "#FFE89D",  // Light yellow
  anchoring:         "#F05A28",  // Primary burnt orange
  promotional:       "#FFC83D",  // Signal yellow
  general_support:   "#2B2B2B",  // Concrete gray
  other:             "#6B7280",  // Steel gray
};

// ─────────────────────────────────────────────────────────────────────────────
// Colors — kept for the rare case of full-palette access (e.g. theme tooling)
// ─────────────────────────────────────────────────────────────────────────────
/** @deprecated Use T instead */
export const Colors = {
  primary:    palette.primary,
  secondary:  palette.secondary,
  accent:     palette.accent,
  success:    palette.success,
  warning:    palette.warning,
  error:      palette.error,
  background: palette.background,
  surface:    palette.surface,
  border:     palette.border,
  text:       palette.text,
  graphite:   palette.graphite,
  concrete:   palette.concrete,
  steel:      palette.steel,
  gradients: {
    brand:   T.gradBrand,
    fire:    T.gradFire,
    dark:    T.gradDark,
    primary: T.gradPrimary,
    accent:  T.gradAccent,
  },
} as const;
