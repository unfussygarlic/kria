import { apiGet, apiPostFormData } from "./client";

export type IDType =
  | "aadhaar"
  | "pan"
  | "driving_licence"
  | "voter_id"
  | "passport";

export const ID_TYPE_OPTIONS = [
  { value: "aadhaar"          as IDType, label: "Aadhaar" },
  { value: "pan"              as IDType, label: "PAN Card" },
  { value: "driving_licence"  as IDType, label: "Driving Licence" },
  { value: "passport"         as IDType, label: "Passport" },
  { value: "voter_id"         as IDType, label: "Voter ID" },
] as const;

// ── Submit verification (returns 202 immediately) ──────────────────────────────

export interface SubmitVerificationResponse {
  status: "pending";
  job_id: string;
  message: string;
}

export async function verifyIdentityWithImages(
  idType: IDType,
  idCardUri: string,
  selfieUri: string,
): Promise<{ data: SubmitVerificationResponse | null; error: string | null }> {
  const formData = new FormData();
  formData.append("id_type", idType);
  formData.append("id_image", { uri: idCardUri, name: "id_card.jpg", type: "image/jpeg" } as unknown as Blob);
  formData.append("selfie",   { uri: selfieUri,  name: "selfie.jpg",  type: "image/jpeg" } as unknown as Blob);
  return apiPostFormData<SubmitVerificationResponse>("/api/v1/profiles/verify-identity", formData);
}

// ── Poll verification status ───────────────────────────────────────────────────

export type IDVerificationStatus = "unverified" | "pending" | "processing" | "verified" | "failed";

export interface IDTypeStatus {
  status: IDVerificationStatus;
  error_code: string | null;
}

export interface IDVerificationStatuses {
  statuses: Record<IDType, IDTypeStatus>;
}

export async function fetchIDVerificationStatus(): Promise<{
  data: IDVerificationStatuses | null;
  error: string | null;
}> {
  return apiGet<IDVerificationStatuses>("/api/v1/profiles/me/id-verification");
}
