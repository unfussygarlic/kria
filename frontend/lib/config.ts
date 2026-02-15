/**
 * Dynamic backend URLs for development.
 *
 * In Expo Go, Constants.expoGoConfig.debuggerHost is the Metro bundler address,
 * e.g. "192.168.0.4:8081". The same machine runs Docker, so we extract just
 * the IP and build all backend service URLs from it — no hardcoded IPs needed.
 *
 * Falls back to EXPO_PUBLIC_* env vars (used in production or standalone builds).
 */

import Constants from "expo-constants";

function getDevIP(): string | null {
  if (process.env.EXPO_PUBLIC_APP_ENV !== "development") return null;

  const host =
    Constants.expoGoConfig?.debuggerHost ??
    // SDK 49+ alternate path
    (Constants.manifest2 as Record<string, unknown> | null)
      ?.extra?.expoGo?.debuggerHost;

  return typeof host === "string" ? host.split(":")[0] : null;
}

const devIP = getDevIP();

/** FastAPI base URL — used by lib/api/client.ts */
export const API_URL: string = devIP
  ? `http://${devIP}:8000`
  : (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000");

/** Supabase Kong URL — used by lib/supabase.ts */
export const SUPABASE_URL: string = devIP
  ? `http://${devIP}:54321`
  : (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "http://localhost:54321");
