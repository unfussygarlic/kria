/**
 * Theme helper — write preference, reload JS to pick it up.
 *
 * The actual palette + activeTheme values live in constants/colors.ts,
 * which reads the persisted theme SYNCHRONOUSLY at module init. That's
 * why a swap needs a JS reload: the module-init snapshot has to re-run.
 *
 * Reload strategy (tries in order, first to succeed wins):
 *   1. `expo-updates` — `Updates.reloadAsync()`. Works in Expo Go, EAS
 *      builds, and dev-client. Preferred — awaitable, has a real return.
 *   2. `DevSettings.reload()` — classic Metro reload. Dev-only.
 *   3. `NativeModules.DevSettings.reload()` — same reload, bypasses the
 *      JS wrapper. Sometimes fires when (2) silently no-ops.
 *   4. Silent persist. Theme applies on the next app open.
 *
 * `setTheme` always returns after persisting; callers can't tell whether
 * a live reload actually fired, and shouldn't need to.
 */

import * as SecureStore from "expo-secure-store";
import { DevSettings, NativeModules } from "react-native";
import { THEME_KEY, activeTheme, type ThemeName } from "./colors";

export type { ThemeName };

/** Read whatever is currently persisted (may differ from the loaded theme
 *  if the user just toggled but hasn't reloaded yet). */
export function getStoredTheme(): ThemeName {
  try {
    const stored = SecureStore.getItem(THEME_KEY);
    return stored === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

/** The theme currently rendered by the app (read at module init). */
export const currentTheme = activeTheme;

/**
 * Save preference and try to reload so the new palette takes effect
 * across every screen. Best-effort: if no reload path works the change
 * persists silently and applies on next launch.
 */
export async function setTheme(next: ThemeName): Promise<void> {
  try {
    await SecureStore.setItemAsync(THEME_KEY, next);
  } catch {
    // If we can't persist, don't reload — the toggle would silently revert.
    return;
  }

  if (next === activeTheme) {
    // No-op — already loaded.
    return;
  }

  // 1. expo-updates — the canonical reload. Works in Expo Go + EAS + dev-client.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Updates = require("expo-updates");
    if (Updates?.reloadAsync) {
      await Updates.reloadAsync();
      return;
    }
  } catch {
    // expo-updates isn't installed / not available — fall through.
  }

  // 2. DevSettings from react-native — classic Metro reload.
  // Don't guard with `typeof ... === "function"` (some Expo Go builds report
  // undefined even when the native side is wired up). Just call + catch.
  try {
    DevSettings.reload();
    return;
  } catch {
    // fall through
  }

  // 3. Direct native-module call — bypasses the JS wrapper.
  try {
    NativeModules?.DevSettings?.reload?.();
    return;
  } catch {
    // Silent — persist stands, theme applies on next open.
  }
}
