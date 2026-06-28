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
  // Dimension scores — arbitrary keys matching backend RATING_DIMENSIONS config
  [key: string]: string | number | undefined;
}

export function fetchRatingDimensions() {
  return apiGet<DimensionsResponse>("/api/v1/ratings/dimensions");
}

export interface RatingResponse {
  ok: boolean;
  rating_id: string;
  message: string;
}

export interface AssignmentActionResponse {
  ok: boolean;
  application_id: string;
  new_status: string;
  message: string;
}

export function submitRating(data: RatingCreate) {
  return apiPost<RatingResponse>("/api/v1/ratings", data);
}

export function verifyOtp(assignmentId: string, otp: string) {
  return apiPost<AssignmentActionResponse>(
    `/api/v1/assignments/${assignmentId}/verify-otp`,
    { otp }
  );
}

export function noShowAssignment(assignmentId: string) {
  return apiPost<AssignmentActionResponse>(
    `/api/v1/assignments/${assignmentId}/no-show`,
    {}
  );
}

export function finalizeExpiredAssignments() {
  return apiPost<{ processed: number }>("/api/v1/assignments/finalize-expired", {});
}
