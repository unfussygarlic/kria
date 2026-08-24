/**
 * ═════════════════════════════════════════════════════════════════════════════
 *   MASTER COLOR CONTROLLER — Grid (host dashboard)
 * ═════════════════════════════════════════════════════════════════════════════
 *
 *   Mirrors `frontend/pocket/constants/palettes.ts` so both apps stay in
 *   lockstep. Same 6-color contract, same luminance-aware `on-*` derivation,
 *   same set of ready-made presets.
 *
 *   ▸ To try a different palette:
 *       1. Change `ACTIVE_PRESET` (light) or `ACTIVE_DARK_PRESET` (dark)
 *          at the bottom of this file
 *       2. Save — Next.js hot-reload picks it up on the next request
 *       3. Refresh the browser
 *
 *   The active preset's values are computed into CSS custom properties at
 *   render time (see `computePaletteCSS()` below) and injected into the
 *   document `<head>` via `app/layout.tsx`. globals.css defines the token
 *   *names*; this file supplies the *values* for whichever preset is active.
 *
 *
 *   ── The palette contract (6 required colors) ───────────────────────────────
 *
 *     primary   Main brand color. Powers CTAs, chips, hero gradients.
 *               Should be saturated / punchy.
 *     deep      Darker cousin of `primary`. Gradient end + pressed state.
 *     bg        Page canvas. Off-white/off-black tinted from primary family.
 *     surface   Card / raised background. Pure white (light) or one step
 *               lighter than bg (dark).
 *     text      Primary text. Must hit ≥4.5:1 contrast on `surface` (WCAG AA).
 *     accent    Secondary voice. Pick a different hue family than primary.
 *
 *
 *   ── Optional intents ───────────────────────────────────────────────────────
 *
 *     success   Money/pay indicator. Defaults to emerald.
 *     error     Validation errors. Defaults to warm coral / terracotta.
 *
 *
 *   ── Foreground-on-* overrides (rarely needed) ─────────────────────────────
 *
 *   Each auto-computes from background luminance (threshold 0.55 → dark or
 *   white). Override only when the auto-choice clashes.
 *
 *     onPrimary     Text/icon on primary fills (CTAs, chips, avatars)
 *     onAccent      Text/icon on accent fills
 *     onDeep        Text/icon on deep (gradient end)
 *     onGradAccent  Text on primary→accent hero gradient (darker endpoint ref)
 *     onGradBrand   Text on primary→deep gradient
 */

// ═════════════════════════════════════════════════════════════════════════════
//   Types
// ═════════════════════════════════════════════════════════════════════════════

export interface LightPreset {
  name: string;
  description: string;
  primary: string;
  deep:    string;
  bg:      string;
  surface: string;
  text:    string;
  accent:  string;
  success?: string;
  error?:   string;
  shadow?:  string;
  onPrimary?:    string;
  onAccent?:     string;
  onDeep?:       string;
  onGradAccent?: string;
  onGradBrand?:  string;
}

export interface DarkPreset {
  name: string;
  description: string;
  primary: string;
  deep:    string;
  bg:      string;
  surface: string;
  text:    string;
  accent:  string;
  success?: string;
  error?:   string;
  onPrimary?:    string;
  onAccent?:     string;
  onDeep?:       string;
  onGradAccent?: string;
  onGradBrand?:  string;
}

// ═════════════════════════════════════════════════════════════════════════════
//   Ready-made presets — copy any of these to make your own
// ═════════════════════════════════════════════════════════════════════════════

