"use client";

/**
 * NotificationBell — small bell in the TopBar. Badge shows the count of
 * *unseen* items. On click, opens a compact dropdown listing:
 *   • pending applications (top gig by pending_count)
 *   • urgent gigs (ending today/tomorrow, unfilled)
 *   • expired gigs (past date, still open)
 *
 * ── Seen / unseen state ────────────────────────────────────────────────────
 * The bell shows *live derived state* (not a persisted notifications table),
 * so the classic read/unread pattern needs a small helper: each item has a
 * stable signature (`kind:id:extra`) — we persist the set of signatures the
 * host has already seen in localStorage. Opening the bell marks the current
 * set as seen; the badge only counts signatures NOT in that set. When a new
 * pending application comes in (new signature) the badge lights up again.
 *
 * If the underlying condition later disappears naturally (host accepts the
 * applicant → pending_count drops → signature vanishes from queue), it's
 * also removed from the seen-set on the next render, so a *repeat* of the
 * same condition later gets flagged as new again.
 *
 * Storage key is versioned (`kria:bell:seen:v1`) so we can invalidate later
 * without a migration.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ArrowRight, AlertTriangle, Inbox, TimerReset, CheckCheck } from "lucide-react";
import { useHostQueue } from "./HostQueueProvider";
import { TimeToEventPill } from "@/components/ui/TimeToEventPill";

const SEEN_KEY = "kria:bell:seen:v1";

/** Load seen signatures from localStorage. SSR-safe. */
function loadSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveSeen(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
  } catch {
    /* quota exceeded / private mode — silently ignore */
  }
}

export function NotificationBell() {
  const { queue } = useHostQueue();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const wrapRef = useRef<HTMLDivElement>(null);

  // Hydrate seen set from localStorage once on mount (avoids SSR mismatch).
  useEffect(() => { setSeen(loadSeen()); }, []);

  // Build the item list with stable signatures. Ordering mirrors the render
  // order below (pending → urgent → expired).
  interface BellItem { sig: string; }
  const items: BellItem[] = useMemo(() => {
    const list: BellItem[] = [];
    if (queue.totalPendingApplications > 0) {
      // Whole pending group is one signature; the number changes when it does.
      list.push({ sig: `pending:${queue.totalPendingApplications}` });
    }
    for (const g of queue.urgent) list.push({ sig: `urgent:${g.id}:${g.slots_filled}/${g.slots_total}` });
    for (const g of queue.expired.slice(0, 3)) list.push({ sig: `expired:${g.id}` });
    return list;
  }, [queue]);

  const sigSet = useMemo(() => new Set(items.map((i) => i.sig)), [items]);

  // Garbage-collect stale sigs (conditions that no longer exist). Prevents
  // the seen-set from growing unbounded, and re-flags recurring conditions.
  useEffect(() => {
    if (seen.size === 0) return;
    let changed = false;
    const next = new Set<string>();
    for (const s of seen) {
      if (sigSet.has(s)) { next.add(s); } else { changed = true; }
    }
    if (changed) { setSeen(next); saveSeen(next); }
  }, [sigSet, seen]);

  // Unseen count = items whose signature isn't in the seen set.
  const unseenCount = items.reduce((n, it) => n + (seen.has(it.sig) ? 0 : 1), 0);
  const totalUrgent = items.length; // total items still requiring action (badge = unseen, dropdown lists all)
  const urgentUnseen = queue.urgent.some((g) => !seen.has(`urgent:${g.id}:${g.slots_filled}/${g.slots_total}`));

  const markAllSeen = () => {
    setSeen((prev) => {
      const next = new Set(prev);
      for (const s of sigSet) next.add(s);
      saveSeen(next);
      return next;
    });
  };

  // Outside-click close (mirrors TopBar dropdown pattern).
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  // Opening the bell marks the currently-displayed items as seen — matches
  // Gmail/Slack style where opening the tray IS the "I saw it" signal.
  useEffect(() => {
    if (open) markAllSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
        style={{ color: "var(--nav-inactive-text)" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--hover-bg)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        aria-label={unseenCount > 0 ? `${unseenCount} unseen notifications` : "No new notifications"}
      >
        <Bell size={16} />
        {unseenCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full text-[9px] font-black flex items-center justify-center px-1"
            style={{
              // Coral only when a coral-tone (urgent) row is among the unseen.
              backgroundColor: urgentUnseen ? "#ff7351" : "var(--lime)",
              color: urgentUnseen ? "#fff" : "var(--lime-on)",
              boxShadow: urgentUnseen
                ? "0 0 8px rgba(255,115,81,0.55)"
                : "0 0 8px color-mix(in srgb, var(--lime) 55%, transparent)",
            }}
          >
            {unseenCount > 99 ? "99+" : unseenCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[340px] rounded-xl overflow-hidden z-50 shadow-2xl"
          style={{
            backgroundColor: "var(--sidebar-bg)",
            border: "1px solid var(--border-color)",
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 border-b flex items-center justify-between"
            style={{ borderColor: "var(--border-color)" }}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Notifications</span>
            {totalUrgent > 0 ? (
              <span className="text-[10px] font-bold text-text-muted">{totalUrgent} pending</span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-bold text-primary">
                <CheckCheck size={11} /> All clear
              </span>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[420px] overflow-y-auto">
            {totalUrgent === 0 ? (
              <div className="px-4 py-10 text-center">
                <div
                  className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center"
                  style={{ backgroundColor: "color-mix(in srgb, var(--lime) 12%, transparent)" }}
                >
                  <Bell size={16} className="text-primary" />
                </div>
                <p className="text-xs font-bold text-text mb-1">All caught up</p>
                <p className="text-[11px] text-text-muted">Nothing to review right now.</p>
              </div>
            ) : (
              <>
                {queue.totalPendingApplications > 0 && (
                  <Link
                    href="/applications"
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.04] border-b"
                    style={{ borderColor: "var(--border-subtle, var(--border-color))" }}
                  >
                    <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: "color-mix(in srgb, var(--lime) 12%, transparent)" }}>
                      <Inbox size={13} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-text">{queue.totalPendingApplications} applications waiting</p>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        Across {queue.pending.length} gig{queue.pending.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <ArrowRight size={11} className="text-text-muted mt-1 flex-shrink-0" />
                  </Link>
                )}

                {queue.urgent.map((g) => (
                  <Link
                    key={`u-${g.id}`}
                    href={`/gigs/${g.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.04] border-b"
                    style={{ borderColor: "var(--border-subtle, var(--border-color))" }}
                  >
                    <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: "color-mix(in srgb, #ff7351 12%, transparent)" }}>
                      <AlertTriangle size={13} style={{ color: "#ff7351" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-bold text-text truncate">{g.title}</p>
                        <TimeToEventPill eventDate={g.event_date} />
                      </div>
                      <p className="text-[10px] text-text-muted">
                        {g.slots_filled}/{g.slots_total} slots · {g.city}
                      </p>
                    </div>
                    <ArrowRight size={11} className="text-text-muted mt-1 flex-shrink-0" />
                  </Link>
                ))}

                {queue.expired.slice(0, 3).map((g) => (
                  <Link
                    key={`e-${g.id}`}
                    href={`/gigs/${g.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.04] border-b"
                    style={{ borderColor: "var(--border-subtle, var(--border-color))" }}
                  >
                    <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                      <TimerReset size={13} className="text-text-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-text truncate">{g.title}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">Ended without wrap-up</p>
                    </div>
                    <ArrowRight size={11} className="text-text-muted mt-1 flex-shrink-0" />
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
