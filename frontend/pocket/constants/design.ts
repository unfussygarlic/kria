/**
 * Design system tokens — spacing, radius, shadows, elevation.
 *
 * Kept as flat constants (not a nested object) so screens do:
 *   import { S, R, SHADOW } from "@/constants/design";
 *   marginTop: S.md, borderRadius: R.card, ...SHADOW.md,
 *
 * ── Rules ──
 * 1. NO ad-hoc numbers. Use S.* for spacing and R.* for radius.
 * 2. Elevation = shadow, not borders. `SHADOW.card` on any container that
 *    needs to lift off the background.
 * 3. All shadow tint is theme-aware — dark mode falls through to `none`
 *    since dark cards use background lightness stepping instead.
 */

import { activeTheme } from "./colors";
import { rf } from "./responsive";
import type { TextStyle } from "react-native";

/* ─────────────────────────────────────────────────────────────────────────────
   SPACING (S) — 8-based scale with a 4 half-step. Every layout gap should
   be one of these. If a value doesn't fit, the design is off, not the scale.
   ─────────────────────────────────────────────────────────────────────────── */

export const S = {
  xxs: 4,
  xs:  8,
  sm:  12,
  md:  16,
  lg:  20,
  xl:  24,
  xxl: 32,
  hero: 40,
  section: 48,
  bigHero: 64,
} as const;

/* ─────────────────────────────────────────────────────────────────────────────
   RADIUS (R) — semantic corner sizes, not literal numbers.
   ─────────────────────────────────────────────────────────────────────────── */

export const R = {
  chip:    999,   // pill-shaped chips + tags
  button:  14,    // rectangular CTA
  input:   14,    // form fields
  card:    20,    // most cards
  hero:    28,    // large hero cards
  avatar:  999,   // circular avatars
  thumb:   12,    // small thumbnails
} as const;

/* ─────────────────────────────────────────────────────────────────────────────
   SHADOW — soft, warm-tinted elevation for light mode. In dark mode the
   background lightness cascade does the job, so shadows resolve to no-op.
   Spread over React Native style: `...SHADOW.md`
   ─────────────────────────────────────────────────────────────────────────── */

type ShadowStyle = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

const NONE: ShadowStyle = {
  shadowColor: "transparent",
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
};

// Warm-plum tint that matches the blush canvas. Not pure black — pure black
// shadows look grey on cream and read cheap. Slight pink undertone bakes
// the shadow into the palette.
const LIGHT_SM: ShadowStyle = {
  shadowColor: "#3E1230",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 2,
};
const LIGHT_MD: ShadowStyle = {
  shadowColor: "#3E1230",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 14,
  elevation: 4,
};
const LIGHT_LG: ShadowStyle = {
  shadowColor: "#3E1230",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.12,
  shadowRadius: 24,
  elevation: 8,
};
const LIGHT_XL: ShadowStyle = {
  shadowColor: "#3E1230",
  shadowOffset: { width: 0, height: 16 },
  shadowOpacity: 0.16,
  shadowRadius: 40,
  elevation: 14,
};

const isDark = activeTheme === "dark";

export const SHADOW = {
  none: NONE,
  sm:   isDark ? NONE : LIGHT_SM,
  md:   isDark ? NONE : LIGHT_MD,   // most cards
  lg:   isDark ? NONE : LIGHT_LG,   // raised bottom sheets, hero cards
  xl:   isDark ? NONE : LIGHT_XL,   // modals, floating action, big heroes
  /** Alias for the default card shadow — use this on any everyday card. */
  card: isDark ? NONE : LIGHT_MD,
} as const;

/* ─────────────────────────────────────────────────────────────────────────────
   HIT TARGETS — minimum tap size (44px per HIG / 48dp per Material)
   ─────────────────────────────────────────────────────────────────────────── */

export const HIT = {
  min: 44,
  minHitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
} as const;

