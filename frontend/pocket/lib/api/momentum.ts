import { apiGet } from "./client";

// ── Types ────────────────────────────────────────────────────────────────────

export interface MomentumScoreData {
  score: number;
  band_key: string;
  band_label: string;
  band_color: string;
  gig_count: number;
  profile_points: number;
}

export interface ProfileSignalItem {
  key: string;
  label: string;
  description: string;
  points: number;
  earned: boolean;
}

export interface MyMomentumData {
  worker: MomentumScoreData;
}

export interface BreakdownItem {
  key: string;
  label: string;
  description: string;
  bar_value: number;    // 0.0–1.0 (0.0 if no data)
  contribution: number; // score points
  has_data: boolean;    // false = signal excluded from score; shown empty on skill graph
}

export interface WorkerBreakdownData {
  score: MomentumScoreData;
  signals: BreakdownItem[];
  profile_signals: ProfileSignalItem[];
  explanation: string;
}

export interface PublicMomentumData {
  worker_score: number;
  worker_band_key: string;
  worker_band_label: string;
  worker_band_color: string;
}

export interface SignalMeta {
  key: string;
  label: string;
  short_label: string;
  description: string;
  icon: string;
  color: string;
  weight: number;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function getMyMomentum() {
  return apiGet<MyMomentumData>("/api/v1/momentum/me");
}

export async function getMyBreakdown() {
  return apiGet<WorkerBreakdownData>("/api/v1/momentum/me/breakdown");
}

export async function getUserMomentum(userId: string) {
  return apiGet<PublicMomentumData>(`/api/v1/momentum/user/${userId}`);
}

export async function getSignalMeta() {
  return apiGet<SignalMeta[]>("/api/v1/momentum/signals");
}

// ── Percentile (social proof — "top X% in Bengaluru") ──────────────────────

export interface PercentileData {
  score: number;
  city: string | null;
  percentile: number;   // 1–100
  peer_count: number;
  scope: "city" | "global";
}

export async function getMyPercentile() {
  return apiGet<PercentileData>("/api/v1/momentum/me/percentile");
}
