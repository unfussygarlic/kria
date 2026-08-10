"use client";

/**
 * TimeToEventPill — colored chip for "Today" / "Tomorrow" / "In 3d" style
 * labels. Reads the tone from lib/urgency.timeToEvent() and picks a color.
 *
 * Kept intentionally small: designed to slot next to a gig title without
 * fighting for attention.
 */

import { timeToEvent, type TimeToEvent } from "@/lib/urgency";

interface Props {
  /** Pass either a raw date or the pre-computed TimeToEvent. */
  eventDate?: string | Date;
  tte?: TimeToEvent;
  /** "solid" = filled pill; "muted" = subtle rendering for lists. */
  variant?: "solid" | "muted";
  className?: string;
}

export function TimeToEventPill({ eventDate, tte, variant = "muted", className = "" }: Props) {
  const t = tte ?? (eventDate ? timeToEvent(eventDate) : null);
  if (!t) return null;

  // Color mapping mirrors the app-wide urgency vocabulary:
  //  today   → coral (act now)
  //  tomorrow → amber (act soon)
  //  soon    → gold-ish  (heads-up)
  //  future  → muted (informational)
  //  past    → muted grey (context only)
  const color =
    t.tone === "today"    ? "#ff7351" :
    t.tone === "tomorrow" ? "#FFC83D" :
    t.tone === "soon"     ? "#FFC83D" :
    "var(--color-text-muted)";

  const bg = variant === "solid"
    ? `color-mix(in srgb, ${color === "var(--color-text-muted)" ? "#777575" : color} 18%, transparent)`
    : "transparent";
  const border = variant === "solid"
    ? "1px solid transparent"
    : `1px solid color-mix(in srgb, ${color === "var(--color-text-muted)" ? "#777575" : color} 30%, transparent)`;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${className}`}
      style={{ color, background: bg, border }}
    >
      {t.label}
    </span>
  );
}
