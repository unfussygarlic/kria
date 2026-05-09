"use client";

import { useEffect, useState } from "react";
import {
  X, ShieldCheck, CheckCircle, XCircle, AlertTriangle, MapPin, Briefcase, Star,
} from "lucide-react";
import { AppStatusBadge, AsgnStatusBadge } from "@/components/ui/Badge";
import { SkillGraph } from "@/components/ui/SkillGraph";
import { getBand } from "@/components/ui/MomentumChip";
import { fetchUserBreakdown } from "@/lib/api/momentum";
import { fetchRatingDimensions, submitRating } from "@/lib/api/ratings";
import type { RatingDimension } from "@/lib/api/ratings";
import type { ApplicantListItem, BreakdownItem, ProfileSignalItem } from "@/types";

interface Props {
  app: ApplicantListItem;
  gigId: string;
  actionLoading: boolean;
  actionError?: string | null;
  onClose: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onNoShow?: () => void;
  onRated?: () => void;
  asPanel?: boolean;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">{children}</p>
  );
}

function TagList({ items, accent }: { items: string[]; accent?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className={`text-xs px-2.5 py-1 rounded-full capitalize ${
          accent ? "bg-primary/10 text-primary" : "bg-surface-3 text-text-sub"
        }`}>
          {item}
        </span>
      ))}
    </div>
  );
}

const STAR_LABELS = ["Poor", "Fair", "Good", "Great", "Excellent"];

