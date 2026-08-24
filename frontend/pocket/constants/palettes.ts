/**
 * ═════════════════════════════════════════════════════════════════════════════
 *   MASTER COLOR CONTROLLER — Kria Light Theme
 * ═════════════════════════════════════════════════════════════════════════════
 *
 *   ▸ To try a different palette:
 *       1. Change `ACTIVE_PRESET` at the bottom of this file
 *       2. Save
 *       3. In your terminal: `npx expo start --clear`
 *       4. Reload the app on your device
 *
 *
 *   ── The palette contract ───────────────────────────────────────────────────
 *
 *     primary   Main Kria brand color. Powers CTAs, chips, hero gradients,
 *               gig cards and important interactive elements.
 *
 *     deep      Darker cousin of `primary`. Used for gradient ends and
 *               pressed states.
 *
 *     bg        Whole-page canvas. Should be subtly tinted rather than pure
 *               white so cards have visual separation.
 *
 *     surface   Card / raised background. Usually #FFFFFF.
 *
 *     text      Primary text color. Must hit >=4.5:1 contrast on surface.
 *
 *     accent    Secondary personality color. Used for badges, streaks,
 *               tags, Momentum highlights and special states.
 *
 *
 *   ── Optional overrides ─────────────────────────────────────────────────────
 *
 *     success   Defaults to #059669.
 *     error     Defaults to #DC2626.
 *     shadow    Dark tint used for card shadows.
 *
 *
 *   ── Brand philosophy ────────────────────────────────────────────────────────
 *
 *   Kria should feel:
 *
 *     YOUNG  +  FAST  +  SOCIAL  +  UNAPOLOGETIC
 *
 *   Avoid overly-common startup combinations such as:
 *     • Generic SaaS blue
 *     • Generic green fintech
 *     • Orange delivery-app palettes
 *     • Purple gradient AI startups
 *
 *   The newer palettes intentionally use unusual hue pairings to create a
 *   stronger visual identity in light mode.
 */

export interface LightPreset {
  name: string;
  description: string;

  // Required — the 6-color contract
  primary: string;
  deep:    string;
  bg:      string;
  surface: string;
  text:    string;
  accent:  string;

  // Optional — colour intents
  success?: string;
  error?:   string;
  shadow?:  string;

  // Optional — foreground-on-* overrides
  onPrimary?:    string;
  onAccent?:     string;
  onDeep?:       string;
  onGradAccent?: string;
  onGradBrand?:  string;
}


// ═════════════════════════════════════════════════════════════════════════════
//   KRIA PALETTES
// ═════════════════════════════════════════════════════════════════════════════

