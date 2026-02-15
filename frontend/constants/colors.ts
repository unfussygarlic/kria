// Kriya Color Palette
// Light mode only - vibrant, high-contrast

export const Colors = {
  // Primary - Blue
  primary: {
    DEFAULT: "#2563EB",
    50: "#EFF6FF",
    100: "#DBEAFE",
    200: "#BFDBFE",
    300: "#93C5FD",
    400: "#60A5FA",
    500: "#2563EB",
    600: "#1D4ED8",
    700: "#1E40AF",
    800: "#1E3A8A",
    900: "#172554",
  },

  // Secondary - Orange
  secondary: {
    DEFAULT: "#F97316",
    50: "#FFF7ED",
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

  // Semantic
  success: "#16A34A",
  warning: "#F59E0B",
  error: "#DC2626",

  // Neutrals
  background: "#FAFAFA",
  surface: "#FFFFFF",
  border: "#E5E5E5",

  text: {
    primary: "#171717",
    secondary: "#525252",
    muted: "#A3A3A3",
    inverse: "#FFFFFF",
  },

  // Momentum (special)
  momentum: {
    DEFAULT: "#8B5CF6", // Purple
    light: "#EDE9FE",
  },
} as const;

// Category colors for gig types
export const CategoryColors: Record<string, string> = {
  registration_desk: "#3B82F6", // Blue
  ushering: "#6366F1", // Indigo
  booth_staff: "#8B5CF6", // Violet
  brand_ambassador: "#EC4899", // Pink
  sampling: "#F97316", // Orange
  lead_generation: "#10B981", // Emerald
  hospitality: "#14B8A6", // Teal
  tech_support: "#6B7280", // Gray
  photography: "#EF4444", // Red
  social_media: "#3B82F6", // Blue
  anchoring: "#A855F7", // Purple
  promotional: "#F59E0B", // Amber
  general_support: "#64748B", // Slate
  other: "#9CA3AF", // Gray
};
