/**
 * Weekly momentum snapshot — client-side stopgap until a backend
 * momentum_snapshots table lands.
 *
 * On the first Arena open of each ISO week (Monday-starting, IST), we
 * snapshot the current worker score to SecureStore. Subsequent opens
 * within the same week diff against it to render "+18 this week" on
 * the ArenaHero.
 *
 * Limitations of the client-only approach:
 *  - Delta resets when the app is reinstalled (SecureStore is per-install).
 *  - No visibility across devices (a runner using two phones each get a
 *    separate snapshot). Both are acceptable for a v1 signal.
 */
import * as SecureStore from "expo-secure-store";

const KEY_WEEK = "arena_snapshot_week_v1";
const KEY_SCORE = "arena_snapshot_score_v1";

function currentIsoWeekStamp(now: Date = new Date()): string {
  // Convert to IST (UTC+5:30) for consistency with backend week math
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const ist = new Date(utcMs + 5.5 * 60 * 60_000);
  const day = ist.getUTCDay(); // 0=Sun ... 6=Sat
  const daysFromMon = (day + 6) % 7;
  const monday = new Date(ist);
  monday.setUTCDate(ist.getUTCDate() - daysFromMon);
  return monday.toISOString().slice(0, 10); // YYYY-MM-DD of Monday
}

/**
 * Read the previously-stored snapshot and compare to the current score.
 * If we're in a new week, roll the snapshot forward (records the new
 * baseline) and return delta = 0. Otherwise, return current - baseline.
 * Returns null the very first time (no baseline stored yet — we can't
 * fabricate a delta).
 */
export async function readWeeklyDelta(currentScore: number): Promise<number | null> {
  try {
    const [storedWeek, storedScoreStr] = await Promise.all([
      SecureStore.getItemAsync(KEY_WEEK),
      SecureStore.getItemAsync(KEY_SCORE),
    ]);
    const thisWeek = currentIsoWeekStamp();

    // First-ever run — record baseline, no delta yet
    if (!storedWeek || !storedScoreStr) {
      await Promise.all([
        SecureStore.setItemAsync(KEY_WEEK, thisWeek),
        SecureStore.setItemAsync(KEY_SCORE, String(currentScore)),
      ]);
      return null;
    }

    // New week — roll the snapshot forward, reset delta to 0
    if (storedWeek !== thisWeek) {
      await Promise.all([
        SecureStore.setItemAsync(KEY_WEEK, thisWeek),
        SecureStore.setItemAsync(KEY_SCORE, String(currentScore)),
      ]);
      return 0;
    }

    // Same week — diff against baseline
    const baseline = parseInt(storedScoreStr, 10);
    if (Number.isNaN(baseline)) return null;
    return currentScore - baseline;
  } catch {
    return null;
  }
}
