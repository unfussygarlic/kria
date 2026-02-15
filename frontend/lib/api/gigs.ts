import { apiPost } from "./client";

export interface MatchGigsParams {
  latitude?: number;
  longitude?: number;
  max_distance_km?: number;
  limit?: number;
}

export interface MatchedGig {
  gig_id: string;
  score: number;
  distance_km: number | null;
  title: string;
  category: string;
  pay_amount: number;
  pay_type: string;
  poster_id: string;
  event_date: string | null;
}

interface MatchGigsResponse {
  gigs: MatchedGig[];
  total: number;
}

export async function matchGigs(params: MatchGigsParams = {}) {
  return apiPost<MatchGigsResponse>("/api/v1/gigs/match", params);
}
