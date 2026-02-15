import { apiGet, apiPost } from "./client";

export interface ApplicantProfile {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  city: string | null;
  gender: string | null;
  worker_reputation: number | null;
  total_gigs_completed: number;
  reliability_score: number;
  is_verified: boolean;
  id_verified: boolean;
  languages: string[];
  skills: string[];
}

export interface ApplicantListItem {
  application_id: string;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  applied_at: string;
  responded_at: string | null;
  message: string | null;
  applicant: ApplicantProfile;
}

export interface ApplicantListResponse {
  gig_id: string;
  total: number;
  applicants: ApplicantListItem[];
}

export interface ApplicationActionResponse {
  ok: boolean;
  application_id: string;
  new_status: string;
  message: string;
}

export function getApplicants(gigId: string) {
  return apiGet<ApplicantListResponse>(`/api/v1/gigs/${gigId}/applicants`);
}

export function acceptApplicant(applicationId: string) {
  return apiPost<ApplicationActionResponse>(
    `/api/v1/applicants/${applicationId}/accept`,
    {}
  );
}

export function rejectApplicant(applicationId: string) {
  return apiPost<ApplicationActionResponse>(
    `/api/v1/applicants/${applicationId}/reject`,
    {}
  );
}
