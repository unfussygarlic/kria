"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, MapPin, Calendar, Clock, Users, Key,
  CheckCircle, XCircle, AlertTriangle, Pause, Play,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { listApplicants, acceptApplicant, rejectApplicant, markNoShow } from "@/lib/api/applicants";
import { pauseGig, unpauseGig } from "@/lib/api/gigs";
import { GigStatusBadge, AppStatusBadge, AsgnStatusBadge, PausedBadge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/Spinner";
import { MomentumChip } from "@/components/ui/MomentumChip";
import { ApplicantProfileModal } from "@/components/applicants/ApplicantProfileModal";
import type { Gig, ApplicantListItem } from "@/types";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
function formatTime(t: string) { return t.slice(0, 5); }
function formatPay(amount: number, type: string) {
  const f = `₹${amount.toLocaleString("en-IN")}`;
  return type === "hourly" ? `${f}/hr` : type === "per_day" ? `${f}/day` : f;
}


export default function GigDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [gig, setGig] = useState<Gig | null>(null);
  const [applicants, setApplicants] = useState<ApplicantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pauseLoading, setPauseLoading] = useState(false);

  const handleTogglePause = async () => {
    if (!gig) return;
    setPauseLoading(true);
    const fn = gig.is_paused ? unpauseGig : pauseGig;
    const res = await fn(gig.id);
    if (res.data) setGig((prev) => prev ? { ...prev, is_paused: res.data!.is_paused } : prev);
    setPauseLoading(false);
  };
  const [activeTab, setActiveTab] = useState<"pending" | "accepted" | "all">("pending");
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantListItem | null>(null);

  useEffect(() => {
    const load = async () => {
      const [gigRes, applicantsRes] = await Promise.all([
        supabase.from("gigs").select("*").eq("id", id).single(),
        listApplicants(id),
      ]);
      setGig(gigRes.data as Gig);
      setApplicants(applicantsRes.data?.applicants ?? []);
      setLoading(false);
    };
    load();
  }, [id]);

  const refreshApplicants = async () => {
    const res = await listApplicants(id);
    setApplicants(res.data?.applicants ?? []);
  };

  const handleAccept = async (applicationId: string) => {
    setActionLoading(applicationId);
    setActionError(null);
    const res = await acceptApplicant(applicationId);
    if (res.error) { setActionLoading(null); setActionError(res.error); return; }
    await refreshApplicants();
    setActionLoading(null);
    setSelectedApplicant(null);
  };

  const handleReject = async (applicationId: string) => {
    setActionLoading(applicationId);
    setActionError(null);
    const res = await rejectApplicant(applicationId);
    if (res.error) { setActionLoading(null); setActionError(res.error); return; }
    await refreshApplicants();
    setActionLoading(null);
    setSelectedApplicant(null);
  };

  const handleNoShow = async (assignmentId: string) => {
    if (!confirm("Mark this runner as no-show? This will affect their momentum score.")) return;
    setActionLoading(assignmentId);
    setActionError(null);
    const res = await markNoShow(assignmentId);
    if (res.error) { setActionLoading(null); setActionError(res.error); return; }
    await refreshApplicants();
    setActionLoading(null);
    setSelectedApplicant(null);
  };

  if (loading || !gig) return <PageLoader />;

  const pending  = applicants.filter((a) => a.status === "pending");
  const accepted = applicants.filter((a) => a.status === "accepted");
  const displayed = activeTab === "pending" ? pending : activeTab === "accepted" ? accepted : applicants;
  const otp = accepted.find((a) => a.assignment_otp)?.assignment_otp ?? null;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-text-muted hover:text-text text-xs font-bold uppercase tracking-wider mb-8 transition-colors"
      >
        <ArrowLeft size={15} /> Back to Gigs
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="pg-title">{gig.title}</h1>
            <GigStatusBadge status={gig.status} />
            {gig.is_paused && <PausedBadge />}
          </div>
          {gig.company_name && <p className="text-sm text-text-muted">{gig.company_name}</p>}
        </div>
        <div className="flex items-start gap-3">
          {(gig.status === "open" || gig.status === "in_progress") && (
            <button
              onClick={handleTogglePause}
              disabled={pauseLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${
                gig.is_paused
                  ? "border-primary/40 text-primary hover:bg-primary/10"
                  : "border-amber/30 text-amber hover:bg-amber/10"
              }`}
            >
              {gig.is_paused ? <><Play size={12} /> Resume</> : <><Pause size={12} /> Pause</>}
            </button>
          )}
          <div className="text-right">
          <p className="text-xs text-text-muted uppercase tracking-wider font-bold">Slots</p>
          <p className="text-2xl font-bold text-text">{gig.slots_filled}/{gig.slots_total}</p>
          <div className="w-full h-1 bg-surface-3 rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: gig.slots_total ? `${(gig.slots_filled / gig.slots_total) * 100}%` : "0%" }}
            />
          </div>
        </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: gig info */}
        <div className="lg:col-span-5 space-y-4">

          {/* Details card */}
          <div className="bg-surface-1 border border-white/10 rounded-xl p-6 space-y-4">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Gig Details</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <MapPin size={14} className="text-primary mt-0.5 flex-shrink-0" />
                <span className="text-text-sub">{gig.venue_name}, {gig.city}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar size={14} className="text-primary flex-shrink-0" />
                <span className="text-text-sub">{formatDate(gig.event_date)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock size={14} className="text-primary flex-shrink-0" />
                <span className="text-text-sub">{formatTime(gig.shift_start_time)} – {formatTime(gig.shift_end_time)}</span>
              </div>
              {gig.report_time && (
                <p className="text-xs text-text-muted pl-[26px]">Report by {formatTime(gig.report_time)}</p>
              )}
            </div>
            <div className="pt-4 border-t border-white/10 flex justify-between items-center">
              <span className="text-xs text-text-muted uppercase tracking-wider font-bold">Pay</span>
              <span className="text-lg font-bold text-text">{formatPay(gig.pay_amount, gig.pay_type)}</span>
            </div>
          </div>

          {/* OTP card — prominent, always shown */}
          <div className={`rounded-xl p-6 flex items-center justify-between ${
            otp
              ? "bg-surface-2 border-2 border-primary/50 shadow-[0_0_24px_rgba(212,255,0,0.08)]"
              : "bg-surface-1 border border-white/10"
          }`}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Key size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Check-in OTP</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {otp ? "Share at venue on the day" : "Shown once a runner is accepted"}
                </p>
              </div>
            </div>
            <div className={`text-5xl font-black tracking-[0.15em] ${otp ? "text-text" : "text-text-muted"}`}>
              {otp ?? "——"}
            </div>
          </div>

          {/* Requirements */}
          {(gig.dress_code || gig.requirements_note || gig.experience_required || (gig.languages_required?.length > 0)) && (
            <div className="bg-surface-1 border border-white/10 rounded-xl p-6 space-y-3">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Requirements</h2>
              {gig.gender_preference && gig.gender_preference !== "any" && (
                <p className="text-sm text-text-sub capitalize">Gender: {gig.gender_preference}</p>
              )}
              {gig.dress_code && (
                <p className="text-sm text-text-sub"><span className="text-text-muted">Dress: </span>{gig.dress_code}</p>
              )}
              {gig.experience_required && (
                <p className="text-xs font-bold text-primary uppercase tracking-wide">Prior experience required</p>
              )}
              {gig.languages_required?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {gig.languages_required.map((l) => (
                    <span key={l} className="bg-surface-4 text-text-sub text-xs px-2 py-0.5 rounded">{l}</span>
                  ))}
                </div>
              )}
              {gig.requirements_note && (
                <p className="text-xs text-text-sub">{gig.requirements_note}</p>
              )}
            </div>
          )}
        </div>

        {/* Right column: applicants */}
        <div className="lg:col-span-7">
          <div className="bg-surface-1 border border-white/10 rounded-xl overflow-hidden flex flex-col">
            {/* Tab header */}
            <div className="flex border-b border-white/10">
              {(["pending", "accepted", "all"] as const).map((tab) => {
                const count = tab === "pending" ? pending.length : tab === "accepted" ? accepted.length : applicants.length;
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-colors ${
                      isActive
                        ? "text-primary border-b-2 border-primary"
                        : "text-text-muted hover:text-text"
                    }`}
                  >
                    {tab} ({count})
                  </button>
                );
              })}
            </div>

            {/* List */}
            <div className="p-4 space-y-3 overflow-y-auto max-h-[560px]">
              {displayed.length === 0 ? (
                <div className="py-12 text-center">
                  <Users size={28} className="text-text-muted mx-auto mb-3" />
                  <p className="text-sm text-text-muted">
                    {activeTab === "pending" ? "No pending applicants yet." : "None in this category."}
                  </p>
                </div>
              ) : (
                displayed.map((app) => {
                  const name = app.applicant.first_name
                    ? `${app.applicant.first_name}${app.applicant.last_name ? " " + app.applicant.last_name : ""}`
                    : app.applicant.display_name;
                  const initials = name[0].toUpperCase();
                  const isActing = actionLoading !== null && (actionLoading === app.application_id || actionLoading === app.assignment_id);

                  return (
                    <div
                      key={app.application_id}
                      onClick={() => setSelectedApplicant(app)}
                      className="bg-surface-2 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Avatar + info */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-surface-4 border border-white/5 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-text">{initials}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-text">{name}</p>
                              {app.applicant.id_verified && (
                                <span className="text-[10px] text-primary font-bold">✓ ID</span>
                              )}
                            </div>
                            <p className="text-xs text-text-muted">{app.applicant.city ?? "—"} · {app.applicant.total_gigs_completed} gigs done</p>
                            <div className="mt-1.5">
                              <MomentumChip score={app.momentum_score ?? null} />
                            </div>
                          </div>
                        </div>

                        {/* Status badge */}
                        <div className="flex-shrink-0">
                          {app.assignment_status
                            ? <AsgnStatusBadge status={app.assignment_status} />
                            : <AppStatusBadge status={app.status} />
                          }
                        </div>
                      </div>

                      {app.message && (
                        <p className="mt-3 text-xs text-text-sub bg-surface-3 rounded-lg px-3 py-2 italic">
                          &ldquo;{app.message}&rdquo;
                        </p>
                      )}

                      {/* Quick actions — stop propagation so card click doesn't open modal */}
                      {app.status === "pending" && (
                        <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleAccept(app.application_id)}
                            disabled={isActing}
                            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-text-inv text-xs font-bold uppercase tracking-wider rounded hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                          >
                            <CheckCircle size={12} /> Accept
                          </button>
                          <button
                            onClick={() => handleReject(app.application_id)}
                            disabled={isActing}
                            className="flex items-center gap-1.5 px-4 py-2 border border-white/10 text-text-muted text-xs font-bold uppercase tracking-wider rounded hover:border-error hover:text-error active:scale-95 transition-all disabled:opacity-50"
                          >
                            <XCircle size={12} /> Reject
                          </button>
                        </div>
                      )}

                      {app.status === "accepted" && app.assignment_status === "assigned" && app.assignment_id && (
                        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleNoShow(app.assignment_id!)}
                            disabled={isActing}
                            className="flex items-center gap-1.5 px-4 py-2 border border-error/30 text-error text-xs font-bold uppercase tracking-wider rounded hover:bg-error/10 active:scale-95 transition-all disabled:opacity-50"
                          >
                            <AlertTriangle size={12} /> Mark No-Show
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Bulk action footer */}
            {pending.length > 1 && activeTab === "pending" && (
              <div className="px-4 py-3 border-t border-white/10 bg-surface-2 flex items-center justify-between">
                <p className="text-xs text-text-muted">{pending.length} pending applications</p>
                <button className="text-xs font-bold uppercase tracking-wider text-secondary hover:text-text transition-colors">
                  Review All
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Applicant profile modal */}
      {selectedApplicant && (
        <ApplicantProfileModal
          app={selectedApplicant}
          gigId={id}
          actionLoading={actionLoading !== null && (actionLoading === selectedApplicant.application_id || actionLoading === selectedApplicant.assignment_id)}
          actionError={actionError}
          onClose={() => { setSelectedApplicant(null); setActionError(null); }}
          onAccept={selectedApplicant.status === "pending" ? () => handleAccept(selectedApplicant.application_id) : undefined}
          onReject={selectedApplicant.status === "pending" ? () => handleReject(selectedApplicant.application_id) : undefined}
          onNoShow={
            selectedApplicant.status === "accepted" &&
            selectedApplicant.assignment_status === "assigned" &&
            selectedApplicant.assignment_id
              ? () => handleNoShow(selectedApplicant.assignment_id!)
              : undefined
          }
          onRated={refreshApplicants}
        />
      )}
    </div>
  );
}
