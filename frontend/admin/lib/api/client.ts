import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/config";

async function authHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

export async function apiGet<T>(path: string): Promise<{ data: T | null; error: Error | null }> {
  try {
    const res = await fetch(`${API_URL}${path}`, { headers: await authHeaders() });
    if (!res.ok) return { data: null, error: new Error(`HTTP ${res.status}`) };
    return { data: await res.json(), error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

export async function apiPost<T>(path: string, body: unknown): Promise<{ data: T | null; error: Error | null }> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) return { data: null, error: new Error(`HTTP ${res.status}`) };
    return { data: await res.json(), error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

export async function apiPatch<T>(path: string, body: unknown): Promise<{ data: T | null; error: Error | null }> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) return { data: null, error: new Error(`HTTP ${res.status}`) };
    return { data: await res.json(), error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}
