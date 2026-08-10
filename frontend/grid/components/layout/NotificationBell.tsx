"use client";

/**
 * NotificationBell — small bell in the TopBar. Red dot when there's anything
 * in the host's work queue. On click, opens a compact dropdown listing:
 *   • pending applications (top gig by pending_count)
 *   • urgent gigs (ending today/tomorrow, unfilled)
 *   • expired gigs (past date, still open)
 *
 * We deliberately don't build a full "notifications table" — this is derived
 * live from the same summary the sidebar dots use. If we ever ship real push
 * notifications (email/SMS delivery events, badge awards, etc.) this
 * component grows to consume those; for now it's the worklist digest.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ArrowRight, AlertTriangle, Inbox, TimerReset } from "lucide-react";
import { useHostQueue } from "./HostQueueProvider";
import { TimeToEventPill } from "@/components/ui/TimeToEventPill";

export function NotificationBell() {
  const { queue } = useHostQueue();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const totalUrgent =
    queue.urgent.length + queue.expired.length + queue.totalPendingApplications;

  // Outside-click close (mirrors TopBar dropdown pattern).
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
        style={{ color: "var(--nav-inactive-text)" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--hover-bg)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        aria-label={totalUrgent > 0 ? `${totalUrgent} items need attention` : "No new notifications"}
      >
        <Bell size={16} />
        {totalUrgent > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full text-[9px] font-black flex items-center justify-center px-1"
            style={{
              backgroundColor: queue.urgent.length > 0 ? "#ff7351" : "var(--lime)",
              color: queue.urgent.length > 0 ? "#fff" : "var(--lime-on)",
              boxShadow: `0 0 8px ${queue.urgent.length > 0 ? "rgba(255,115,81,0.6)" : "rgba(212,255,0,0.5)"}`,
            }}
          >
            {totalUrgent > 99 ? "99+" : totalUrgent}
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
            {totalUrgent > 0 && (
              <span className="text-[10px] font-bold text-primary">{totalUrgent} to review</span>
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
