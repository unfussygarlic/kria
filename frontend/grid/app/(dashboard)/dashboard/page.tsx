"use client";

/**
 * Dashboard — the host's home screen. Redesigned 2026-08-07 from a generic
 * KPI grid into a worklist.
 *
 * Old dashboard led with 4 stat cards (Active Gigs / Events / Slots Filled /
 * Total Posted), a "recent gigs" table that duplicated /gigs, and a filler
 * "System Status: 99.98% uptime" card. Vanity metrics with no next step.
 *
 * New dashboard answers the only question a returning host cares about:
 * **what should I look at right now?**
 *
 * Section order (top → bottom, most actionable first):
 *   1. Attention row — cards for URGENT (ends today/tomorrow, unfilled),
 *      PENDING (applications waiting), EXPIRED (past date, not resolved)
 *   2. This week — 7-day agenda of upcoming gigs sorted by event_date
 *   3. At a glance — compact stat strip (fill rate, active count, this month
 *      pay committed) tucked at the bottom
 *
 * All data comes from a single `GET /gigs/mine` call → PostedGigSummary[]
 * (already carries pending_count per gig), no need for a fan-out.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, ArrowRight, AlertTriangle, Inbox, TimerReset,
  Calendar, Zap, TrendingUp, MapPin,
} from "lucide-react";
import { listMyGigs, type PostedGigSummary } from "@/lib/api/gigs";
import { PageLoader } from "@/components/ui/Spinner";
import { UrgencyDot } from "@/components/ui/UrgencyDot";
import { TimeToEventPill } from "@/components/ui/TimeToEventPill";
import { computeWorkQueue, timeToEvent, type WorkQueue } from "@/lib/urgency";
import { supabase } from "@/lib/supabase";

// ── Types ────────────────────────────────────────────────────────────────────

interface DashboardData {
  gigs: PostedGigSummary[];
  firstName: string | null;
}

// ── Action card ──────────────────────────────────────────────────────────────
// One card per bucket in the top "Attention" row. Shown only when its count
// is > 0 — the row shrinks to just the cards that carry a real signal.

function ActionCard({
  tone, Icon, title, sub, count, cta, onClick,
}: {
  tone: "urgent" | "pending" | "expired";
  Icon: React.ElementType;
  title: string;
  sub: string;
  count: number;
  cta: string;
  onClick: () => void;
}) {
  const color =
    tone === "urgent"  ? "#ff7351" :
    tone === "pending" ? "var(--lime)" :
    "var(--color-text-muted)";
  const bg =
    tone === "urgent"  ? "color-mix(in srgb, #ff7351 8%, var(--card-bg))" :
    tone === "pending" ? "color-mix(in srgb, var(--lime) 6%, var(--card-bg))" :
    "var(--card-bg)";

  return (
    <button
      onClick={onClick}
      className="text-left border transition-all hover:brightness-110 active:scale-[0.99] group shadow-card"
      style={{
        backgroundColor: bg,
        borderColor: tone === "expired" ? "var(--border-color)" : `color-mix(in srgb, ${color} 35%, transparent)`,
        borderRadius: "var(--r-card)",
        padding: "var(--s-lg)",
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <span className="text-3xl font-bold leading-none tabular-nums" style={{ color }}>{count}</span>
      </div>
      <p className="text-sm font-bold text-text mb-1">{title}</p>
      <p className="text-xs text-text-muted mb-4">{sub}</p>
      <span
        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest transition-transform group-hover:translate-x-0.5"
        style={{ color }}
      >
        {cta} <ArrowRight size={11} />
      </span>
    </button>
  );
}

// ── Agenda row (This week list) ─────────────────────────────────────────────
// Compact one-line per gig — the whole point of the row is to *not* eat a
// full card each. Left: title + city. Right: time-to-event pill + slot fill.

function AgendaRow({ gig }: { gig: PostedGigSummary }) {
  const fillPct = gig.slots_total > 0
    ? Math.round((gig.slots_filled / gig.slots_total) * 100) : 0;
  const filled = gig.slots_filled >= gig.slots_total && gig.slots_total > 0;

  return (
    <Link
      href={`/gigs/${gig.id}`}
      className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-white/[0.03] transition-colors group"
    >
      <TimeToEventPill eventDate={gig.event_date} className="flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text truncate group-hover:text-primary transition-colors">
          {gig.title}
        </p>
        <p className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5">
          <MapPin size={9} />{gig.city}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {gig.pending_count > 0 && (
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
            {gig.pending_count} pending
          </span>
        )}
        <div className="w-16 h-1 bg-surface-3 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${fillPct}%`,
              backgroundColor: filled ? "var(--fill-complete)" : "var(--fill-partial)",
            }}
          />
        </div>
        <span className="text-xs text-text-sub tabular-nums w-10 text-right">
          {gig.slots_filled}/{gig.slots_total}
        </span>
      </div>
    </Link>
  );
}

// ── Stat strip (at a glance, at the bottom) ─────────────────────────────────

function StatStrip({ items }: { items: { label: string; value: string; Icon: React.ElementType }[] }) {
  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 overflow-hidden card shadow-card"
    >
      {items.map(({ label, value, Icon }, i) => (
        <div
          key={label}
          className={`px-5 py-4 ${i > 0 ? "border-l border-t md:border-t-0" : ""}`}
          style={{ borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Icon size={12} className="text-text-muted" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{label}</span>
          </div>
          <p className="text-xl font-bold text-text tabular-nums">{value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [gigsRes, userRes] = await Promise.all([
        listMyGigs(),
        supabase.auth.getUser(),
      ]);

      let firstName: string | null = null;
      const userId = userRes.data.user?.id;
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name")
          .eq("id", userId)
          .single();
        firstName = profile?.first_name ?? null;
      }

      setData({
        gigs: gigsRes.data?.items ?? [],
        firstName,
      });
      setLoading(false);
    };
    load();
  }, []);

  const queue: WorkQueue | null = useMemo(
    () => (data ? computeWorkQueue(data.gigs) : null),
    [data]
  );

  if (loading || !data || !queue) return <PageLoader />;

  const { gigs, firstName } = data;
  const greeting = firstName ? `Hi, ${firstName}` : "Host Dashboard";

  // Empty state — no gigs ever posted.
  if (gigs.length === 0) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="pg-eyebrow">Overview</p>
          <h1 className="pg-title">{greeting}</h1>
          <p className="pg-sub">Welcome to Grid. Post your first gig to see runners apply.</p>
        </div>
        <div className="p-16 text-center card-hero shadow-card-lg">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-6 flex items-center justify-center">
            <Zap size={28} className="text-primary" />
          </div>
          <h2 className="text-lg font-bold text-text mb-2">You&apos;re one gig away</h2>
          <p className="text-sm text-text-muted mb-6 max-w-md mx-auto">
            Post a role, set a shift time and pay, and verified runners near your venue will start applying.
          </p>
          <button
            onClick={() => router.push("/gigs/new")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-text-inv text-xs font-bold uppercase tracking-wider rounded-lg hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus size={14} /> Post your first gig
          </button>
        </div>
      </div>
    );
  }

  // ── Derived stats (compact strip at bottom) ────────────────────────────
  const activeGigs   = gigs.filter((g) => g.status === "open" || g.status === "in_progress").length;
  const totalSlots   = gigs.reduce((s, g) => s + g.slots_total, 0);
  const filledSlots  = gigs.reduce((s, g) => s + g.slots_filled, 0);
  const fillRate     = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

  // "Coming up" = next 7 days worth of upcoming gigs, excluding already-urgent
  // ones (which are shown in the Attention row above so we don't repeat them).
  const upcomingList = queue.upcoming.slice(0, 6);
  const hasAnyAction = queue.urgent.length + queue.pending.length + queue.expired.length > 0;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="pg-eyebrow">Overview</p>
          <h1 className="pg-title">{greeting}</h1>
          <p className="pg-sub">
            {hasAnyAction
              ? "Here's what needs your attention today."
              : "All caught up. Nothing needs immediate action."}
          </p>
        </div>
        <button
          onClick={() => router.push("/gigs/new")}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-text-inv text-xs font-bold uppercase tracking-wider rounded hover:brightness-110 active:scale-95 transition-all"
        >
          <Plus size={14} /> Post a Gig
        </button>
      </div>

      {/* ── Attention row (only shown when there's something to act on) ──── */}
      {hasAnyAction && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {queue.urgent.length > 0 && (
            <ActionCard
              tone="urgent"
              Icon={AlertTriangle}
              title="Runners needed"
              sub={
                queue.urgent.length === 1
                  ? "1 gig starts soon and isn't full"
                  : `${queue.urgent.length} gigs start soon and aren't full`
              }
              count={queue.urgent.length}
              cta="Review gigs"
              onClick={() => router.push(`/gigs/${queue.urgent[0]!.id}`)}
            />
          )}
          {queue.totalPendingApplications > 0 && (
            <ActionCard
              tone="pending"
              Icon={Inbox}
              title="Applications waiting"
              sub={
                queue.pending.length === 1
                  ? `On 1 gig — review and accept`
                  : `Across ${queue.pending.length} gigs — review and accept`
              }
              count={queue.totalPendingApplications}
              cta="Open inbox"
              onClick={() => router.push("/applications")}
            />
          )}
          {queue.expired.length > 0 && (
            <ActionCard
              tone="expired"
              Icon={TimerReset}
              title="Ended without wrap-up"
              sub={
                queue.expired.length === 1
                  ? "1 gig ended and is still marked open"
                  : `${queue.expired.length} gigs ended and are still marked open`
              }
              count={queue.expired.length}
              cta="Resolve"
              onClick={() => router.push("/gigs")}
            />
          )}
        </div>
      )}

      {/* ── This week (agenda) ──────────────────────────────────────────── */}
      <div className="overflow-hidden mb-6 card shadow-card">
        <div
          className="px-5 py-4 flex items-center justify-between border-b"
          style={{ borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2.5">
            <Calendar size={14} className="text-text-muted" />
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-text">
              This week
            </h2>
            <UrgencyDot count={queue.urgent.length} showLabel />
          </div>
          <Link
            href="/gigs"
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-primary transition-colors"
          >
            All gigs <ArrowRight size={11} />
          </Link>
        </div>
        {upcomingList.length === 0 && queue.urgent.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-text-muted">Nothing scheduled in the next 7 days.</p>
          </div>
        ) : (
          <div className="p-2">
            {/* Merge urgent + upcoming, urgent first, dedup by id */}
            {(() => {
              const merged: PostedGigSummary[] = [];
              const seen = new Set<string>();
              for (const g of [...queue.urgent, ...upcomingList]) {
                if (seen.has(g.id)) continue;
                seen.add(g.id);
                merged.push(g);
              }
              return merged.slice(0, 8).map((g) => <AgendaRow key={g.id} gig={g} />);
            })()}
          </div>
        )}
      </div>

      {/* ── At a glance (compact stat strip, not the star of the page) ──── */}
      <StatStrip
        items={[
          { label: "Active gigs",  value: String(activeGigs),                       Icon: Zap },
          { label: "Fill rate",    value: `${fillRate}%`,                            Icon: TrendingUp },
          { label: "Slots filled", value: `${filledSlots}/${totalSlots}`,            Icon: Inbox },
          { label: "Total posted", value: String(gigs.length),                       Icon: Calendar },
        ]}
      />
    </div>
  );
}
