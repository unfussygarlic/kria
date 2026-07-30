import { apiGet, apiPost, apiPostFormData } from "./client";

export interface MatchGigsParams {
  latitude?: number;
  longitude?: number;
  max_distance_km?: number;
  limit?: number;
  offset?: number;
  excluded_ids?: string[];
  sort?: "score" | "distance";
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
  poster_score: number | null;
}

interface MatchGigsResponse {
  gigs: MatchedGig[];
  total: number;
  has_more: boolean;
}

export async function matchGigs(params: MatchGigsParams = {}) {
  return apiPost<MatchGigsResponse>("/api/v1/gigs/match", params);
}

export interface CoverResponse {
  cover_image_url: string;
  cover_image_square_url: string;
}

/** Generates the gig's auto cover art. Call right after creating the gig. Photo is optional. */
export function generateGigCover(id: string, photo?: { uri: string; name: string; type: string }) {
  const form = new FormData();
  if (photo) {
    // React Native FormData file shape — not a real web File, hence the cast.
    form.append("photo", photo as unknown as Blob);
  }
  return apiPostFormData<CoverResponse>(`/api/v1/gigs/${id}/cover`, form);
}

export interface AcceptedGigPoster {
  id: string;
  display_name: string;
  avatar_url: string | null;
  reputation: number | null;
}

export interface AcceptedGigItem {
  gig_id: string;
  application_id: string;
  assignment_id: string | null;
  assignment_status: string | null;
  title: string;
  category: string;
  company_name: string | null;
  venue_name: string;
  city: string;
  venue_lat: number | null;
  venue_lng: number | null;
  event_date: string;
  shift_start_time: string;
  shift_end_time: string;
  pay_amount: number;
  pay_type: string;
  poster: AcceptedGigPoster;
  has_been_rated: boolean;
}

export interface AcceptedGigsResponse {
  items: AcceptedGigItem[];
  total: number;
}

export function getMyAcceptedGigs() {
  return apiGet<AcceptedGigsResponse>("/api/v1/gigs/my-accepted");
}