export const LIGHT_PRESETS = {
  /* Current default. Warm & confident. */
  blush_ink: {
    name: "Blush & Ink",
    description: "Hot pink primary, near-black text, violet accent. Warm, confident, playful.",
    primary: "#FF2D7A",
    deep:    "#C9005E",
    bg:      "#FFF5F8",
    surface: "#FFFFFF",
    text:    "#171217",
    accent:  "#7C3AED",
    shadow:  "#3E1230",
  },

  /* Original Kria brand — lime primary in daylight. */
  cream_lime: {
    name: "Cream & Lime",
    description: "Electric lime on warm cream. Brand-nostalgic.",
    primary: "#D4FF00",
    deep:    "#A8CC00",
    bg:      "#FFF7EE",
    surface: "#FFFFFF",
    text:    "#1A1A17",
    accent:  "#FFB92E",
    shadow:  "#2A1F00",
    onPrimary: "#1A1A17",
  },

  ocean_coral: {
    name: "Ocean & Coral",
    description: "Deep blue with coral accent. Calm and confident.",
    primary: "#0F7BFF",
    deep:    "#0057D6",
    bg:      "#F5F9FF",
    surface: "#FFFFFF",
    text:    "#0B1220",
    accent:  "#FF6B4A",
    shadow:  "#0A2540",
  },

  forest_amber: {
    name: "Forest & Amber",
    description: "Deep green with amber. Earthy, mature, grounded.",
    primary: "#0F7A3D",
    deep:    "#0A5A2D",
    bg:      "#F8FBF5",
    surface: "#FFFFFF",
    text:    "#0F1A14",
    accent:  "#EA8B00",
    shadow:  "#0A2015",
    success: "#0F7A3D",
  },

  sunrise_plum: {
    name: "Sunrise & Plum",
    description: "Warm orange with plum. Energetic and cheerful.",
    primary: "#FF7A00",
    deep:    "#D65900",
    bg:      "#FFF8F0",
    surface: "#FFFFFF",
    text:    "#1D1610",
    accent:  "#9333EA",
    shadow:  "#3E1F00",
  },

  mono_red: {
    name: "Mono & Red",
    description: "Near-black primary with red accent. Editorial and monochrome.",
    primary: "#111111",
    deep:    "#000000",
    bg:      "#FAFAF7",
    surface: "#FFFFFF",
    text:    "#111111",
    accent:  "#DC2626",
    shadow:  "#000000",
    error:   "#000000",
  },

  slate_coral: {
    name: "Slate & Coral",
    description: "Deep slate with coral accent. Professional but warm.",
    primary: "#334155",
    deep:    "#1E293B",
    bg:      "#F8FAFC",
    surface: "#FFFFFF",
    text:    "#0F172A",
    accent:  "#F87171",
    shadow:  "#0F172A",
  },

  mint_violet: {
    name: "Mint & Violet",
    description: "Fresh mint with violet. Modern and approachable.",
    primary: "#10B981",
    deep:    "#059669",
    bg:      "#F0FDF9",
    surface: "#FFFFFF",
    text:    "#052E24",
    accent:  "#8B5CF6",
    shadow:  "#052E24",
    success: "#059669",
  },

  /* Original Grid light — kept as a preset so the pre-palette-system
     look is one config change away. */
  warm_paper: {
    name: "Warm Paper (legacy)",
    description: "Olive-lime on warm cream. Grid's 2026-08-07 light rewrite.",
    primary: "#526a10",
    deep:    "#445809",
    bg:      "#FAFAF6",
    surface: "#FFFFFF",
    text:    "#1a1a17",
    accent:  "#a05d00",
    shadow:  "#1a1a17",
    success: "#526a10",
  },
} as const satisfies Record<string, LightPreset>;

export type PresetKey = keyof typeof LIGHT_PRESETS;

export const DARK_PRESETS = {
  /* Original Kria dark identity. Default. */
  solar_flare: {
    name: "Solar Flare",
    description: "Electric lime on obsidian. Kria's original dark identity.",
    primary: "#D4FF00",
    deep:    "#c4ec00",
    bg:      "#0e0e0e",
    surface: "#1a1919",
    text:    "#ffffff",
    accent:  "#ffeb9c",
    error:   "#ff7351",
    success: "#D4FF00",
  },

  midnight_electric: {
    name: "Midnight Electric",
    description: "Electric blue on deep navy. Cool, tech-forward.",
    primary: "#38BDF8",
    deep:    "#0EA5E9",
    bg:      "#0A1220",
    surface: "#141E33",
    text:    "#F8FAFC",
    accent:  "#A78BFA",
  },

  terminal_amber: {
    name: "Terminal Amber",
    description: "CRT amber on charcoal. Retro-tech, nostalgic.",
    primary: "#FFB92E",
    deep:    "#E09612",
    bg:      "#0F0D0A",
    surface: "#1D1811",
    text:    "#F5EBD5",
    accent:  "#EF4444",
  },

  grape_lime: {
    name: "Grape & Lime",
    description: "Vivid violet with lime accent. Bold, expressive.",
    primary: "#A855F7",
    deep:    "#7E22CE",
    bg:      "#100A18",
    surface: "#1E1428",
    text:    "#F5EEFF",
    accent:  "#D4FF00",
  },
} as const satisfies Record<string, DarkPreset>;

export type DarkPresetKey = keyof typeof DARK_PRESETS;

// ═════════════════════════════════════════════════════════════════════════════
//                      ↓  ↓  ↓  CHANGE THESE  ↓  ↓  ↓
// ═════════════════════════════════════════════════════════════════════════════

/** Active light-mode palette. */
export const ACTIVE_PRESET: PresetKey = "blush_ink";

/** Active dark-mode palette. */
export const ACTIVE_DARK_PRESET: DarkPresetKey = "solar_flare";

// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Hex-math + luminance helpers (mirror Pocket's colors.ts)
// ─────────────────────────────────────────────────────────────────────────────

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const px = (n: number) => clamp(n).toString(16).padStart(2, "0");
  return `#${px(r)}${px(g)}${px(b)}`;
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  return toHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function textOn(bgHex: string, dark = "#111111", light = "#FFFFFF"): string {
  return luminance(bgHex) > 0.55 ? dark : light;
}

function textOnGradient(a: string, b: string, dark = "#111111", light = "#FFFFFF"): string {
  const ref = luminance(a) < luminance(b) ? a : b;
  return textOn(ref, dark, light);
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS generator — server-rendered, injected into <head> at boot
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Emit all `--*` CSS custom properties for both themes based on the currently
 * active presets. Overrides the defaults in globals.css.
 */
export function computePaletteCSS(): string {
  // `satisfies Record<...>` narrows each preset to only its literal keys,
  // hiding the optional on-* overrides at read time. Widen back explicitly.
  const light: LightPreset = LIGHT_PRESETS[ACTIVE_PRESET];
  const dark: DarkPreset   = DARK_PRESETS[ACTIVE_DARK_PRESET];

  // ── Light theme derivations ─────────────────────────────────────
  const l_onPrimary    = light.onPrimary    ?? textOn(light.primary, light.text, "#FFFFFF");
  const l_onAccent     = light.onAccent     ?? textOn(light.accent,  light.text, "#FFFFFF");
  const l_onDeep       = light.onDeep       ?? textOn(light.deep,    light.text, "#FFFFFF");
  const l_onGradAccent = light.onGradAccent ?? textOnGradient(light.primary, light.accent, light.text, "#FFFFFF");
  const l_onGradBrand  = light.onGradBrand  ?? textOnGradient(light.primary, light.deep,   light.text, "#FFFFFF");
  const l_success      = light.success      ?? "#059669";
  const l_error        = light.error        ?? "#DC2626";
  const l_shadow       = light.shadow       ?? "#3E1230";

  const l_surface2 = mix(light.surface, light.primary, 0.05);
  const l_surface3 = mix(light.surface, light.primary, 0.10);
  const l_surface4 = mix(light.surface, light.primary, 0.16);
  const l_surface5 = mix(light.surface, light.primary, 0.24);
  const l_textSub   = mix(light.text, light.bg, 0.45);
  const l_textMuted = mix(light.text, light.bg, 0.62);
  const l_border    = withAlpha(light.text, 0.08);
  const l_borderSub = withAlpha(light.text, 0.04);
  const l_navActive = withAlpha(light.primary, 0.08);
  const l_navHover  = withAlpha(light.text, 0.03);

  // ── Dark theme derivations ──────────────────────────────────────
  const d_onPrimary    = dark.onPrimary    ?? textOn(dark.primary, "#000000", dark.text);
  const d_onAccent     = dark.onAccent     ?? textOn(dark.accent,  "#000000", dark.text);
  const d_onDeep       = dark.onDeep       ?? textOn(dark.deep,    "#000000", dark.text);
  const d_onGradAccent = dark.onGradAccent ?? textOnGradient(dark.primary, dark.accent, "#000000", dark.text);
  const d_onGradBrand  = dark.onGradBrand  ?? textOnGradient(dark.primary, dark.deep,   "#000000", dark.text);
  const d_success      = dark.success      ?? "#22c55e";
  const d_error        = dark.error        ?? "#ff7351";

  // Surfaces stepped LIGHTER from bg (2/5/7.5/10/12.5%) so Solar Flare
  // reproduces the historical #131313/#1a/#20/#26/#2c values.
  const d_surface1 = mix(dark.bg, "#FFFFFF", 0.020);
  const d_surface2 = mix(dark.bg, "#FFFFFF", 0.050);
  const d_surface3 = mix(dark.bg, "#FFFFFF", 0.075);
  const d_surface4 = mix(dark.bg, "#FFFFFF", 0.100);
  const d_surface5 = mix(dark.bg, "#FFFFFF", 0.125);
  const d_textSub   = mix(dark.text, dark.bg, 0.32);
  const d_textMuted = mix(dark.text, dark.bg, 0.55);
  const d_border    = withAlpha(dark.text, 0.10);
  const d_borderSub = withAlpha(dark.text, 0.05);
  const d_navActive = withAlpha(dark.text, 0.07);
  const d_navHover  = withAlpha(dark.text, 0.05);

  return `
:root {
  /* Dark palette (active dark preset: ${ACTIVE_DARK_PRESET}) */
  --color-bg:        ${dark.bg};
  --color-surface-1: ${d_surface1};
  --color-surface-2: ${d_surface2};
  --color-surface-3: ${d_surface3};
  --color-surface-4: ${d_surface4};
  --color-surface-5: ${d_surface5};
  --color-primary:     ${dark.primary};
  --color-primary-dim: ${dark.deep};
  --color-secondary:   #8097ff;
  --color-error:       ${d_error};
  --color-amber:       ${dark.accent};
  --color-text:        ${dark.text};
  --color-text-sub:    ${d_textSub};
  --color-text-muted:  ${d_textMuted};
  --color-text-inv:    #000000;

  --card-bg:       ${d_surface1};
  --sidebar-bg:    ${d_surface1};
  --topbar-bg:     ${withAlpha(dark.bg, 0.85)};
  --content-bg:    ${dark.bg};
  --input-bg:      ${d_surface3};
  --border-color:  ${d_border};
  --border-subtle: ${d_borderSub};
  --card-shadow:        none;
  --card-shadow-strong: none;
  --hover-bg:      ${d_navHover};
  --nav-active-bg:     ${d_navActive};
  --nav-active-text:   ${dark.primary};
  --nav-active-border: ${dark.primary};
  --nav-inactive-text: ${d_textMuted};
  --nav-hover-bg:      ${d_navHover};
  --nav-hover-text:    ${dark.text};
  --lime:    ${dark.primary};
  --lime-on: ${d_onPrimary};
  --focus-ring: ${withAlpha(dark.primary, 0.35)};

  --on-primary:   ${d_onPrimary};
  --on-secondary: #ffffff;
  --on-accent:    ${d_onAccent};
  --on-error:     #ffffff;
  --on-grad-brand:  ${d_onGradBrand};
  --on-grad-accent: ${d_onGradAccent};

  --shadow-sm: none;
  --shadow-md: none;
  --shadow-lg: none;
  --shadow-xl: none;

  --color-success: ${d_success};
}

[data-theme="light"] {
  /* Light palette (active preset: ${ACTIVE_PRESET}) */
  --color-bg:        ${light.bg};
  --color-surface-1: ${light.surface};
  --color-surface-2: ${l_surface2};
  --color-surface-3: ${l_surface3};
  --color-surface-4: ${l_surface4};
  --color-surface-5: ${l_surface5};
  --color-primary:     ${light.primary};
  --color-primary-dim: ${light.deep};
  --color-secondary:   #4152a3;
  --color-error:       ${l_error};
  --color-amber:       #a05d00;
  --color-text:        ${light.text};
  --color-text-sub:    ${l_textSub};
  --color-text-muted:  ${l_textMuted};
  --color-text-inv:    #FFFFFF;

  --card-bg:       ${light.surface};
  --sidebar-bg:    ${light.surface};
  --topbar-bg:     ${withAlpha(light.bg, 0.85)};
  --content-bg:    ${light.bg};
  --input-bg:      ${l_surface2};
  --border-color:  ${l_border};
  --border-subtle: ${l_borderSub};
  --card-shadow:        0 1px 2px ${withAlpha(l_shadow, 0.04)}, 0 1px 1px ${withAlpha(l_shadow, 0.02)};
  --card-shadow-strong: 0 4px 12px ${withAlpha(l_shadow, 0.06)}, 0 1px 3px ${withAlpha(l_shadow, 0.04)};
  --hover-bg:      ${withAlpha(light.text, 0.035)};
  --nav-active-bg:     ${l_navActive};
  --nav-active-text:   ${light.primary};
  --nav-active-border: ${light.primary};
  --nav-inactive-text: ${l_textMuted};
  --nav-hover-bg:      ${l_navHover};
  --nav-hover-text:    ${light.text};
  --lime:    ${light.primary};
  --lime-on: ${l_onPrimary};
  --focus-ring: ${withAlpha(light.primary, 0.28)};

  --on-primary:   ${l_onPrimary};
  --on-secondary: #FFFFFF;
  --on-accent:    ${l_onAccent};
  --on-error:     #FFFFFF;
  --on-grad-brand:  ${l_onGradBrand};
  --on-grad-accent: ${l_onGradAccent};

  --shadow-sm: 0 1px 2px ${withAlpha(l_shadow, 0.04)};
  --shadow-md: 0 1px 2px ${withAlpha(l_shadow, 0.04)}, 0 1px 1px ${withAlpha(l_shadow, 0.02)};
  --shadow-lg: 0 4px 12px ${withAlpha(l_shadow, 0.06)}, 0 1px 3px ${withAlpha(l_shadow, 0.04)};
  --shadow-xl: 0 8px 24px ${withAlpha(l_shadow, 0.08)}, 0 2px 6px ${withAlpha(l_shadow, 0.04)};

  --color-success: ${l_success};
}
`.trim();
}