export const LIGHT_PRESETS = {

  // ───────────────────────────────────────────────────────────────────────────
  // 01. PERIWINKLE + ACID LIME
  // ───────────────────────────────────────────────────────────────────────────
  //
  // Recommended primary direction.
  //
  // Purple = Kria
  // Acid lime = opportunity / action / reward
  //
  // Strong for:
  //   • College audience
  //   • Gamification
  //   • Swipe interactions
  //   • Momentum
  //   • App icon
  // ───────────────────────────────────────────────────────────────────────────

  periwinkle_acid: {
    name: "Periwinkle & Acid",
    description:
      "Electric periwinkle paired with acid lime. Youthful, digital and highly distinctive.",

    primary: "#635BFF",
    deep:    "#4438CA",
    bg:      "#F7F6FF",
    surface: "#FFFFFF",
    text:    "#17151F",
    accent:  "#C7F000",

    shadow:  "#29234A",
  },


  // ───────────────────────────────────────────────────────────────────────────
  // 02. BUTTER YELLOW + COBALT
  // ───────────────────────────────────────────────────────────────────────────
  //
  // Extremely strong light-mode identity.
  //
  // Yellow = optimism / opportunity
  // Cobalt = confidence / action
  //
  // Particularly good for:
  //   • College marketing
  //   • Posters
  //   • Stickers
  //   • Social media
  //   • Merch
  // ───────────────────────────────────────────────────────────────────────────

  butter_cobalt: {
    name: "Butter & Cobalt",
    description:
      "Warm butter yellow with electric cobalt. Optimistic, bold and youth-culture driven.",

    primary: "#FFD84D",
    deep:    "#D9AE00",
    bg:      "#FFFBEA",
    surface: "#FFFFFF",
    text:    "#17181C",
    accent:  "#3155FF",

    shadow:  "#403600",

    // Dark text works better than white on yellow.
    onPrimary: "#17181C",
  },


  // ───────────────────────────────────────────────────────────────────────────
  // 03. VERMILLION + ULTRAMARINE
  // ───────────────────────────────────────────────────────────────────────────
  //
  // Loud, energetic and distinctly non-corporate.
  //
  // Feels like:
  //   Indian street culture × modern digital product
  //
  // Use ultramarine for secondary actions and vermillion for primary actions.
  // ───────────────────────────────────────────────────────────────────────────

  vermillion_ultra: {
    name: "Vermillion & Ultramarine",
    description:
      "Aggressive vermillion with deep ultramarine. Fast, confident and street-inspired.",

    primary: "#F04438",
    deep:    "#C62828",
    bg:      "#FFF6F4",
    surface: "#FFFFFF",
    text:    "#1C1414",
    accent:  "#304FFE",

    shadow:  "#421514",
  },


  // ───────────────────────────────────────────────────────────────────────────
  // 04. ELECTRIC CYAN + CHERRY
  // ───────────────────────────────────────────────────────────────────────────
  //
  // Fast and social.
  //
  // Cyan gives freshness.
  // Cherry gives urgency and personality.
  //
  // Good fit for Kria's:
  //   Explore → Swipe → Apply loop.
  // ───────────────────────────────────────────────────────────────────────────

  electric_cyan_cherry: {
    name: "Cyan & Cherry",
    description:
      "Electric cyan paired with cherry red. Fast, social and energetic.",

    primary: "#00C2D7",
    deep:    "#008FA3",
    bg:      "#F1FCFE",
    surface: "#FFFFFF",
    text:    "#10191C",
    accent:  "#FF3158",

    shadow:  "#123B42",
  },


  // ───────────────────────────────────────────────────────────────────────────
  // 05. TANGERINE + AUBERGINE
  // ───────────────────────────────────────────────────────────────────────────
  //
  // More sophisticated / fashion-forward Kria.
  //
  // This is the option I'd explore if Kria needs to look less "startup"
  // and more like an established consumer brand.
  // ───────────────────────────────────────────────────────────────────────────

  tangerine_aubergine: {
    name: "Tangerine & Aubergine",
    description:
      "Warm tangerine against deep aubergine. Fashion-forward, confident and expressive.",

    primary: "#FF6A3D",
    deep:    "#D94720",
    bg:      "#FFF7F1",
    surface: "#FFFFFF",
    text:    "#21151F",
    accent:  "#3B164F",

    shadow:  "#401D16",

    // Dark aubergine is used as accent, so white is better there.
    onAccent: "#FFFFFF",
  },


  // ───────────────────────────────────────────────────────────────────────────
  // 06. BLUSH + INK
  // ───────────────────────────────────────────────────────────────────────────
  //
  // Existing palette — retained for comparison.
  // ───────────────────────────────────────────────────────────────────────────

  blush_ink: {
    name: "Blush & Ink",
    description:
      "Hot pink primary, near-black text, violet accent. Warm, confident and playful.",

    primary: "#FF2D7A",
    deep:    "#C9005E",
    bg:      "#FFF5F8",
    surface: "#FFFFFF",
    text:    "#171217",
    accent:  "#7C3AED",

    shadow:  "#3E1230",
  },


  // ───────────────────────────────────────────────────────────────────────────
  // 07. CREAM + LIME
  // ───────────────────────────────────────────────────────────────────────────
  //
  // Original Kria brand direction.
  // ───────────────────────────────────────────────────────────────────────────

  cream_lime: {
    name: "Cream & Lime",
    description:
      "Electric lime primary on warm cream. Kria's original visual identity in daylight.",

    primary: "#D4FF00",
    deep:    "#A8CC00",
    bg:      "#FFF7EE",
    surface: "#FFFFFF",
    text:    "#1A1A17",
    accent:  "#FFB92E",

    shadow:  "#2A1F00",

    onPrimary: "#1A1A17",
  },


  // ───────────────────────────────────────────────────────────────────────────
  // 08. OCEAN + CORAL
  // ───────────────────────────────────────────────────────────────────────────
  //
  // Existing comparison palette.
  // ───────────────────────────────────────────────────────────────────────────

  ocean_coral: {
    name: "Ocean & Coral",
    description:
      "Deep blue primary with coral accent. Calm and confident.",

    primary: "#0F7BFF",
    deep:    "#0057D6",
    bg:      "#F5F9FF",
    surface: "#FFFFFF",
    text:    "#0B1220",
    accent:  "#FF6B4A",

    shadow:  "#0A2540",
  },


  // ───────────────────────────────────────────────────────────────────────────
  // 09. FOREST + AMBER
  // ───────────────────────────────────────────────────────────────────────────

  forest_amber: {
    name: "Forest & Amber",
    description:
      "Deep green with amber. Earthy, mature and grounded.",

    primary: "#0F7A3D",
    deep:    "#0A5A2D",
    bg:      "#F8FBF5",
    surface: "#FFFFFF",
    text:    "#0F1A14",
    accent:  "#EA8B00",

    shadow:  "#0A2015",

    success: "#0F7A3D",
  },


  // ───────────────────────────────────────────────────────────────────────────
  // 10. SUNRISE + PLUM
  // ───────────────────────────────────────────────────────────────────────────

  sunrise_plum: {
    name: "Sunrise & Plum",
    description:
      "Warm orange with plum. Energetic and cheerful.",

    primary: "#FF7A00",
    deep:    "#D65900",
    bg:      "#FFF8F0",
    surface: "#FFFFFF",
    text:    "#1D1610",
    accent:  "#9333EA",

    shadow:  "#3E1F00",
  },


  // ───────────────────────────────────────────────────────────────────────────
  // 11. MONO + RED
  // ───────────────────────────────────────────────────────────────────────────

  mono_red: {
    name: "Mono & Red",
    description:
      "Near-black primary with red accent. Editorial and monochrome.",

    primary: "#111111",
    deep:    "#000000",
    bg:      "#FAFAF7",
    surface: "#FFFFFF",
    text:    "#111111",
    accent:  "#DC2626",

    shadow:  "#000000",

    error: "#000000",
  },


  // ───────────────────────────────────────────────────────────────────────────
  // 12. SLATE + CORAL
  // ───────────────────────────────────────────────────────────────────────────

  slate_coral: {
    name: "Slate & Coral",
    description:
      "Deep slate with coral accent. Professional but warm.",

    primary: "#334155",
    deep:    "#1E293B",
    bg:      "#F8FAFC",
    surface: "#FFFFFF",
    text:    "#0F172A",
    accent:  "#F87171",

    shadow:  "#0F172A",
  },


  // ───────────────────────────────────────────────────────────────────────────
  // 13. MINT + VIOLET
  // ───────────────────────────────────────────────────────────────────────────

  mint_violet: {
    name: "Mint & Violet",
    description:
      "Fresh mint with violet. Modern and approachable.",

    primary: "#10B981",
    deep:    "#059669",
    bg:      "#F0FDF9",
    surface: "#FFFFFF",
    text:    "#052E24",
    accent:  "#8B5CF6",

    shadow:  "#052E24",

    success: "#059669",
  },

} as const satisfies Record<string, LightPreset>;

