"use client";

/**
 * Gigs list — the "everything I've posted" archive. Redesigned 2026-08-07:
 *
 * Was: single flat table sorted by created_at (when the host posted), py-5
 *   rows that ate vertical space, max-w-6xl leaving 400px+ empty on wide
 *   screens, filter tabs by status.
 * Now: time-bucketed (This week / Later / Past / Drafts), denser rows
 *   (py-2.5), max-w-7xl for more visible rows, event_date-first sort within
 *   each bucket, status filter still available as a secondary control.
 *
 * Hosts think in weeks and events, not "when did I create this?" — the old
 * created_at sort meant a gig you posted 6 months ago for tomorrow was near
 * the bottom, and a gig you posted last night for next month was at the top.
 * Reversed.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Pause, Play } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { pauseGig, unpauseGig } from "@/lib/api/gigs";
import { GigStatusBadge, PausedBadge, ExpiredBadge } from "@/components/ui/Badge";
import { TimeToEventPill } from "@/components/ui/TimeToEventPill";
import { PageLoader } from "@/components/ui/Spinner";
import { bucketGig, isExpired, timeToEvent, type GigBucket } from "@/lib/urgency";
import type { Gig, GigStatus } from "@/types";

const STATUS_FILTERS: { label: string; value: GigStatus | "all" }[] = [
  { label: "All",         value: "all" },
  { label: "Open",        value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed",   value: "completed" },
  { label: "Cancelled",   value: "cancelled" },
];

const BUCKET_ORDER: GigBucket[] = ["this_week", "later", "past", "drafts"];
const BUCKET_LABEL: Record<GigBucket, string> = {
  this_week: "This week",
  later:     "Later",
  past:      "Past",
  drafts:    "Drafts",
};
const BUCKET_SUB: Record<GigBucket, string> = {
  this_week: "Next 7 days",
  later:     "More than a week out",
  past:      "Event date has passed",
  drafts:    "Not yet published",
};

function formatPay(amount: number, type: string) {
  const f = `₹${amount.toLocaleString("en-IN")}`;
  if (type === "hourly") return `${f}/hr`;
  if (type === "per_day") return `${f}/day`;
  return f;
}

// ── Row ──────────────────────────────────────────────────────────────────────
// Compact single-line-ish gig row. Cover thumb + title/city on the left, then
// pay / slots / status / pause button on the right. py-2.5 makes ~2× more
// visible on a screen vs. the old py-5.

function GigRow({
  gig, onOpen, onTogglePause, pauseLoading,
}: {
  gig: Gig;
  onOpen: () => void;
  onTogglePause: (e: React.MouseEvent) => void;
  pauseLoading: boolean;
}) {
  const expired = isExpired(gig);
  const fillPct = gig.slots_total > 0
    ? Math.round((gig.slots_filled / gig.slots_total) * 100) : 0;
  const filled = gig.slots_filled >= gig.slots_total && gig.slots_total > 0;

  return (
    <div
      onClick={onOpen}
      className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-2.5 rounded-lg cursor-pointer hover:bg-white/[0.03] transition-all ${
        gig.is_paused || expired ? "opacity-60" : ""
      }`}
    >
      {/* Cover thumb — 36px keeps the row scannable */}
      {gig.cover_image_square_url ? (
        <img
          src={gig.cover_image_square_url}
          alt=""
          className="w-9 h-9 rounded-md object-cover flex-shrink-0"
          style={{ border: "1px solid var(--border-color)" }}
        />
      ) : (
        <div
          className="w-9 h-9 rounded-md flex-shrink-0"
          style={{ backgroundColor: "var(--surface-3, rgba(255,255,255,0.05))", border: "1px solid var(--border-color)" }}
        />
      )}

      {/* Title + city + category */}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text truncate">{gig.title}</p>
        <p className="text-[11px] text-text-muted mt-0.5 truncate">
          {gig.city} · {gig.category.replace(/_/g, " ")}
        </p>
      </div>

      {/* Time pill (kept out of the compact when past — the row already dims) */}
      <TimeToEventPill eventDate={gig.event_date} className="hidden md:inline-flex" />

      {/* Pay */}
      <p className="text-xs text-text-sub tabular-nums hidden lg:block whitespace-nowrap">
        {formatPay(gig.pay_amount, gig.pay_type)}
      </p>

      {/* Slot fill mini-bar */}
      <div className="flex items-center gap-2">
        <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${fillPct}%`,
              backgroundColor: filled ? "var(--fill-complete)" : "var(--fill-partial)",
            }}
          />
        </div>
        <span className="text-xs text-text-sub tabular-nums w-9 text-right">
          {gig.slots_filled}/{gig.slots_total}
        </span>
      </div>

      {/* Status + pause action, right-aligned */}
      <div className="flex items-center gap-2 min-w-[130px] justify-end">
        {expired ? (
          <ExpiredBadge />
        ) : (
          <>
            <GigStatusBadge status={gig.status} />
            {gig.is_paused && <PausedBadge />}
          </>
        )}
        {(gig.status === "open" || gig.status === "in_progress") && !expired && (
          <button
            onClick={onTogglePause}
            disabled={pauseLoading}
            title={gig.is_paused ? "Resume gig" : "Pause gig"}
            className="w-7 h-7 rounded flex items-center justify-center transition-colors disabled:opacity-40 hover:bg-white/10"
            style={{ color: gig.is_paused ? "var(--lime)" : "var(--color-amber, #FFC83D)" }}
          >
            {gig.is_paused ? <Play size={12} /> : <Pause size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Section header ──────────────────────────────────────────────────────────

function BucketHeader({ bucket, count }: { bucket: GigBucket; count: number }) {
  return (
    <div className="flex items-baseline justify-between px-4 pb-2 mb-1">
      <div className="flex items-baseline gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-text">
          {BUCKET_LABEL[bucket]}
        </h2>
        <span className="text-[10px] font-bold text-text-muted tabular-nums">{count}</span>
      </div>
      <span className="text-[10px] text-text-muted">{BUCKET_SUB[bucket]}</span>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function GigsPage() {
  const router = useRouter();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<GigStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [pauseLoading, setPauseLoading] = useState<string | null>(null);

  const handleTogglePause = async (e: React.MouseEvent, gig: Gig) => {
    e.stopPropagation();
    setPauseLoading(gig.id);
    const fn = gig.is_paused ? unpauseGig : pauseGig;
    const res = await fn(gig.id);
    if (res.data) {
      setGigs((prev) => prev.map((g) => g.id === gig.id ? { ...g, is_paused: res.data!.is_paused } : g));
    }
    setPauseLoading(null);
  };

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("gigs")
        .select("*")
        .eq("poster_id", user.id)
        .order("event_date", { ascending: true }); // event-first sort
      setGigs((data ?? []) as Gig[]);
      setLoading(false);
    };
    load();
  }, []);

  // Filter first (by status + search) then bucket.
  const filtered = useMemo(() => gigs.filter((g) => {
    if (statusFilter !== "all" && g.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!g.title.toLowerCase().includes(q) && !g.city.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [gigs, statusFilter, search]);

  const bucketed = useMemo(() => {
    const map: Record<GigBucket, Gig[]> = { this_week: [], later: [], past: [], drafts: [] };
    for (const g of filtered) map[bucketGig(g)].push(g);
    // Past bucket sorted descending (most recent first)
    map.past.sort((a, b) => timeToEvent(a.event_date).days - timeToEvent(b.event_date).days).reverse();
    return map;
  }, [filtered]);

  if (loading) return <PageLoader />;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="pg-eyebrow">Gigs</p>
          <h1 className="pg-title">My Gigs</h1>
          <p className="pg-sub">{gigs.length} gig{gigs.length !== 1 ? "s" : ""} posted · sorted by event date</p>
        </div>
        <button
          onClick={() => router.push("/gigs/new")}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-text-inv text-xs font-bold uppercase tracking-wider rounded hover:brightness-110 active:scale-95 transition-all"
        >
          <Plus size={14} /> Post a Gig
        </button>
      </div>

      {/* ── Filters row (status + search) ──────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {STATUS_FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded transition-colors ${
              statusFilter === value
                ? "bg-primary text-text-inv"
                : "text-text-muted hover:text-text"
            }`}
            style={statusFilter === value
              ? {}
              : { backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}
          >
            {label}
          </button>
        ))}
        <div className="ml-auto relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search gigs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 rounded pl-8 pr-3 text-xs text-text placeholder:text-text-muted outline-none focus:border-primary transition-colors w-52"
            style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}
          />
        </div>
      </div>

      {/* ── Empty state ───────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div
          className="rounded-xl p-16 text-center border"
          style={{ borderColor: "var(--border-color)", backgroundColor: "var(--card-bg)" }}
        >
          {gigs.length === 0 ? (
            <>
              <p className="text-sm text-text-muted mb-4">No gigs yet. Post your first one!</p>
              <button
                onClick={() => router.push("/gigs/new")}
                className="px-5 py-2 bg-primary text-text-inv text-xs font-bold uppercase tracking-wider rounded hover:brightness-110 transition-all"
              >
                Post a Gig
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-text-muted mb-3">No gigs match this filter.</p>
              <button
                onClick={() => { setStatusFilter("all"); setSearch(""); }}
                className="text-xs font-bold uppercase tracking-wider text-primary hover:underline"
              >
                Clear filters
              </button>
            </>
          )}
        </div>
      ) : (
        /* ── Buckets ────────────────────────────────────────────────── */
        <div className="space-y-8">
          {BUCKET_ORDER.map((bucket) => {
            const rows = bucketed[bucket];
            if (rows.length === 0) return null;
            return (
              <section key={bucket}>
                <BucketHeader bucket={bucket} count={rows.length} />
                <div
                  className="rounded-xl border overflow-hidden [&>*+*]:border-t"
                  style={{
                    borderColor: "var(--border-color)",
                    backgroundColor: "var(--card-bg)",
                    // Arbitrary child selector uses `border-t` with no color;
                    // set the divider color at container level via CSS var so
                    // both themes render consistently.
                    ["--tw-border-opacity" as string]: "1",
                  }}
                >
                  {rows.map((gig) => (
                    <div key={gig.id} style={{ borderColor: "var(--border-color)" }}>
                      <GigRow
                        gig={gig}
                        onOpen={() => router.push(`/gigs/${gig.id}`)}
                        onTogglePause={(e) => handleTogglePause(e, gig)}
                        pauseLoading={pauseLoading === gig.id}
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
