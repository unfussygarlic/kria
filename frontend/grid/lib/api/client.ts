import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/config";

type ApiResult<T> = { data: T; error: null } | { data: null; error: string };

function extractError(detail: unknown, status: number): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const msg: string = detail[0]?.msg ?? `HTTP ${status}`;
    return msg.replace(/^Value error,\s*/i, "");
  }
  return `HTTP ${status}`;
}

async function getAuthHeader(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? `Bearer ${session.access_token}` : null;
}

export async function apiGet<T>(path: string): Promise<ApiResult<T>> {
  const auth = await getAuthHeader();
  if (!auth) return { data: null, error: "Not authenticated" };

  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: auth },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
      return { data: null, error: extractError(err.detail, res.status) };
    }
    return { data: (await res.json()) as T, error: null };
  } catch {
    return { data: null, error: "Network error" };
  }
}

export async function apiPost<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  const auth = await getAuthHeader();
  if (!auth) return { data: null, error: "Not authenticated" };

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
      return { data: null, error: extractError(err.detail, res.status) };
    }
    return { data: (await res.json()) as T, error: null };
  } catch {
    return { data: null, error: "Network error" };
  }
}

export async function apiPatch<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  const auth = await getAuthHeader();
  if (!auth) return { data: null, error: "Not authenticated" };

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
      return { data: null, error: extractError(err.detail, res.status) };
    }
    return { data: (await res.json()) as T, error: null };
  } catch {
    return { data: null, error: "Network error" };
  }
}