export type PresetKey = keyof typeof LIGHT_PRESETS;


// ═════════════════════════════════════════════════════════════════════════════
//   DARK presets — same 6-color contract, dark-appropriate defaults
// ═════════════════════════════════════════════════════════════════════════════
//
//   Dark presets follow the SAME shape as light. Semantics differ:
//
//     primary   Bright accent that stays legible against the dark canvas.
//               Neon / high-chroma reads best (lime, electric blue, amber).
//     deep      Slightly darker cousin of primary — gradient end + pressed.
//     bg        Near-black page canvas. Off-black usually beats pure #000.
//     surface   Card background — one step LIGHTER than bg (not tinted).
//     text      Near-white primary text. Slight warm tint if the palette
//               skews warm; cool tint if it skews cool.
//     accent    Secondary voice. Pick from a different hue family.
//
//   Optional overrides (success, error, onPrimary, onAccent, onDeep,
//   onGradAccent, onGradBrand) work exactly like the light preset ones —
//   all foreground-on-* tokens auto-derive from luminance if omitted.
//
//   Surfaces 1–5 are auto-stepped from `bg` toward white (2%, 5%, 9%,
//   14%, 19% lightness). Presets don't need to spell them out.
//
// ═════════════════════════════════════════════════════════════════════════════

export interface DarkPreset {
  name: string;
  description: string;
  // Required — same 6-color contract as LightPreset
  primary: string;
  deep:    string;
  bg:      string;
  surface: string;
  text:    string;
  accent:  string;
  // Optional — colour intents
  success?: string;
  error?:   string;
  // Optional — foreground-on-* overrides (auto-derived if omitted)
  onPrimary?:    string;
  onAccent?:     string;
  onDeep?:       string;
  onGradAccent?: string;
  onGradBrand?:  string;
}

