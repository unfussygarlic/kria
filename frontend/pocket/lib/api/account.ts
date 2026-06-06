import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/config";
import { apiPost } from "./client";

export type DeactivateDuration = "7d" | "15d" | "30d" | "indefinite";

export const deactivateAccount = (duration: DeactivateDuration) =>
  apiPost<{ ok: boolean; reactivate_at: string | null }>("/api/v1/account/deactivate", { duration });

export const reactivateAccount = () =>
  apiPost<{ ok: boolean }>("/api/v1/account/reactivate", {});

export async function deleteAccountRequest(): Promise<{ error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: "Not authenticated" };
  try {
    const res = await fetch(`${API_URL}/api/v1/account`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
      return { error: typeof err.detail === "string" ? err.detail : `HTTP ${res.status}` };
    }
    return { error: null };
  } catch {
    return { error: "Network error" };
  }
}
