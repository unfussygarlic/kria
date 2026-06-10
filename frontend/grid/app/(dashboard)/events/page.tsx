"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Calendar, Users, Briefcase, ArrowRight } from "lucide-react";
import { getMyEvents } from "@/lib/api/events";
import { PageLoader } from "@/components/ui/Spinner";
import type { MyEventSummary } from "@/types";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_STYLE: Record<string, string> = {
  open:        "bg-primary/15 text-primary",
  in_progress: "bg-secondary/15 text-secondary",
  completed:   "bg-white/10 text-text-muted",
  cancelled:   "bg-error/15 text-error",
  draft:       "bg-white/5 text-text-muted",
};

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<MyEventSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyEvents().then((res) => {
      setEvents(res.data ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) return <PageLoader />;

  const totalRoles = events.reduce((s, e) => s + e.job_count, 0);
  const totalSlots = events.reduce((s, e) => s + e.total_slots, 0);
  const filledSlots = events.reduce((s, e) => s + e.slots_filled, 0);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="pg-eyebrow">Events</p>
          <h1 className="pg-title">My Events</h1>
          <p className="text-sm text-text-muted mt-1">{events.length} event{events.length !== 1 ? "s" : ""} created</p>
        </div>
        <button
          onClick={() => router.push("/events/new")}
          className="flex items-center gap-2 px-5 py-2 bg-primary text-text-inv text-xs font-bold uppercase tracking-wider rounded hover:brightness-110 active:scale-95 transition-all"
        >
          <Plus size={14} /> Create Event
        </button>
      </div>

      {events.length === 0 ? (
        <div className="bg-surface-1 border border-white/10 rounded-xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <Calendar size={28} className="text-primary" />
          </div>
          <h2 className="text-lg font-bold text-text mb-2">Create your first event</h2>
          <p className="text-sm text-text-muted mb-6 max-w-xs mx-auto">
            Group multiple gig roles under one event umbrella. Runners see the full picture.
          </p>
          <button
            onClick={() => router.push("/events/new")}
            className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-text-inv text-xs font-bold uppercase tracking-wider rounded hover:brightness-110 transition-all"
          >
            <Plus size={14} /> Create Event
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-8">
            {events.map((event) => {
              const statusCls = STATUS_STYLE[event.status] ?? "bg-white/10 text-text-muted";
              const fillPct = event.total_slots > 0 ? Math.round((event.slots_filled / event.total_slots) * 100) : 0;
              return (
                <div
                  key={event.id}
                  onClick={() => router.push(`/events/${event.id}`)}
                  className="bg-surface-1 border border-white/10 rounded-xl p-5 cursor-pointer hover:border-white/20 hover:bg-white/[0.02] transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                        <Calendar size={20} className="text-secondary" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-text group-hover:text-primary transition-colors">{event.title}</h2>
                        <p className="text-xs text-text-muted mt-0.5">
                          {formatDate(event.event_date)} · {event.venue_name}, {event.city}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${statusCls}`}>
                        {event.status.replace(/_/g, " ")}
                      </span>
                      <ArrowRight size={14} className="text-text-muted group-hover:text-primary transition-colors" />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-6">
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      <Briefcase size={12} />
                      <span>{event.job_count} role{event.job_count !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      <Users size={12} />
                      <span>{event.total_applicants} applicant{event.total_applicants !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-secondary rounded-full transition-all" style={{ width: `${fillPct}%` }} />
                      </div>
                      <span className="text-xs text-text-muted whitespace-nowrap">
                        {event.slots_filled}/{event.total_slots} filled
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface-2 border border-white/10 rounded-xl p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Total Events</p>
              <p className="text-2xl font-bold text-secondary">{events.length}</p>
            </div>
            <div className="bg-surface-2 border border-white/10 rounded-xl p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Total Roles</p>
              <p className="text-2xl font-bold text-text">{totalRoles}</p>
            </div>
            <div className="bg-surface-2 border border-white/10 rounded-xl p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Slots Filled</p>
              <p className="text-2xl font-bold text-primary">{filledSlots}/{totalSlots}</p>
              <p className="text-[10px] text-text-muted mt-1">
                {totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0}% fill rate
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
