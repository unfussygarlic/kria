import { apiGet } from "./client";

// ── Types ────────────────────────────────────────────────────────────────────

export interface MomentumScoreData {
  score: number;
  band_key: string;
  band_label: string;
  band_color: string;
  gig_count: number;
}

export interface MyMomentumData {
  worker: MomentumScoreData;
  poster: MomentumScoreData;
}

export interface BreakdownItem {
  key: string;
  label: string;
  description: string;
  bar_value: number;    // 0.0–1.0
  contribution: number; // score points
}

export interface MomentumBreakdownData {
  worker: MomentumScoreData;
  poster: MomentumScoreData;
  worker_breakdown: BreakdownItem[];
  poster_breakdown: BreakdownItem[];
  explanation: string;
}

export interface PublicMomentumData {
  worker_score: number;
  worker_band_key: string;
  worker_band_label: string;
  worker_band_color: string;
  poster_score: number;
  poster_band_key: string;
  poster_band_label: string;
  poster_band_color: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function getMyMomentum() {
  return apiGet<MyMomentumData>("/api/v1/momentum/me");
}

export async function getMyBreakdown() {
  return apiGet<MomentumBreakdownData>("/api/v1/momentum/me/breakdown");
}

export async function getUserMomentum(userId: string) {
  return apiGet<PublicMomentumData>(`/api/v1/momentum/user/${userId}`);
}
