/**
 * Urgency helpers — used by dashboard worklist, sidebar dots, and list badges
 * to answer "what should the host look at first?"
 *
 * All time math is done in the browser's local timezone. Kria's ops are
 * India-only so this is effectively IST already. If we ever ship overseas we
 * pass timeZone: "Asia/Kolkata" into these functions.
 */

import type { Gig } from "@/types";
import type { PostedGigSummary } from "@/lib/api/gigs";

/** Milliseconds in one day — pulled out because the constant appears a lot. */
const DAY_MS = 86_400_000;

export interface TimeToEvent {
  /** Whole days between today and event_date. Negative = past. */
  days: number;
  /** Short label like "Today" / "Tomorrow" / "In 3d" / "6d ago". Null if event_date is null. */
  label: string;
  /** How much attention this deserves visually. */
  tone: "past" | "today" | "tomorrow" | "soon" | "future";
}

/**
 * Turn an event_date into a human "when" summary. Same day-granularity used
 * across the app (matches server-side gig expiry math where day granularity
 * is fine — hosts don't schedule to the minute).
 */
export function timeToEvent(eventDate: string | Date): TimeToEvent {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(eventDate);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - today.getTime()) / DAY_MS);

  if (days < 0)  return { days, label: `${Math.abs(days)}d ago`, tone: "past" };
  if (days === 0) return { days, label: "Today",                   tone: "today" };
  if (days === 1) return { days, label: "Tomorrow",                tone: "tomorrow" };
  if (days <= 3)  return { days, label: `In ${days}d`,             tone: "soon" };
  return { days, label: `In ${days}d`, tone: "future" };
}

/** Anything with < 100% fill and event day today or tomorrow. */
export function needsUrgentAttention(gig: {
  status: string;
  event_date: string;
  event_end_date?: string | null;
  slots_filled: number;
  slots_total: number;
  is_paused?: boolean;
}): boolean {
  if (gig.status !== "open" && gig.status !== "in_progress") return false;
  if (gig.is_paused) return false;
  const { tone } = timeToEvent(gig.event_end_date ?? gig.event_date);
  if (tone !== "today" && tone !== "tomorrow") return false;
  return gig.slots_filled < gig.slots_total;
}

/**
 * Gig has already ended (last day is in the past) but is still sitting in an
 * unresolved status — a stale gig the host should finalise, not just
 * historical noise. Mirrors the isExpired helper duplicated inline across the
 * gigs/events pages today.
 */
export function isExpired(gig: {
  status: string;
  event_date: string;
  event_end_date?: string | null;
}): boolean {
  if (gig.status !== "open" && gig.status !== "in_progress") return false;
  const { tone } = timeToEvent(gig.event_end_date ?? gig.event_date);
  return tone === "past";
}

// ── Work queue ────────────────────────────────────────────────────────────────
// Given the lightweight gig summaries the host's dashboard has access to,
// bucket them into what needs action right now.

export interface WorkQueue {
  /** Ends today/tomorrow with unfilled slots. */
  urgent:   PostedGigSummary[];
  /** Past event_date, still open/in_progress. */
  expired:  PostedGigSummary[];
  /** Has pending applications. */
  pending:  PostedGigSummary[];
  /** Event within next 7 days, not urgent already. */
  upcoming: PostedGigSummary[];
  totalPendingApplications: number;
}

export function computeWorkQueue(gigs: PostedGigSummary[]): WorkQueue {
  const urgent:   PostedGigSummary[] = [];
  const expired:  PostedGigSummary[] = [];
  const pending:  PostedGigSummary[] = [];
  const upcoming: PostedGigSummary[] = [];
  let totalPendingApplications = 0;

  for (const g of gigs) {
    totalPendingApplications += g.pending_count;

    const tte = timeToEvent(g.event_date);
    const isActive = g.status === "open" || g.status === "in_progress";
    const paused = g.is_paused === true;
    const filled = g.slots_filled >= g.slots_total;

    if (isActive && !paused && tte.tone === "past") {
      expired.push(g);
      continue;
    }
    if (isActive && !paused && !filled && (tte.tone === "today" || tte.tone === "tomorrow")) {
      urgent.push(g);
    }
    if (g.pending_count > 0) {
      pending.push(g);
    }
    if (isActive && !paused && tte.days >= 0 && tte.days <= 7 && !urgent.includes(g)) {
      upcoming.push(g);
    }
  }

  // Sort each bucket most-relevant first.
  urgent.sort((a, b) => timeToEvent(a.event_date).days - timeToEvent(b.event_date).days);
  expired.sort((a, b) => timeToEvent(b.event_date).days - timeToEvent(a.event_date).days);
  pending.sort((a, b) => b.pending_count - a.pending_count);
  upcoming.sort((a, b) => timeToEvent(a.event_date).days - timeToEvent(b.event_date).days);

  return { urgent, expired, pending, upcoming, totalPendingApplications };
}

// ── Time buckets for /gigs list ──────────────────────────────────────────────

export type GigBucket = "this_week" | "later" | "past" | "drafts";

export function bucketGig(gig: Pick<Gig, "status" | "event_date" | "event_end_date">): GigBucket {
  if (gig.status === "draft") return "drafts";
  const { days } = timeToEvent(gig.event_end_date ?? gig.event_date);
  if (days < 0) return "past";
  if (days <= 7) return "this_week";
  return "later";
}