/* ─────────────────────────────────────────────────────────────────────────────
   TYPE (T) — static typography schema. Every text style in the app should
   pick one of these — no inline `fontSize: rf(13)` calls.

   Sizes are deliberately generous (14 body / 20 section header / 24 title)
   for readability at arm's length on a phone. Small text (<12) is only used
   for uppercase labels where letterSpacing carries the shape.

   Usage:
     <Text style={TYPE.title2}>Hot gigs</Text>
     <Text style={[TYPE.body, { color: T.textSub }]}>subtitle</Text>

   The style objects are ready-to-spread — they include font-family +
   line-height + tracking already tuned. Colors are NOT baked in so each
   screen picks the right color from `T.*`.
   ─────────────────────────────────────────────────────────────────────────── */

// Reference weights matched to the Inter family we load in _layout.tsx.
// Inter was picked for CX / readability — highest-x-height sans-serif on
// mobile, best character disambiguation for numbers (₹, OTP codes).
// We now have an ExtraBold weight (800) available for hero display text.
const F_BLACK = "Inter_800ExtraBold";
const F_BOLD  = "Inter_700Bold";
const F_SEMI  = "Inter_600SemiBold";
const F_MED   = "Inter_500Medium";
const F_REG   = "Inter_400Regular";

export const TYPE: Record<
  "display"   |
  "title1"    |
  "title2"    |
  "title3"    |
  "bodyLg"    |
  "body"      |
  "caption"   |
  "label"     |
  "money",
  TextStyle
> = {

  /** Hero numbers only — money, momentum score, streak count.
   *  One per screen max. Loud. */
  display: {
    fontSize: rf(48),
    lineHeight: rf(54),
    letterSpacing: -1.6,
    fontWeight: "800",
    fontFamily: F_BLACK,
  },

  /** Screen title (top of page) OR big stat number in a bento card. */
  title1: {
    fontSize: rf(26),
    lineHeight: rf(32),
    letterSpacing: -0.6,
    fontWeight: "800",
    fontFamily: F_BLACK,
  },

  /** Section header ("Hot gigs", "Browse by role"). */
  title2: {
    fontSize: rf(20),
    lineHeight: rf(26),
    letterSpacing: -0.4,
    fontWeight: "700",
    fontFamily: F_BOLD,
  },

  /** Card title (gig title, event title). Comfortable to read. */
  title3: {
    fontSize: rf(17),
    lineHeight: rf(23),
    letterSpacing: -0.3,
    fontWeight: "700",
    fontFamily: F_BOLD,
  },

  /** Primary body text (lead paragraphs, greeting subline, key description). */
  bodyLg: {
    fontSize: rf(16),
    lineHeight: rf(24),
    letterSpacing: -0.1,
    fontWeight: "500",
    fontFamily: F_MED,
  },

  /** Default body / meta text (dates, cities, footers, most secondary lines). */
  body: {
    fontSize: rf(14),
    lineHeight: rf(20),
    fontWeight: "500",
    fontFamily: F_MED,
  },

  /** Captions, tiny secondary info. Rare — most "small" text should still be `body`. */
  caption: {
    fontSize: rf(12),
    lineHeight: rf(16),
    fontWeight: "500",
    fontFamily: F_MED,
  },

  /** Uppercase tracked labels ("THIS WEEK", "MOMENTUM", "EVENT"). */
  label: {
    fontSize: rf(11),
    lineHeight: rf(14),
    letterSpacing: 1.2,
    fontWeight: "700",
    fontFamily: F_BOLD,
    textTransform: "uppercase",
  },

  /** Money amounts inline — ₹1,100. Uses tabular-nums so digit-widths align
   *  across neighbouring cards. Inter's tabular figures are exceptional. */
  money: {
    fontSize: rf(18),
    lineHeight: rf(22),
    letterSpacing: -0.3,
    fontWeight: "700",
    fontFamily: F_BOLD,
    fontVariant: ["tabular-nums"],
  },
};

// Font-family constants exported so screens can compose custom sizes when
// they truly need to (should be rare — prefer TYPE.* tokens above).
export const FONT = {
  black:   F_BLACK,
  bold:    F_BOLD,
  semi:    F_SEMI,
  medium:  F_MED,
  regular: F_REG,
} as const;
