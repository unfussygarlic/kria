import { apiGet, apiPost } from "./client";

export interface SupportSubmitPayload {
  category: string;
  subject: string;
  message: string;
  email: string;
}

export interface MyTicket {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved";
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export async function submitSupportQuery(payload: SupportSubmitPayload) {
  return apiPost<{ ok: boolean }>("/support/submit", payload);
}

export async function getMyTickets() {
  return apiGet<MyTicket[]>("/support/my-tickets");
}
