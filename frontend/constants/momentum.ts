/**
 * Momentum System — Frontend Configuration
 *
 * Single source of truth for all Momentum constants on the frontend.
 * Mirrors backend/api/app/config/momentum_config.py — keep in sync.
 *
 * DO NOT hardcode band thresholds, colors, or labels anywhere else.
 * All Momentum UI must import from here.
 */

// ── Scale ─────────────────────────────────────────────────────────────────────

export const MOMENTUM_SCALE = {
  min: 300,
  max: 850,
  default: 500,
} as const;

// ── Bands ─────────────────────────────────────────────────────────────────────

export interface MomentumBand {
  key: string;
  label: string;
  min: number;
  max: number;
  color: string;       // primary band color
  bgColor: string;     // light background for chips/cards
  textColor: string;   // text on bgColor
}

export const MOMENTUM_BANDS: MomentumBand[] = [
  {
    key: "critical",
    label: "Critical",
    min: 300,
    max: 449,
    color: "#ff7351",              // Coral
    bgColor: "rgba(255,115,81,0.15)",
    textColor: "#ff9070",
  },
  {
    key: "developing",
    label: "Stagnant",
    min: 450,
    max: 599,
    color: "#777575",              // Muted gray
    bgColor: "rgba(119,117,117,0.15)",
    textColor: "#adaaaa",
  },
  {
    key: "established",
    label: "Active",
    min: 600,
    max: 699,
    color: "#c0c0c0",              // Silver
    bgColor: "rgba(192,192,192,0.15)",
    textColor: "#c0c0c0",
  },
  {
    key: "trusted",
    label: "Surging",
    min: 700,
    max: 799,
    color: "#D4FF00",              // Electric lime
    bgColor: "rgba(212,255,0,0.15)",
    textColor: "#D4FF00",
  },
  {
    key: "elite",
    label: "Elite",
    min: 800,
    max: 850,
    color: "#ffffff",              // Platinum white
    bgColor: "rgba(255,255,255,0.12)",
    textColor: "#ffffff",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the band that contains the given score. */
export function getBand(score: number): MomentumBand {
  return (
    MOMENTUM_BANDS.find((b) => score >= b.min && score <= b.max) ??
    MOMENTUM_BANDS[1] // fallback: developing
  );
}

/** Maps a score (300–850) to an angle in degrees (180°→0°) for the gauge arc. */
export function scoreToAngle(score: number): number {
  const clamped = Math.max(MOMENTUM_SCALE.min, Math.min(MOMENTUM_SCALE.max, score));
  return 180 - ((clamped - MOMENTUM_SCALE.min) / (MOMENTUM_SCALE.max - MOMENTUM_SCALE.min)) * 180;
}

// ── Breakdown signal labels ───────────────────────────────────────────────────
// These must match the keys emitted by the backend breakdown endpoint.

export const WORKER_SIGNAL_LABELS: Record<string, { label: string; description: string }> = {
  show_rate: {
    label: "Show-up reliability",
    description: "How consistently you show up for gigs you accepted",
  },
  on_time_rate: {
    label: "On-time rate",
    description: "How often you arrive at the venue on time",
  },
  performance_score: {
    label: "Work quality",
    description: "Average rating from gig posters who worked with you",
  },
  response_rate: {
    label: "Response reliability",
    description: "How quickly you respond to gig offers and messages",
  },
  consistency_score: {
    label: "Recent consistency",
    description: "How stable your performance has been across recent gigs",
  },
};

export const POSTER_SIGNAL_LABELS: Record<string, { label: string; description: string }> = {
  payment_rate: {
    label: "Payment consistency",
    description: "Track record of paying workers fully and on time",
  },
  poster_rating: {
    label: "Finder rating",
    description: "Average rating received from workers after gigs",
  },
  accuracy_rate: {
    label: "Posting accuracy",
    description: "How accurately your gig descriptions match the actual work",
  },
  resolution_speed: {
    label: "Issue resolution",
    description: "How quickly you resolve worker concerns and disputes",
  },
};

// ── Role display ──────────────────────────────────────────────────────────────

export const MOMENTUM_ROLES = {
  worker: { key: "worker", tabLabel: "Seeker", icon: "briefcase" as const },
  poster: { key: "poster", tabLabel: "Finder", icon: "layers" as const },
} as const;