export const DARK_PRESETS = {

  /* Original Kria dark identity — electric lime on obsidian. Default. */
  solar_flare: {
    name: "Solar Flare",
    description: "Electric lime primary on obsidian. Kria's original dark identity.",
    primary: "#D4FF00",
    deep:    "#c4ec00",
    bg:      "#0e0e0e",
    surface: "#1a1919",
    text:    "#ffffff",
    accent:  "#ffeb9c",   // cream
    error:   "#ff7351",   // warm coral (matches lime family)
    success: "#D4FF00",   // primary IS green — money uses the brand color
    // Primary is bright yellow-green → dark text on primary fills.
    // Accent is pale cream → dark text.
    // Both auto-derive to #000 via luminance, so no override needed.
  },

  /* Cool, high-tech. */
  midnight_electric: {
    name: "Midnight Electric",
    description: "Electric blue on deep navy. Cool, tech-forward.",
    primary: "#38BDF8",
    deep:    "#0EA5E9",
    bg:      "#0A1220",
    surface: "#141E33",
    text:    "#F8FAFC",
    accent:  "#A78BFA",   // violet
  },

  /* Retro terminal / warm nostalgia. */
  terminal_amber: {
    name: "Terminal Amber",
    description: "CRT amber on charcoal. Retro-tech, nostalgic.",
    primary: "#FFB92E",
    deep:    "#E09612",
    bg:      "#0F0D0A",
    surface: "#1D1811",
    text:    "#F5EBD5",
    accent:  "#EF4444",   // red — the "warning glow"
  },

  /* Grape juice — playful high contrast. */
  grape_lime: {
    name: "Grape & Lime",
    description: "Vivid violet with lime accent. Bold, expressive.",
    primary: "#A855F7",
    deep:    "#7E22CE",
    bg:      "#100A18",
    surface: "#1E1428",
    text:    "#F5EEFF",
    accent:  "#D4FF00",   // lime callback to the original brand
  },

} as const satisfies Record<string, DarkPreset>;

export type DarkPresetKey = keyof typeof DARK_PRESETS;


// ═════════════════════════════════════════════════════════════════════════════
//                      ↓  ↓  ↓  CHANGE THESE  ↓  ↓  ↓
// ═════════════════════════════════════════════════════════════════════════════

/** Active light-mode palette. */
export const ACTIVE_PRESET: PresetKey = "mono_red";

/** Active dark-mode palette. */
export const ACTIVE_DARK_PRESET: DarkPresetKey = "solar_flare";

// ═════════════════════════════════════════════════════════════════════════════


// ─────────────────────────────────────────────────────────────────────────────
// Helpers — get the active preset object
// ─────────────────────────────────────────────────────────────────────────────

export function getActivePreset(): LightPreset {
  return LIGHT_PRESETS[ACTIVE_PRESET];
}

export function getActiveDarkPreset(): DarkPreset {
  return DARK_PRESETS[ACTIVE_DARK_PRESET];
}