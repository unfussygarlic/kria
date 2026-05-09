"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Calendar, ChevronRight, Users, Briefcase, TrendingUp } from "lucide-react";
import { getEvent } from "@/lib/api/events";
import { PageLoader } from "@/components/ui/Spinner";
import { GigStatusBadge } from "@/components/ui/Badge";
import type { EventResponse, EventJobSummary } from "@/types";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
function formatTime(t: string) { return t.slice(0, 5); }
function formatPay(amount: number, type: string) {
  const f = `₹${amount.toLocaleString("en-IN")}`;
  return type === "hourly" ? `${f}/hr` : type === "per_day" ? `${f}/day` : f;
}

function JobCard({ job, onClick }: { job: EventJobSummary; onClick: () => void }) {
  const spotsLeft = job.slots_total - job.slots_filled;
  const fillPct = job.slots_total > 0 ? (job.slots_filled / job.slots_total) * 100 : 0;
  return (
    <div
      onClick={onClick}
      className="bg-surface-2 border border-white/10 rounded-xl p-4 cursor-pointer hover:border-white/20 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <p className="text-sm font-bold text-text group-hover:text-primary transition-colors">{job.title}</p>
            <GigStatusBadge status={job.status} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
            {job.category.replace(/_/g, " ")}
          </p>
        </div>
        <ChevronRight size={16} className="text-text-muted group-hover:text-primary transition-colors flex-shrink-0" />
      </div>

      <div className="flex items-center gap-3 text-xs text-text-sub mb-3 flex-wrap">
        <span>{formatTime(job.shift_start_time)} – {formatTime(job.shift_end_time)}</span>
        <span className="text-text-muted">·</span>
        <span className="font-semibold text-text">{formatPay(job.pay_amount, job.pay_type)}</span>
        {job.application_count > 0 && (
          <>
            <span className="text-text-muted">·</span>
            <span className="text-primary font-semibold">{job.application_count} applicant{job.application_count !== 1 ? "s" : ""}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${fillPct}%` }} />
        </div>
        <span className={`text-xs font-semibold ${spotsLeft === 0 ? "text-primary" : "text-text-muted"}`}>
          {spotsLeft === 0 ? "Full" : `${spotsLeft} open`}
        </span>
      </div>
    </div>
  );
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEvent(id).then((res) => {
      setEvent(res.data);
      setLoading(false);
    });
  }, [id]);

  if (loading || !event) return <PageLoader />;

  const totalSlots = event.jobs.reduce((s, j) => s + j.slots_total, 0);
  const filledSlots = event.jobs.reduce((s, j) => s + j.slots_filled, 0);
  const pendingApplicants = event.jobs.reduce((s, j) => s + j.application_count, 0);
  const fillPct = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-text-muted hover:text-text text-xs font-bold uppercase tracking-wider mb-8 transition-colors"
      >
        <ArrowLeft size={15} /> Back to Events
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text tracking-tight mb-3">{event.title}</h1>
          <div className="flex items-center gap-4 text-sm text-text-sub flex-wrap">
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="text-secondary flex-shrink-0" />
              {event.venue_name}, {event.city}
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-secondary flex-shrink-0" />
              {formatDate(event.event_date)}
              {event.is_multi_day && event.event_end_date && ` – ${formatDate(event.event_end_date)}`}
            </div>
          </div>
          {event.description && (
            <p className="text-sm text-text-muted mt-3 max-w-xl">{event.description}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-1 border border-white/10 rounded-xl p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Roles</span>
            <Briefcase size={16} className="text-secondary" />
          </div>
          <p className="text-3xl font-bold text-secondary">{event.jobs.length}</p>
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-secondary/20 group-hover:bg-secondary transition-colors duration-300" />
        </div>
        <div className="bg-surface-1 border border-white/10 rounded-xl p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Slots Filled</span>
            <Users size={16} className="text-primary" />
          </div>
          <p className="text-3xl font-bold text-primary">{filledSlots}/{totalSlots}</p>
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary/20 group-hover:bg-primary transition-colors duration-300" />
        </div>
        <div className="bg-surface-1 border border-white/10 rounded-xl p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Fill Rate</span>
            <TrendingUp size={16} className="text-primary" />
          </div>
          <p className="text-3xl font-bold text-primary">{fillPct}%</p>
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary/20 group-hover:bg-primary transition-colors duration-300" />
        </div>
        <div className="bg-surface-1 border border-white/10 rounded-xl p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Applicants</span>
            <Users size={16} className={pendingApplicants > 0 ? "text-primary" : "text-text-muted"} />
          </div>
          <p className={`text-3xl font-bold ${pendingApplicants > 0 ? "text-primary" : "text-text"}`}>{pendingApplicants}</p>
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary/20 group-hover:bg-primary transition-colors duration-300" />
        </div>
      </div>

      {/* Roles */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted">Roles</h2>
      </div>

      {event.jobs.length === 0 ? (
        <div className="bg-surface-1 border border-white/10 rounded-xl p-12 text-center">
          <Users size={28} className="text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-muted">No roles defined for this event.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {event.jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onClick={() => router.push(`/gigs/${job.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
