import { apiGet, apiPost, apiPostForm } from "./client";

export interface PostedGigSummary {
  id: string;
  title: string;
  city: string;
  event_date: string;
  status: string;
  is_paused: boolean;
  slots_total: number;
  slots_filled: number;
  pending_count: number;
}

export interface PostedGigsResponse {
  items: PostedGigSummary[];
  total: number;
}

export interface PauseResponse {
  id: string;
  is_paused: boolean;
  status: string;
}

export function listMyGigs() {
  return apiGet<PostedGigsResponse>("/gigs/mine");
}

export function pauseGig(id: string) {
  return apiPost<PauseResponse>(`/gigs/${id}/pause`, {});
}

export function unpauseGig(id: string) {
  return apiPost<PauseResponse>(`/gigs/${id}/unpause`, {});
}

export interface CoverResponse {
  cover_image_url: string;
  cover_image_square_url: string;
}

/** Generates the gig's auto cover art. Call right after creating the gig. Photo is optional. */
export function generateGigCover(id: string, photo?: File) {
  const form = new FormData();
  if (photo) form.append("photo", photo);
  return apiPostForm<CoverResponse>(`/gigs/${id}/cover`, form);
}
