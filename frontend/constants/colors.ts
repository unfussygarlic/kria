// Kriya Color Palette
// Theme: Orange-Red — no blues, no indigos, no purples, no teals
// Light mode only - vibrant, high-contrast
//
// Usage: import { T } from "@/constants/colors"
//   T.primary     → brand orange
//   T.bg          → background
//   T.text        → primary text
//   T.textMuted   → muted/hint text
//   T.gradBrand   → ["#F97316", "#EA580C"] for LinearGradient

// ─────────────────────────────────────────────────────────────────────────────
// Internal full palette (used to build T below; rarely imported directly)
// ─────────────────────────────────────────────────────────────────────────────

const palette = {
  // Primary - Bold Orange
  primary: {
    DEFAULT: "#EA580C",
    50:  "#FFF7ED",
    100: "#FFEDD5",
    200: "#FED7AA",
    300: "#FDBA74",
    400: "#FB923C",
    500: "#F97316",
    600: "#EA580C",
    700: "#C2410C",
    800: "#9A3412",
    900: "#7C2D12",
  },
  // Secondary - Rose Red
  secondary: {
    DEFAULT: "#E11D48",
    50:  "#FFF1F2",
    100: "#FFE4E6",
    200: "#FECDD3",
    300: "#FDA4AF",
    400: "#FB7185",
    500: "#F43F5E",
    600: "#E11D48",
    700: "#BE123C",
    800: "#9F1239",
    900: "#881337",
  },
  success: "#16A34A",
  warning: "#F59E0B",
  error:   "#DC2626",
  background: "#FAFAFA",
  surface:    "#FFFFFF",
  border:     "#E5E5E5",
  text: {
    primary:  "#171717",
    secondary: "#525252",
    muted:    "#A3A3A3",
    inverse:  "#FFFFFF",
  },
  momentum: {
    DEFAULT: "#D97706",
    light:   "#FEF3C7",
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// T — flat theme variables (the only import screens need)
// ─────────────────────────────────────────────────────────────────────────────

export const T = {
  // ── Primary brand orange
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

  // ── Secondary rose-red
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

  // ── Momentum (amber-gold)
  momentum:      palette.momentum.DEFAULT,
  momentumLight: palette.momentum.light,

  // ── Gradient arrays (pass directly to LinearGradient colors prop)
  gradBrand:  ["#F97316", "#EA580C"] as const,
  gradFire:   ["#FBBF24", "#F97316", "#EA580C", "#DC2626"] as const,
  gradSunset: ["#FB923C", "#E11D48"] as const,
  gradPrimary: ["#EA580C", "#C2410C"] as const,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Category colors — all warm tones, no blues/violets/teals
// ─────────────────────────────────────────────────────────────────────────────

export const CategoryColors: Record<string, string> = {
  registration_desk: "#EA580C",  // Primary orange
  ushering:          "#F97316",  // Orange
  booth_staff:       "#E11D48",  // Rose red
  brand_ambassador:  "#BE123C",  // Deep crimson
  sampling:          "#F59E0B",  // Amber
  lead_generation:   "#D97706",  // Dark amber
  hospitality:       "#C2410C",  // Burnt orange
  tech_support:      "#6B7280",  // Neutral gray
  photography:       "#EF4444",  // Red
  social_media:      "#FB923C",  // Light orange
  anchoring:         "#F97316",  // Orange
  promotional:       "#FBBF24",  // Bright amber
  general_support:   "#64748B",  // Slate (neutral)
  other:             "#9CA3AF",  // Gray (neutral)
};

// ─────────────────────────────────────────────────────────────────────────────
// Colors — kept for the rare case of full-palette access (e.g. theme tooling)
// ─────────────────────────────────────────────────────────────────────────────
/** @deprecated Use T instead */
export const Colors = {
  primary:    palette.primary,
  secondary:  palette.secondary,
  success:    palette.success,
  warning:    palette.warning,
  error:      palette.error,
  background: palette.background,
  surface:    palette.surface,
  border:     palette.border,
  text:       palette.text,
  momentum:   palette.momentum,
  gradients: {
    brand:   T.gradBrand,
    fire:    T.gradFire,
    sunset:  T.gradSunset,
    primary: T.gradPrimary,
  },
} as const;
