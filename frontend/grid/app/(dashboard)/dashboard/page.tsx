"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Briefcase, Users, Calendar, TrendingUp, Download, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { GigStatusBadge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/Spinner";
import type { Gig, MyEventSummary } from "@/types";

function StatCard({
  label, value, sub, Icon, accent = "primary",
}: {
  label: string;
  value: string | number;
  sub?: string;
  Icon: React.ElementType;
  accent?: "primary" | "secondary";
}) {
  const accentColor = accent === "primary" ? "text-primary" : "text-secondary";
  const glowColor   = accent === "primary" ? "bg-primary/20 group-hover:bg-primary" : "bg-secondary/20 group-hover:bg-secondary";

  return (
    <div className="bg-surface-1 border border-white/10 rounded-xl p-6 relative overflow-hidden group">
      <div className="flex items-start justify-between mb-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{label}</span>
        <Icon size={18} className={accentColor} />
      </div>
      <p className={`text-4xl font-bold ${accentColor}`}>{value}</p>
      {sub && <p className="text-xs text-text-muted mt-2">{sub}</p>}
      {/* Bottom accent bar */}
      <div className={`absolute bottom-0 left-0 w-full h-[2px] transition-colors duration-300 ${glowColor}`} />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [events, setEvents] = useState<MyEventSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [gigsRes, eventsRes] = await Promise.all([
        supabase
          .from("gigs")
          .select("*")
          .eq("poster_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("events")
          .select("id, title, venue_name, city, event_date, status, created_at")
          .eq("poster_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      setGigs((gigsRes.data ?? []) as Gig[]);
      setEvents((eventsRes.data ?? []) as unknown as MyEventSummary[]);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <PageLoader />;

  const activeGigs  = gigs.filter((g) => g.status === "open" || g.status === "in_progress");
  const totalSlots  = gigs.reduce((s, g) => s + g.slots_total, 0);
  const filledSlots = gigs.reduce((s, g) => s + g.slots_filled, 0);
  const recentGigs  = gigs.slice(0, 6);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="pg-eyebrow">Overview</p>
          <h1 className="pg-title">Host Dashboard</h1>
          <p className="pg-sub">Real-time performance and gig management.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-1 border border-white/10 text-text text-xs font-bold uppercase tracking-wider rounded hover:bg-surface-2 transition-colors">
            <Download size={14} />
            Export CSV
          </button>
          <button
            onClick={() => router.push("/gigs/new")}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-text-inv text-xs font-bold uppercase tracking-wider rounded hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus size={14} />
            Post New Gig
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Gigs"  value={activeGigs.length}              sub="open or in progress"  Icon={Briefcase}  accent="primary"   />
        <StatCard label="Total Events" value={events.length}                   sub="all time"             Icon={Calendar}   accent="secondary" />
        <StatCard
          label="Slots Filled"
          value={`${filledSlots}/${totalSlots}`}
          sub={totalSlots > 0 ? `${Math.round((filledSlots / totalSlots) * 100)}% fill rate` : "no gigs yet"}
          Icon={Users}
          accent="primary"
        />
        <StatCard label="Total Posted" value={gigs.length}                    sub="gigs all time"        Icon={TrendingUp} accent="secondary" />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Recent gigs table */}
        <div className="col-span-12 lg:col-span-9 bg-surface-1 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-surface-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-text">Recent Gigs</h3>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-[10px] text-text-muted font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-primary inline-block" /> Open
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-text-muted font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-secondary inline-block" /> In Progress
              </span>
            </div>
          </div>

          {gigs.length === 0 ? (
            <div className="p-12 text-center">
              <Briefcase size={32} className="text-text-muted mx-auto mb-3" />
              <p className="text-sm text-text-muted mb-4">No gigs yet. Post your first one!</p>
              <button
                onClick={() => router.push("/gigs/new")}
                className="px-5 py-2 bg-primary text-text-inv text-xs font-bold uppercase tracking-wider rounded hover:brightness-110 transition-all"
              >
                Post a Gig
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Gig Details</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted hidden md:table-cell">Category</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted hidden lg:table-cell">City</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted hidden lg:table-cell">Date</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Slots</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {recentGigs.map((gig) => (
                      <tr
                        key={gig.id}
                        onClick={() => router.push(`/gigs/${gig.id}`)}
                        className="cursor-pointer hover:bg-white/[0.02] transition-colors group"
                      >
                        <td className="px-6 py-5">
                          <p className="text-sm font-semibold text-text">{gig.title}</p>
                          {gig.company_name && (
                            <p className="text-[10px] text-text-muted mt-0.5">{gig.company_name}</p>
                          )}
                        </td>
                        <td className="px-6 py-5 hidden md:table-cell">
                          <span className="bg-surface-4 text-secondary text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wide">
                            {gig.category.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-sm text-text-sub hidden lg:table-cell">{gig.city}</td>
                        <td className="px-6 py-5 text-sm text-text-sub hidden lg:table-cell">
                          {new Date(gig.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </td>
                        <td className="px-6 py-5">
                          <span className={`text-sm font-semibold ${gig.slots_filled >= gig.slots_total && gig.slots_total > 0 ? "text-primary" : "text-text"}`}>
                            {gig.slots_filled}/{gig.slots_total}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <GigStatusBadge status={gig.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-white/5 bg-bg/30">
                <button
                  onClick={() => router.push("/gigs")}
                  className="flex items-center gap-2 text-xs text-text-muted hover:text-primary transition-colors font-bold uppercase tracking-wider"
                >
                  View All Gigs <ArrowRight size={12} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right sidebar */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
          {/* Quick actions */}
          <div className="bg-surface-1 border border-white/10 rounded-xl p-6">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => router.push("/gigs/new")}
                className="w-full flex items-center gap-3 p-3 bg-surface-3 rounded border border-white/5 hover:border-primary/30 transition-colors text-left"
              >
                <Briefcase size={16} className="text-primary flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-text">Post a Gig</p>
                  <p className="text-[10px] text-text-muted">Find Runners instantly</p>
                </div>
              </button>
              <button
                onClick={() => router.push("/events/new")}
                className="w-full flex items-center gap-3 p-3 bg-surface-3 rounded border border-white/5 hover:border-secondary/30 transition-colors text-left"
              >
                <Calendar size={16} className="text-secondary flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-text">Create Event</p>
                  <p className="text-[10px] text-text-muted">Bundle multiple gigs</p>
                </div>
              </button>
            </div>
          </div>

          {/* System status */}
          <div className="bg-surface-1 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">System Status</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[10px] font-bold text-primary uppercase">Optimal</span>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: "API Uptime", value: "99.98%", pct: 99 },
                { label: "Match Rate",  value: "94.2%",  pct: 94 },
              ].map(({ label, value, pct }) => (
                <div key={label}>
                  <div className="flex justify-between text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                  <div className="w-full bg-surface-3 h-[2px] rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
