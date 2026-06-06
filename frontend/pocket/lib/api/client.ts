import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/config";

type ApiResult<T> = { data: T; error: null } | { data: null; error: string };

/**
 * Normalise FastAPI error responses to a plain string.
 * - Plain string detail  → returned as-is
 * - Pydantic 422 array   → first error's `msg`, with the "Value error, " prefix stripped
 * - Anything else        → fallback to HTTP status
 */
function extractError(detail: unknown, status: number): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const msg: string = detail[0]?.msg ?? `HTTP ${status}`;
    // Pydantic v2 prefixes validator errors with "Value error, " — strip it
    return msg.replace(/^Value error,\s*/i, "");
  }
  return `HTTP ${status}`;
}

async function getAuthHeader(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session ? `Bearer ${session.access_token}` : null;
}

export async function apiPost<T>(
  path: string,
  body: unknown
): Promise<ApiResult<T>> {
  const auth = await getAuthHeader();
  if (!auth) return { data: null, error: "Not authenticated" };

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
      },
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

export async function apiPostFormData<T>(
  path: string,
  formData: FormData
): Promise<ApiResult<T>> {
  const auth = await getAuthHeader();
  if (!auth) return { data: null, error: "Not authenticated" };

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { Authorization: auth },
      body: formData,
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

// Deduplicates concurrent GET calls to the same path — the second caller
// awaits the same in-flight promise instead of firing a second request.
const _inFlight = new Map<string, Promise<ApiResult<unknown>>>();

export async function apiGet<T>(path: string): Promise<ApiResult<T>> {
  if (_inFlight.has(path)) {
    return _inFlight.get(path) as Promise<ApiResult<T>>;
  }

  const auth = await getAuthHeader();
  if (!auth) return { data: null, error: "Not authenticated" };

  const req = (async (): Promise<ApiResult<T>> => {
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
    } finally {
      _inFlight.delete(path);
    }
  })();

  _inFlight.set(path, req as Promise<ApiResult<unknown>>);
  return req;
}
