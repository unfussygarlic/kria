/**
 * Shift-time helpers used by Space cards + sheet + gig detail.
 *
 * Kept in one place so the "starts in Xh Ym" language stays consistent
 * across the app. All calculations are local-time on the runner's device.
 */

/**
 * How long until a shift starts (or how long it's been running).
 * Positive = future, negative = past. Returns null if event_date is null.
 */
export function shiftStartTs(eventDate: string | null, shiftStart: string | null): number | null {
  if (!eventDate) return null;
  const d = new Date(eventDate);
  const [hh, mm] = (shiftStart ?? "09:00").split(":");
  d.setHours(Number(hh ?? 9), Number(mm ?? 0), 0, 0);
  return d.getTime();
}

export function shiftEndTs(eventDate: string | null, shiftEnd: string | null): number | null {
  if (!eventDate) return null;
  const d = new Date(eventDate);
  const [hh, mm] = (shiftEnd ?? "23:59").split(":");
  d.setHours(Number(hh ?? 23), Number(mm ?? 59), 0, 0);
  return d.getTime();
}

/**
 * Human-friendly countdown label. Refresh on a 30s interval to stay live.
 *
 * Returns one of:
 *   - "Live now"                — shift is currently running
 *   - "Ended"                   — shift is fully past
 *   - "Starts in Xm"            — <60 min out
 *   - "Starts in Xh Ym"         — same day or <24h out
 *   - "Starts in Xd"            — >=1 day out
 *   - "In N days"               — >7 days (less urgent framing)
 *   - null                      — no event_date
 */
export function countdownLabel(
  eventDate: string | null,
  shiftStart: string | null,
  shiftEnd: string | null,
  now: number = Date.now(),
): string | null {
  const startTs = shiftStartTs(eventDate, shiftStart);
  if (startTs === null) return null;
  const endTs = shiftEndTs(eventDate, shiftEnd) ?? startTs;

  if (now >= startTs && now <= endTs) return "Live now";
  if (now > endTs) return "Ended";

  const diffMs = startTs - now;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `Starts in ${Math.max(1, mins)}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins - hours * 60;
  if (hours < 24) {
    return remMins > 0 ? `Starts in ${hours}h ${remMins}m` : `Starts in ${hours}h`;
  }
  const days = Math.round(hours / 24);
  if (days > 7) return `In ${days} days`;
  return `Starts in ${days}d`;
}

/** True when the shift starts within the next 24 hours (and hasn't ended). */
export function isImminent(eventDate: string | null, shiftStart: string | null, shiftEnd: string | null, now: number = Date.now()): boolean {
  const startTs = shiftStartTs(eventDate, shiftStart);
  const endTs = shiftEndTs(eventDate, shiftEnd);
  if (startTs === null || endTs === null) return false;
  if (now > endTs) return false;
  return (startTs - now) <= 24 * 60 * 60 * 1000;
}

/** True while the shift window is currently open. */
export function isLive(eventDate: string | null, shiftStart: string | null, shiftEnd: string | null, now: number = Date.now()): boolean {
  const startTs = shiftStartTs(eventDate, shiftStart);
  const endTs = shiftEndTs(eventDate, shiftEnd);
  if (startTs === null || endTs === null) return false;
  return now >= startTs && now <= endTs;
}
