"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Users, CheckCircle, XCircle, AlertTriangle, ArrowRight,
  ChevronDown, MapPin, Briefcase, ShieldCheck, SortAsc,
} from "lucide-react";
import { listApplicants, acceptApplicant, rejectApplicant, markNoShow } from "@/lib/api/applicants";
import { listMyGigs } from "@/lib/api/gigs";
import { AppStatusBadge, AsgnStatusBadge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/Spinner";
import { MomentumChip } from "@/components/ui/MomentumChip";
import { ApplicantProfileModal } from "@/components/applicants/ApplicantProfileModal";
import { useHostQueue } from "@/components/layout/HostQueueProvider";
import type { ApplicantListItem, ApplicationStatus } from "@/types";
import type { PostedGigSummary } from "@/lib/api/gigs";
import type { ApplicantSort, ApplicantStatusFilter } from "@/lib/api/applicants";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function urgencyLabel(days: number): string | null {
  if (days < 0)  return null;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days <= 3)  return `${days}d away`;
  return null;
}

const SORT_OPTIONS: { value: ApplicantSort; label: string }[] = [
  { value: "momentum_desc", label: "Top Momentum" },
  { value: "momentum_asc",  label: "Low Momentum" },
  { value: "newest",        label: "Newest First" },
  { value: "oldest",        label: "Oldest First" },
];

const STATUS_TABS: { key: ApplicantStatusFilter; label: string }[] = [
  { key: "pending",  label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "all",      label: "All" },
];

// ── Gig chip ──────────────────────────────────────────────────────────────────

