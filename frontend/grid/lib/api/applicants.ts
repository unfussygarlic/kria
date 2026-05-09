import { apiGet, apiPost } from "./client";
import type { ApplicantListResponse, ApplicationActionResponse, GlobalApplicantListResponse } from "@/types";

export type ApplicantSort = "momentum_desc" | "momentum_asc" | "newest" | "oldest";
export type ApplicantStatusFilter = "pending" | "accepted" | "all";

export async function listApplicants(
  gigId: string,
  sort: ApplicantSort = "momentum_desc",
  filterStatus: ApplicantStatusFilter = "all",
) {
  return apiGet<ApplicantListResponse>(
    `/gigs/${gigId}/applicants?sort=${sort}&status=${filterStatus}`,
  );
}

export async function listAllApplicants(status: "pending" | "accepted" | "all" = "all") {
  return apiGet<GlobalApplicantListResponse>(`/applicants?status=${status}`);
}

export async function acceptApplicant(applicationId: string) {
  return apiPost<ApplicationActionResponse>(`/applicants/${applicationId}/accept`, {});
}

export async function rejectApplicant(applicationId: string) {
  return apiPost<ApplicationActionResponse>(`/applicants/${applicationId}/reject`, {});
}

export async function markNoShow(assignmentId: string) {
  return apiPost<ApplicationActionResponse>(`/assignments/${assignmentId}/no-show`, {});
}
