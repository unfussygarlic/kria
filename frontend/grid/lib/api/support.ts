import { apiPost } from "./client";

export interface SupportSubmitPayload {
  category: string;
  subject: string;
  message: string;
  email: string;
}

export async function submitSupportQuery(payload: SupportSubmitPayload) {
  return apiPost<{ id: string }>("/support/submit", payload);
}
