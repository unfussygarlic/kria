import { apiGet, apiPost } from "./client";

export interface RatingDimension {
  key: string;
  label: string;
  question: string;
}

interface DimensionsResponse {
  dimensions: RatingDimension[];
}

export interface RatingCreate {
  gig_id: string;
  ratee_id: string;
  rating_type: "worker_rating" | "poster_rating";
  score?: number;
  comment?: string;
  // Dimension scores — keyed by dimension.key, value 1–5
  [key: string]: string | number | undefined;
}

interface RatingResponse {
  ok: boolean;
  rating_id: string;
  message: string;
}

export function fetchRatingDimensions() {
  return apiGet<DimensionsResponse>("/ratings/dimensions");
}

export function submitRating(data: RatingCreate) {
  return apiPost<RatingResponse>("/ratings", data);
}
