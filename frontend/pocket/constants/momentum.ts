/**
 * Momentum System — Frontend Configuration
 *
 * Single source of truth for all Momentum constants on the frontend.
 * Mirrors backend/api/app/momentum/config.py — keep in sync.
 *
 * Momentum is a Runner-only metric (0–1000).
 * Hosts receive a /10 rating from runners — that is NOT Momentum.
 */

// ── Scale ─────────────────────────────────────────────────────────────────────

export const MOMENTUM_SCALE = {
  min: 0,
  max: 1000,
} as const;

// ── Bands ─────────────────────────────────────────────────────────────────────

export interface MomentumBand {
  key: string;
  label: string;
  min: number;
  max: number;
  color: string;
  bgColor: string;
  textColor: string;
}

export const MOMENTUM_BANDS: MomentumBand[] = [
  {
    key: "newcomer",
    label: "Newcomer",
    min: 0,
    max: 99,
    color: "#777575",
    bgColor: "rgba(119,117,117,0.15)",
    textColor: "#adaaaa",
  },
  {
    key: "building",
    label: "Building",
    min: 100,
    max: 299,
    color: "#ff7351",
    bgColor: "rgba(255,115,81,0.15)",
    textColor: "#ff9070",
  },
  {
    key: "reliable",
    label: "Reliable",
    min: 300,
    max: 499,
    color: "#8097ff",
    bgColor: "rgba(128,151,255,0.15)",
    textColor: "#8097ff",
  },
  {
    key: "trusted",
    label: "Trusted",
    min: 500,
    max: 699,
    color: "#FFC83D",
    bgColor: "rgba(255,200,61,0.15)",
    textColor: "#FFC83D",
  },
  {
    key: "elite",
    label: "Elite",
    min: 700,
    max: 899,
    color: "#D4FF00",
    bgColor: "rgba(212,255,0,0.15)",
    textColor: "#D4FF00",
  },
  {
    key: "legend",
    label: "Legend",
    min: 900,
    max: 1000,
    color: "#ffffff",
    bgColor: "rgba(255,255,255,0.12)",
    textColor: "#ffffff",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getBand(score: number): MomentumBand {
  return MOMENTUM_BANDS.find((b) => score >= b.min && score <= b.max) ?? MOMENTUM_BANDS[0]!;
}

// ── Signal labels (must match backend WORKER_SIGNALS keys) ────────────────────

export const SIGNAL_META: Record<string, { label: string; shortLabel: string; description: string }> = {
  show_rate: {
    label: "Reliability",
    shortLabel: "Reliability",
    description: "How consistently you show up for gigs you've accepted",
  },
  on_time_rate: {
    label: "Punctuality",
    shortLabel: "Punctuality",
    description: "How often you arrive at the venue by the report time",
  },
  performance_score: {
    label: "Work Quality",
    shortLabel: "Quality",
    description: "Average rating given by hosts after working with you",
  },
  communication_score: {
    label: "Communication",
    shortLabel: "Comms",
    description: "How clearly and promptly you communicate on the job",
  },
  professionalism_score: {
    label: "Professionalism",
    shortLabel: "Conduct",
    description: "Conduct, appearance, and attitude during gigs",
  },
};
