import { apiGet } from "./client";

export interface PostedGigSummary {
  id: string;
  title: string;
  city: string;
  event_date: string;
  status: string;
  slots_total: number;
  slots_filled: number;
  pending_count: number;
}

export interface PostedGigsResponse {
  items: PostedGigSummary[];
  total: number;
}

export function listMyGigs() {
  return apiGet<PostedGigsResponse>("/gigs/mine");
}