export function ApplicantProfileModal({
  app, gigId, actionLoading, actionError, onClose, onAccept, onReject, onNoShow, onRated, asPanel = false,
}: Props) {
  const { applicant } = app;
  const [signals, setSignals]             = useState<BreakdownItem[]>([]);
  const [profileSignals, setProfileSignals] = useState<ProfileSignalItem[]>([]);
  const [profilePoints, setProfilePoints] = useState(0);
  const [breakdownLoading, setBreakdownLoading] = useState(true);
  // Dimension-based rating state
  const [dimensions, setDimensions]       = useState<RatingDimension[]>([]);
  const [dimScores, setDimScores]         = useState<Record<string, number>>({});
  const [dimHover, setDimHover]           = useState<Record<string, number>>({});
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingError, setRatingError]     = useState<string | null>(null);
  const [rated, setRated]                 = useState(app.has_been_rated);

  const name = applicant.first_name
    ? `${applicant.first_name}${applicant.last_name ? " " + applicant.last_name : ""}`
    : applicant.display_name;
  const initials  = (name[0] ?? "?").toUpperCase();
  const isPending = app.status === "pending";
  const canNoShow = app.status === "accepted" && app.assignment_status === "assigned" && !!app.assignment_id;
  const canRate   = app.assignment_status === "completed" && !rated;
  const allDimsScored = dimensions.length > 0 && dimensions.every((d) => (dimScores[d.key] ?? 0) > 0);
  const appliedAt = new Date(app.applied_at).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

  const handleRate = async () => {
    if (!allDimsScored) return;
    setRatingSubmitting(true);
    setRatingError(null);
    const payload: Record<string, unknown> = {
      gig_id: gigId,
      ratee_id: applicant.id,
      rating_type: "worker_rating",
      comment: ratingComment.trim() || undefined,
    };
    for (const dim of dimensions) {
      payload[dim.key] = dimScores[dim.key];
    }
    const res = await submitRating(payload as Parameters<typeof submitRating>[0]);
    setRatingSubmitting(false);
    if (res.error) {
      setRatingError(res.error);
    } else {
      setRated(true);
      onRated?.();
    }
  };

  useEffect(() => {
    fetchUserBreakdown(applicant.id).then((res) => {
      if (res.data) {
        setSignals(res.data.signals);
        setProfileSignals(res.data.profile_signals ?? []);
        setProfilePoints(res.data.score.profile_points ?? 0);
      }
      setBreakdownLoading(false);
    });
    if (!rated) {
      fetchRatingDimensions().then((res) => {
        if (res.data) setDimensions(res.data.dimensions);
      });
    }
  }, [applicant.id, rated]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (asPanel) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [asPanel]);

  const hasWorkExp  = applicant.work_experience?.length > 0;
  const hasEdu      = applicant.education_entries?.length > 0;
  const hasProfile  = applicant.bio || hasWorkExp || hasEdu
    || applicant.languages?.length > 0 || applicant.skills?.length > 0;

  const band = getBand(app.momentum_score ?? null);

  // ── Shared header ───────────────────────────────────────────────────────────
  const header = (
    <div className="p-5 border-b border-white/10 flex-shrink-0">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-base font-black text-text-inv">{initials}</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-base font-bold text-text leading-tight">{name}</p>
              {applicant.id_verified && <ShieldCheck size={14} className="text-primary flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-text-muted flex-wrap">
              {applicant.city && <><MapPin size={10} /><span>{applicant.city}</span><span>·</span></>}
              <Briefcase size={10} />
              <span>{applicant.total_gigs_completed} gigs done</span>
              <span>·</span>
              <span>Applied {appliedAt}</span>
            </div>
            <div className="mt-1.5">
              {app.assignment_status
                ? <AsgnStatusBadge status={app.assignment_status} />
                : <AppStatusBadge status={app.status} />}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text transition-colors p-1 flex-shrink-0">
          <X size={18} />
        </button>
      </div>
    </div>
  );

  // ── Error bar ───────────────────────────────────────────────────────────────
  const errorBar = actionError ? (
    <div className="mx-4 mb-0 px-4 py-2.5 bg-error/10 border border-error/30 rounded-lg flex-shrink-0">
      <p className="text-xs text-error font-semibold">{actionError}</p>
    </div>
  ) : null;

  // ── Rate Runner section — dynamic dimensions from config ───────────────────
  const rateSection = canRate ? (
    <div className="px-5 pb-5 border-t border-white/10 pt-5 space-y-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
        Rate Runner Performance
      </p>

      {dimensions.map((dim) => {
        const score = dimScores[dim.key] ?? 0;
        const hover = dimHover[dim.key] ?? 0;
        const active = hover || score;
        return (
          <div key={dim.key}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-text">{dim.label}</p>
              {active > 0 && (
                <span className="text-[10px] font-semibold text-primary">{STAR_LABELS[active - 1]}</span>
              )}
            </div>
            <p className="text-[11px] text-text-muted mb-1.5">{dim.question}</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setDimHover((h) => ({ ...h, [dim.key]: star }))}
                  onMouseLeave={() => setDimHover((h) => ({ ...h, [dim.key]: 0 }))}
                  onClick={() => setDimScores((s) => ({ ...s, [dim.key]: star }))}
                  className="p-0.5 transition-transform hover:scale-110"
                  disabled={ratingSubmitting}
                >
                  <Star
                    size={20}
                    fill={active >= star ? "var(--star-filled)" : "none"}
                    stroke={active >= star ? "var(--star-filled)" : "var(--star-empty-stroke)"}
                  />
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <textarea
        className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-xs text-text placeholder:text-text-muted resize-none focus:outline-none focus:border-primary/40 transition-colors"
        placeholder="Optional comment…"
        rows={2}
        maxLength={300}
        value={ratingComment}
        onChange={(e) => setRatingComment(e.target.value)}
        disabled={ratingSubmitting}
      />
      {ratingError && (
        <p className="text-xs text-error">{ratingError}</p>
      )}
      <button
        onClick={handleRate}
        disabled={!allDimsScored || ratingSubmitting}
        className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-text-inv text-xs font-black uppercase tracking-widest rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
      >
        <Star size={12} />
        {ratingSubmitting ? "Submitting…" : "Submit Rating"}
      </button>
    </div>
  ) : rated && app.assignment_status === "completed" ? (
    <div className="px-5 pb-4 pt-4 border-t border-white/10 flex items-center gap-2">
      <CheckCircle size={13} className="text-primary" />
      <p className="text-xs font-semibold text-primary">Runner rated</p>
    </div>
  ) : null;

  // ── Panel layout — same card as the modal, no overlay ──────────────────────
  if (asPanel) {
    return (
      <div className="bg-surface-1 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {header}

        {/* Momentum: graph left · signals right */}
        <div className="border-b border-white/10 px-5 py-4" style={{ backgroundColor: "var(--card-bg)" }}>
          {breakdownLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="flex gap-5 items-center">
              {/* Graph */}
              <div className="flex-shrink-0" style={{ filter: "drop-shadow(0 0 16px rgba(0,0,0,0.5))" }}>
                <SkillGraph score={app.momentum_score ?? 0} signals={signals} size={160} />
              </div>

              {/* Signals + profile completion */}
              <div className="flex-1 min-w-0 space-y-2.5">
                {signals.map((signal) => (
                  <div key={signal.key} className="flex items-center gap-2">
                    <span className="text-[11px] text-text-sub w-24 flex-shrink-0 truncate">{signal.label}</span>
                    {signal.has_data ? (
                      <>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--sg-grid)" }}>
                          <div className="h-full rounded-full transition-all duration-500" style={{
                            width: `${Math.round(signal.bar_value * 100)}%`,
                            backgroundColor: band.color,
                            boxShadow: `0 0 5px ${band.color}70`,
                          }} />
                        </div>
                        <span className="text-[11px] font-semibold w-8 text-right flex-shrink-0" style={{ color: band.color }}>
                          {Math.round(signal.bar_value * 100)}%
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: "var(--sg-grid)" }} />
                        <span className="text-[10px] text-text-muted w-8 text-right flex-shrink-0 italic">—</span>
                      </>
                    )}
                  </div>
                ))}
                {profileSignals.length > 0 && (
                  <div className="border-t border-white/5 pt-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Profile</p>
                      <span className="text-[10px] text-text-muted">+{profilePoints} pts</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {profileSignals.map((ps) => (
                        <span key={ps.key} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          ps.earned ? "bg-primary/15 text-primary" : "bg-surface-3 text-text-muted line-through opacity-40"
                        }`}>{ps.label}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Body — no overflow-y-auto; outer column scrolls */}
        <div className="p-5 space-y-5">
          {app.message && (
            <div>
              <SectionLabel>Application Message</SectionLabel>
              <p className="text-sm text-text-sub bg-surface-2 rounded-xl px-4 py-3 italic leading-relaxed">
                &ldquo;{app.message}&rdquo;
              </p>
            </div>
          )}
          {applicant.bio && (
            <div>
              <SectionLabel>About</SectionLabel>
              <p className="text-sm text-text-sub leading-relaxed">{applicant.bio}</p>
            </div>
          )}
          {hasWorkExp && (
            <div>
              <SectionLabel>Work Experience</SectionLabel>
              <div className="space-y-2.5">
                {applicant.work_experience.map((w, i) => (
                  <div key={i} className="bg-surface-2 rounded-lg px-3.5 py-2.5">
                    <p className="text-sm font-semibold text-text">{w.role}</p>
                    <p className="text-xs text-text-muted mt-0.5">{w.company}<span className="mx-1.5">·</span>{w.from_year}–{w.to_year ?? "Present"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {hasEdu && (
            <div>
              <SectionLabel>Education</SectionLabel>
              <div className="space-y-2.5">
                {applicant.education_entries.map((e, i) => (
                  <div key={i} className="bg-surface-2 rounded-lg px-3.5 py-2.5">
                    <p className="text-sm font-semibold text-text">{e.degree} in {e.field}</p>
                    <p className="text-xs text-text-muted mt-0.5">{e.college}<span className="mx-1.5">·</span>{e.passing_year}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {applicant.languages?.length > 0 && (
            <div>
              <SectionLabel>Languages</SectionLabel>
              <TagList items={applicant.languages} />
            </div>
          )}
          {applicant.skills?.length > 0 && (
            <div>
              <SectionLabel>Skills</SectionLabel>
              <TagList items={applicant.skills} accent />
            </div>
          )}
          {!hasProfile && !app.message && (
            <p className="text-sm text-text-muted text-center py-4">No additional information provided.</p>
          )}
        </div>

        {errorBar}
        {rateSection}

        {/* Footer — natural-width buttons */}
        {(isPending || canNoShow) && (
          <div className="px-5 pb-5 flex gap-2">
            {isPending && onAccept && (
              <button onClick={onAccept} disabled={actionLoading}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-text-inv text-xs font-black uppercase tracking-widest rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50">
                <CheckCircle size={13} /> Accept
              </button>
            )}
            {isPending && onReject && (
              <button onClick={onReject} disabled={actionLoading}
                className="flex items-center gap-1.5 px-5 py-2.5 border border-error/40 text-error text-xs font-black uppercase tracking-widest rounded-lg hover:bg-error/10 active:scale-95 transition-all disabled:opacity-50">
                <XCircle size={13} /> Reject
              </button>
            )}
            {canNoShow && onNoShow && (
              <button onClick={onNoShow} disabled={actionLoading}
                className="flex items-center gap-1.5 px-5 py-2.5 border border-error/40 text-error text-xs font-black uppercase tracking-widest rounded-lg hover:bg-error/10 active:scale-95 transition-all disabled:opacity-50">
                <AlertTriangle size={13} /> No-Show
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Modal layout (unchanged) ────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <div
        className="bg-surface-1 border border-white/10 rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {header}

        {/* Stacked graph + signals (modal — original layout) */}
        <div className="flex-shrink-0 border-b border-white/10" style={{ backgroundColor: "var(--card-bg)" }}>
          <div className="flex justify-center pt-6 pb-4">
            {breakdownLoading ? (
              <div className="w-[260px] h-[260px] flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : (
              <div className="rounded-full" style={{ filter: "drop-shadow(0 0 20px rgba(0,0,0,0.5))" }}>
                <SkillGraph score={app.momentum_score ?? 0} signals={signals} size={260} />
              </div>
            )}
          </div>
          {!breakdownLoading && signals.length > 0 && (
            <div className="px-5 pb-4 space-y-2">
              {signals.map((signal) => (
                <div key={signal.key} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-text-sub w-32 flex-shrink-0 truncate">{signal.label}</span>
                  {signal.has_data ? (
                    <>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--sg-grid)" }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{
                          width: `${Math.round(signal.bar_value * 100)}%`,
                          backgroundColor: band.color,
                          boxShadow: `0 0 6px ${band.color}80`,
                        }} />
                      </div>
                      <span className="text-xs font-semibold w-9 text-right flex-shrink-0" style={{ color: band.color }}>
                        {Math.round(signal.bar_value * 100)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: "var(--sg-grid)" }} />
                      <span className="text-[10px] text-text-muted w-9 text-right flex-shrink-0 italic">—</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          {!breakdownLoading && profileSignals.length > 0 && (
            <div className="px-5 pb-5 border-t border-white/5 pt-4">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Profile Completion</p>
                <span className="text-[10px] font-semibold text-text-muted">+{profilePoints} pts</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profileSignals.map((ps) => (
                  <span key={ps.key} className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                    ps.earned ? "bg-primary/15 text-primary" : "bg-surface-3 text-text-muted line-through opacity-50"
                  }`}>
                    {ps.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {app.message && (
            <div>
              <SectionLabel>Application Message</SectionLabel>
              <p className="text-sm text-text-sub bg-surface-2 rounded-xl px-4 py-3 italic leading-relaxed">&ldquo;{app.message}&rdquo;</p>
            </div>
          )}
          {applicant.bio && (
            <div>
              <SectionLabel>About</SectionLabel>
              <p className="text-sm text-text-sub leading-relaxed">{applicant.bio}</p>
            </div>
          )}
          {hasWorkExp && (
            <div>
              <SectionLabel>Work Experience</SectionLabel>
              <div className="space-y-2.5">
                {applicant.work_experience.map((w, i) => (
                  <div key={i} className="bg-surface-2 rounded-lg px-3.5 py-2.5">
                    <p className="text-sm font-semibold text-text">{w.role}</p>
                    <p className="text-xs text-text-muted mt-0.5">{w.company}<span className="mx-1.5">·</span>{w.from_year}–{w.to_year ?? "Present"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {hasEdu && (
            <div>
              <SectionLabel>Education</SectionLabel>
              <div className="space-y-2.5">
                {applicant.education_entries.map((e, i) => (
                  <div key={i} className="bg-surface-2 rounded-lg px-3.5 py-2.5">
                    <p className="text-sm font-semibold text-text">{e.degree} in {e.field}</p>
                    <p className="text-xs text-text-muted mt-0.5">{e.college}<span className="mx-1.5">·</span>{e.passing_year}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {applicant.languages?.length > 0 && (
            <div><SectionLabel>Languages</SectionLabel><TagList items={applicant.languages} /></div>
          )}
          {applicant.skills?.length > 0 && (
            <div><SectionLabel>Skills</SectionLabel><TagList items={applicant.skills} accent /></div>
          )}
          {!hasProfile && !app.message && (
            <p className="text-sm text-text-muted text-center py-4">No additional information provided.</p>
          )}
        </div>

        {errorBar}
        {rateSection}

        {(isPending || canNoShow) && (
          <div className="p-4 border-t border-white/10 flex gap-2 flex-shrink-0">
            {isPending && onAccept && (
              <button onClick={onAccept} disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-primary text-text-inv text-xs font-black uppercase tracking-widest rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50">
                <CheckCircle size={13} /> Accept
              </button>
            )}
            {isPending && onReject && (
              <button onClick={onReject} disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 border border-error/40 text-error text-xs font-black uppercase tracking-widest rounded-lg hover:bg-error/10 active:scale-95 transition-all disabled:opacity-50">
                <XCircle size={13} /> Reject
              </button>
            )}
            {canNoShow && onNoShow && (
              <button onClick={onNoShow} disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 border border-error/40 text-error text-xs font-black uppercase tracking-widest rounded-lg hover:bg-error/10 active:scale-95 transition-all disabled:opacity-50">
                <AlertTriangle size={13} /> No-Show
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
