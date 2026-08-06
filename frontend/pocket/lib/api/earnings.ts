import { apiGet } from "./client";

export interface EarningsSummary {
  this_week: number;
  last_week: number;
  lifetime_total: number;
  week_gig_count: number;
  lifetime_gig_count: number;
  next_payout_date: string; // ISO date YYYY-MM-DD
}

export function getEarningsSummary() {
  return apiGet<EarningsSummary>("/api/v1/earnings/summary");
}