function GigChip({ gig, active, onClick }: {
  gig: PostedGigSummary; active: boolean; onClick: () => void;
}) {
  const days   = daysUntil(gig.event_date);
  const urgent = urgencyLabel(days);
  const isPast = days < 0;
  const fillPct = gig.slots_total > 0
    ? Math.round((gig.slots_filled / gig.slots_total) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className={`relative flex-shrink-0 flex flex-col gap-1.5 px-4 py-3 rounded-xl border transition-all text-left min-w-[180px] max-w-[220px] ${
        active
          ? "border-primary bg-primary/8"
          : "border-white/10 bg-surface-1 hover:border-white/25 hover:bg-surface-2"
      }`}
      // Ring glow uses the theme's --lime token so light mode gets an olive
      // outline instead of a bright yellow-green halo on the white canvas.
      style={active
        ? { boxShadow: "0 0 0 1px color-mix(in srgb, var(--lime) 30%, transparent)" }
        : undefined}
    >
      {/* Pending badge */}
      {gig.pending_count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-primary text-text-inv text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center leading-none">
          {gig.pending_count > 9 ? "9+" : gig.pending_count}
        </span>
      )}

      <p className={`text-xs font-bold leading-snug line-clamp-1 ${active ? "text-text" : "text-text-sub"}`}>
        {gig.title}
      </p>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-text-muted flex items-center gap-0.5">
          <MapPin size={8} />{gig.city}
        </span>
        <span className="text-text-muted/30 text-[10px]">·</span>
        {urgent ? (
          <span className="text-[10px] font-bold" style={{ color: "var(--color-amber)" }}>{urgent}</span>
        ) : isPast ? (
          <span className="text-[10px] text-text-muted/40">Past</span>
        ) : (
          <span className="text-[10px] text-text-muted">{formatDate(gig.event_date)}</span>
        )}
      </div>

      {/* Slot fill bar */}
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${fillPct}%`,
              backgroundColor: fillPct >= 100 ? "var(--fill-complete)" : "var(--fill-partial)",
            }}
          />
        </div>
        <span className="text-[9px] text-text-muted">{gig.slots_filled}/{gig.slots_total}</span>
      </div>
    </button>
  );
}

// ── Applicant card ────────────────────────────────────────────────────────────

function ApplicantCard({ app, gigCity, selected, actionLoading, onView, onAccept, onReject, onNoShow }: {
  app: ApplicantListItem; gigCity: string; selected: boolean; actionLoading: boolean;
  onView: () => void; onAccept: () => void; onReject: () => void; onNoShow: () => void;
}) {
  const name = app.applicant.first_name
    ? `${app.applicant.first_name}${app.applicant.last_name ? " " + app.applicant.last_name : ""}`
    : app.applicant.display_name;
  const initials = (name[0] ?? "?").toUpperCase();
  const cityMatch = app.applicant.city && gigCity
    ? app.applicant.city.toLowerCase() === gigCity.toLowerCase() : null;
  const isPending  = app.status === "pending";
  const canNoShow  = app.status === "accepted" && app.assignment_status === "assigned" && !!app.assignment_id;

  const appliedRelative = (() => {
    const hrs = Math.floor((Date.now() - new Date(app.applied_at).getTime()) / 3_600_000);
    if (hrs < 1)  return "just now";
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  })();

  return (
    <div
      onClick={onView}
      className={`border rounded-xl p-4 transition-all cursor-pointer ${
        selected
          ? "border-primary bg-primary/5"
          : "bg-surface-1 border-white/10 hover:border-white/25 hover:bg-surface-2"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-black text-text-inv">{initials}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-sm font-bold text-text">{name}</p>
            {app.applicant.id_verified && <ShieldCheck size={12} className="text-primary flex-shrink-0" />}
            <MomentumChip score={app.momentum_score} />
          </div>
          <div className="flex items-center gap-2 flex-wrap text-[11px] text-text-muted">
            {app.applicant.city && (
              <span className="flex items-center gap-0.5">
                <MapPin size={9} />
                <span className={cityMatch === true ? "text-primary font-semibold" : ""}>
                  {app.applicant.city}
                </span>
              </span>
            )}
            {app.applicant.city && <span className="opacity-40">·</span>}
            <span className="flex items-center gap-0.5">
              <Briefcase size={9} />&nbsp;{app.applicant.total_gigs_completed} gigs
            </span>
            <span className="opacity-40">·</span>
            <span>{appliedRelative}</span>
          </div>
          {app.message && (
            <p className="mt-2 text-xs text-text-sub bg-surface-3 rounded px-2.5 py-1.5 italic line-clamp-2">
              &ldquo;{app.message}&rdquo;
            </p>
          )}
        </div>

        {/* Status */}
        <div className="flex-shrink-0">
          {app.assignment_status
            ? <AsgnStatusBadge status={app.assignment_status} />
            : <AppStatusBadge status={app.status as ApplicationStatus} />}
        </div>
      </div>

      {/* Actions — stop propagation so clicking them doesn't re-open panel */}
      {(isPending || canNoShow) && (
        <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
          {isPending && <>
            <button onClick={onAccept} disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-text-inv text-xs font-bold uppercase tracking-wider rounded hover:brightness-110 active:scale-95 transition-all disabled:opacity-50">
              <CheckCircle size={11} /> Accept
            </button>
            <button onClick={onReject} disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 text-text-muted text-xs font-bold uppercase tracking-wider rounded hover:border-error hover:text-error active:scale-95 transition-all disabled:opacity-50">
              <XCircle size={11} /> Reject
            </button>
          </>}
          {canNoShow && (
            <button onClick={onNoShow} disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-error/30 text-error text-xs font-bold uppercase tracking-wider rounded hover:bg-error/10 active:scale-95 transition-all disabled:opacity-50">
              <AlertTriangle size={11} /> No-Show
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ApplicationsPage() {
  // Shared queue lets sidebar dots + bell badge refresh in lockstep with
  // this page's local state whenever an accept/reject/no-show fires.
  const { refresh: refreshGlobalQueue } = useHostQueue();
  const [gigs, setGigs]                   = useState<PostedGigSummary[]>([]);
  const [gigsLoading, setGigsLoading]     = useState(true);
  const [selectedGigId, setSelectedGigId] = useState<string | null>(null);
  const [applicants, setApplicants]       = useState<ApplicantListItem[]>([]);
  const [appsLoading, setAppsLoading]     = useState(false);
  const [sort, setSort]                   = useState<ApplicantSort>("momentum_desc");
  const [statusTab, setStatusTab]         = useState<ApplicantStatusFilter>("pending");
  const [showSortMenu, setShowSortMenu]   = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError]     = useState<string | null>(null);
  const [selected, setSelected]           = useState<ApplicantListItem | null>(null);

  useEffect(() => {
    listMyGigs().then((res) => {
      const items = (res.data?.items ?? []).sort((a, b) => b.pending_count - a.pending_count);
      setGigs(items);
      // Honour ?gig=<id> query param from events page deep-link
      const params = new URLSearchParams(window.location.search);
      const requestedId = params.get("gig");
      const requestedGig = requestedId ? items.find((g) => g.id === requestedId) : null;
      const firstPending = items.find((g) => g.pending_count > 0);
      setSelectedGigId(requestedGig?.id ?? firstPending?.id ?? items[0]?.id ?? null);
      setGigsLoading(false);
    });
  }, []);

  const loadApplicants = useCallback(async (gigId: string, s: ApplicantSort) => {
    setAppsLoading(true);
    setActionError(null);
    const res = await listApplicants(gigId, s, "all");
    setApplicants(res.data?.applicants ?? []);
    setAppsLoading(false);
  }, []);

  useEffect(() => {
    if (selectedGigId) loadApplicants(selectedGigId, sort);
  }, [selectedGigId, sort, loadApplicants]);

  const refresh = useCallback(async () => {
    const [gigsRes] = await Promise.all([listMyGigs()]);
    setGigs((gigsRes.data?.items ?? []).sort((a, b) => b.pending_count - a.pending_count));
    if (selectedGigId) {
      const appsRes = await listApplicants(selectedGigId, sort, "all");
      setApplicants(appsRes.data?.applicants ?? []);
    }
    // Also refresh the shared queue so sidebar dots + bell badge update
    // immediately for the accept/reject/no-show that just fired.
    refreshGlobalQueue();
  }, [selectedGigId, sort, refreshGlobalQueue]);

  // Re-fetch when the user switches back to this tab — catches external state
  // changes (e.g. a runner deleting their profile) without needing a full reload.
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [refresh]);

  const handleAccept = async (applicationId: string) => {
    setActionLoading(applicationId); setActionError(null);
    const res = await acceptApplicant(applicationId);
    if (res.error) { setActionLoading(null); setActionError(res.error); return; }
    await refresh(); setActionLoading(null); setSelected(null);
  };

  const handleReject = async (applicationId: string) => {
    setActionLoading(applicationId); setActionError(null);
    const res = await rejectApplicant(applicationId);
    if (res.error) { setActionLoading(null); setActionError(res.error); return; }
    await refresh(); setActionLoading(null); setSelected(null);
  };

  const handleNoShow = async (assignmentId: string) => {
    if (!confirm("Mark this runner as no-show? This will affect their Momentum score.")) return;
    setActionLoading(assignmentId); setActionError(null);
    const res = await markNoShow(assignmentId);
    if (res.error) { setActionLoading(null); setActionError(res.error); return; }
    await refresh(); setActionLoading(null); setSelected(null);
  };

  const chipsRef        = useRef<HTMLDivElement>(null);
  const [chipsOverflow, setChipsOverflow] = useState({ left: false, right: false });
  const dragState = useRef({ active: false, startX: 0, scrollLeft: 0 });

  const updateChipsOverflow = useCallback(() => {
    const el = chipsRef.current;
    if (!el) return;
    setChipsOverflow({
      left:  el.scrollLeft > 8,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 8,
    });
  }, []);

  useEffect(() => {
    updateChipsOverflow();
  }, [gigs, updateChipsOverflow]);

  const onChipsMouseDown = useCallback((e: React.MouseEvent) => {
    const el = chipsRef.current;
    if (!el) return;
    dragState.current = { active: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  }, []);

  const onChipsMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.current.active) return;
    const el = chipsRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    el.scrollLeft = dragState.current.scrollLeft - (x - dragState.current.startX);
    updateChipsOverflow();
  }, [updateChipsOverflow]);

  const onChipsDragEnd = useCallback(() => {
    dragState.current.active = false;
    const el = chipsRef.current;
    if (!el) return;
    el.style.cursor = "grab";
    el.style.userSelect = "";
  }, []);

  // Suppress click after a drag so selecting a chip doesn't fire mid-scroll
  const onChipsClick = useCallback((e: React.MouseEvent) => {
    const el = chipsRef.current;
    if (!el) return;
    const moved = Math.abs(el.scrollLeft - dragState.current.scrollLeft);
    if (moved > 4) e.stopPropagation();
  }, []);

  const panelColRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelColRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [selected?.application_id]);

  const selectedGig     = useMemo(() => gigs.find((g) => g.id === selectedGigId), [gigs, selectedGigId]);
  const totalPending    = useMemo(() => gigs.reduce((s, g) => s + g.pending_count, 0), [gigs]);
  const tabCounts       = useMemo(() => ({
    pending:  applicants.filter((a) => a.status === "pending").length,
    accepted: applicants.filter((a) => a.status === "accepted").length,
    all:      applicants.length,
  }), [applicants]);
  const visibleApplicants = useMemo(() => (
    statusTab === "all" ? applicants : applicants.filter((a) => a.status === statusTab)
  ), [applicants, statusTab]);
  const currentSortLabel  = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Sort";

  if (gigsLoading) return <PageLoader />;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Page header ────────────────────────────────────────────────────────── */}
      <div className="px-8 pt-7 pb-0 flex-shrink-0">
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="pg-eyebrow">Applications</p>
            <h1 className="pg-title">Applicants</h1>
            <p className="pg-sub">
              {totalPending > 0
                ? `${totalPending} pending across ${gigs.length} gig${gigs.length !== 1 ? "s" : ""}`
                : `${gigs.length} gig${gigs.length !== 1 ? "s" : ""} · all caught up`}
            </p>
          </div>
        </div>

        {/* ── Gig chips ────────────────────────────────────────────────────────── */}
        {gigs.length === 0 ? (
          <div className="pb-5">
            <p className="text-xs text-text-muted">No gigs posted yet.</p>
          </div>
        ) : (
          <div className="relative pb-5">
            {/* Left fade */}
            {chipsOverflow.left && (
              <div className="absolute left-0 top-0 bottom-5 w-16 z-10 pointer-events-none"
                style={{ background: "linear-gradient(to right, var(--content-bg) 0%, transparent 100%)" }} />
            )}
            {/* Right glow fade */}
            {chipsOverflow.right && (
              <div className="absolute right-0 top-0 bottom-5 w-20 z-10 pointer-events-none"
                style={{ background: "linear-gradient(to left, var(--content-bg) 20%, transparent 100%)" }}>
                <div className="absolute right-0 top-0 bottom-0 w-px"
                  style={{
                    background: "linear-gradient(to bottom, transparent, color-mix(in srgb, var(--lime) 50%, transparent) 40%, color-mix(in srgb, var(--lime) 50%, transparent) 60%, transparent)",
                    filter: "blur(3px)",
                  }} />
              </div>
            )}
            {/* -my-2 compensates for py-2 inside scroll container, which gives room for absolute badges */}
            <div className="-my-2"
            ><div
              ref={chipsRef}
              onScroll={updateChipsOverflow}
              onMouseDown={onChipsMouseDown}
              onMouseMove={onChipsMouseMove}
              onMouseUp={onChipsDragEnd}
              onMouseLeave={onChipsDragEnd}
              onClick={onChipsClick}
              className="flex gap-3 overflow-x-auto py-2 pr-2"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none", cursor: "grab" }}
            >
              {gigs.map((gig) => (
                <GigChip
                  key={gig.id}
                  gig={gig}
                  active={gig.id === selectedGigId}
                  onClick={() => { setSelectedGigId(gig.id); setStatusTab("pending"); }}
                />
              ))}
            </div></div>
          </div>
        )}
      </div>

      {/* ── Divider ──────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 h-px mx-8" style={{ backgroundColor: "var(--border-color)" }} />

      {/* ── Applicant section ────────────────────────────────────────────────── */}
      {!selectedGig ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <Users size={36} className="text-text-muted mb-4 opacity-30" />
          <p className="text-sm font-bold text-text-muted">Post a gig to start receiving applications</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Selected gig info + controls */}
          <div className="px-6 pt-5 pb-4 flex-shrink-0">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-text">{selectedGig.title}</h2>
                  {(() => {
                    const lbl = urgencyLabel(daysUntil(selectedGig.event_date));
                    return lbl ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                        style={{ background: "color-mix(in srgb, var(--color-amber) 12%, transparent)", color: "var(--color-amber)" }}>
                        {lbl}
                      </span>
                    ) : null;
                  })()}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-text-muted flex-wrap">
                  <span className="flex items-center gap-1"><MapPin size={10} />{selectedGig.city}</span>
                  <span className="opacity-40">·</span>
                  <span>{formatDate(selectedGig.event_date)}</span>
                  <span className="opacity-40">·</span>
                  <span>{selectedGig.slots_filled}/{selectedGig.slots_total} slots filled</span>
                  <span className="opacity-40">·</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${selectedGig.slots_total > 0 ? (selectedGig.slots_filled / selectedGig.slots_total) * 100 : 0}%`,
                        backgroundColor: selectedGig.slots_filled >= selectedGig.slots_total ? "var(--fill-complete)" : "var(--fill-partial)",
                      }} />
                    </div>
                    <span>{selectedGig.slots_total > 0 ? Math.round((selectedGig.slots_filled / selectedGig.slots_total) * 100) : 0}%</span>
                  </div>
                </div>
              </div>
              <Link
                href={`/gigs/${selectedGig.id}`}
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-primary transition-colors flex-shrink-0 mt-1"
              >
                View gig <ArrowRight size={10} />
              </Link>
            </div>

            {/* Status tabs + sort row */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex">
                {STATUS_TABS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setStatusTab(key)}
                    className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors rounded ${
                      statusTab === key ? "bg-primary/15 text-primary" : "text-text-muted hover:text-text"
                    }`}
                  >
                    {label}
                    <span className={`ml-1.5 text-[10px] ${statusTab === key ? "text-primary" : "text-text-muted/50"}`}>
                      {tabCounts[key]}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowSortMenu((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 rounded text-[11px] font-bold text-text-muted hover:text-text hover:border-white/20 transition-all"
                >
                  <SortAsc size={11} />{currentSortLabel}
                  <ChevronDown size={10} className={`transition-transform ${showSortMenu ? "rotate-180" : ""}`} />
                </button>
                {showSortMenu && (
                  <div
                    className="absolute right-0 top-full mt-1 bg-surface-2 border border-white/10 rounded-lg shadow-xl z-20 overflow-hidden min-w-[150px]"
                    onMouseLeave={() => setShowSortMenu(false)}
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <button key={opt.value}
                        onClick={() => { setSort(opt.value); setShowSortMenu(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors ${
                          sort === opt.value ? "text-primary bg-primary/10" : "text-text-sub hover:text-text hover:bg-white/5"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Two-column grid: ~1/3 list · ~2/3 profile */}
          <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: "1fr 2fr" }}>

            {/* Left — applicant list */}
            <div
              className="overflow-y-auto px-6 pt-4 pb-8 border-r"
              style={{ borderColor: "var(--border-color)" }}
            >
              {appsLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              ) : visibleApplicants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Users size={28} className="text-text-muted mb-3 opacity-30" />
                  <p className="text-sm font-bold text-text-muted">
                    {statusTab === "pending" ? "No pending applications" : "No applicants yet"}
                  </p>
                  {statusTab === "pending" && (
                    <p className="text-xs text-text-muted mt-1 opacity-60">You&apos;re all caught up</p>
                  )}
                </div>
              ) : (
                <>
                  {actionError && (
                    <div className="mb-4 px-4 py-2.5 bg-error/10 border border-error/30 rounded-lg">
                      <p className="text-xs text-error font-semibold">{actionError}</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    {visibleApplicants.map((app) => {
                      const isActing = actionLoading !== null &&
                        (actionLoading === app.application_id || actionLoading === app.assignment_id);
                      return (
                        <ApplicantCard
                          key={app.application_id}
                          app={app}
                          gigCity={selectedGig.city}
                          selected={selected?.application_id === app.application_id}
                          actionLoading={isActing}
                          onView={() => setSelected(
                            selected?.application_id === app.application_id ? null : app
                          )}
                          onAccept={() => handleAccept(app.application_id)}
                          onReject={() => handleReject(app.application_id)}
                          onNoShow={() => app.assignment_id && handleNoShow(app.assignment_id)}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Right — profile panel (always mounted, shows empty state when nothing selected) */}
            <div ref={panelColRef} className="overflow-y-auto px-6 py-6">
              {selected ? (
                <ApplicantProfileModal
                  asPanel
                  app={selected}
                  gigId={selectedGig.id}
                  actionLoading={
                    actionLoading !== null &&
                    (actionLoading === selected.application_id || actionLoading === selected.assignment_id)
                  }
                  actionError={actionError}
                  onClose={() => { setSelected(null); setActionError(null); }}
                  onAccept={selected.status === "pending" ? () => handleAccept(selected.application_id) : undefined}
                  onReject={selected.status === "pending" ? () => handleReject(selected.application_id) : undefined}
                  onNoShow={
                    selected.status === "accepted" &&
                    selected.assignment_status === "assigned" &&
                    selected.assignment_id
                      ? () => handleNoShow(selected.assignment_id!)
                      : undefined
                  }
                  onRated={refresh}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center px-12 gap-3">
                  <div className="w-14 h-14 rounded-full bg-surface-2 border border-white/10 flex items-center justify-center mb-1">
                    <Users size={22} className="text-text-muted opacity-40" />
                  </div>
                  <p className="text-sm font-bold text-text-muted">No applicant selected</p>
                  <p className="text-xs text-text-muted opacity-50">Click any application on the left to view the full profile here</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
