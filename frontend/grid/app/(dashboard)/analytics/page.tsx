"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageLoader } from "@/components/ui/Spinner";
import { TrendingUp, CheckCircle, AlertTriangle, BarChart2, MapPin, Calendar, Users } from "lucide-react";
import type { Gig } from "@/types";

interface RawApplication {
  id: string;
  gig_id: string;
  status: string; // pending | accepted | rejected | withdrawn
  applied_at: string;
  responded_at: string | null;
}

interface RawAssignment {
  id: string;
  gig_id: string;
  worker_id: string;
  status: string; // assigned | checked_in | completed | no_show | left_early | disputed
  assigned_at: string;
  checked_in_at: string | null;
  completed_at: string | null;
}

function pct(num: number, den: number): number {
  if (den === 0) return 0;
  return Math.round((num / den) * 100);
}

function last6Months(): { key: string; label: string }[] {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
    };
  });
}

function heatColor(val: number, max: number): string {
  if (val === 0) return "bg-surface-3";
  const r = val / max;
  if (r < 0.25) return "bg-primary/20";
  if (r < 0.5)  return "bg-primary/40";
  if (r < 0.75) return "bg-primary/70";
  return "bg-primary";
}

export default function AnalyticsPage() {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [applications, setApplications] = useState<RawApplication[]>([]);
  const [assignments, setAssignments] = useState<RawAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: gigsData } = await supabase
        .from("gigs")
        .select("id, title, category, city, pay_amount, pay_type, slots_total, slots_filled, status, event_date, created_at")
        .eq("poster_id", user.id)
        .order("event_date", { ascending: false });

      const gigsList = (gigsData ?? []) as Gig[];
      setGigs(gigsList);

      if (gigsList.length > 0) {
        const gigIds = gigsList.map((g) => g.id);
        const [appsRes, assignRes] = await Promise.all([
          supabase
            .from("gig_applications")
            .select("id, gig_id, status, applied_at, responded_at")
            .in("gig_id", gigIds),
          supabase
            .from("gig_assignments")
            .select("id, gig_id, worker_id, status, assigned_at, checked_in_at, completed_at")
            .in("gig_id", gigIds),
        ]);
        setApplications((appsRes.data ?? []) as RawApplication[]);
        setAssignments((assignRes.data ?? []) as RawAssignment[]);
      }

      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <PageLoader />;

  if (gigs.length === 0) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <p className="pg-eyebrow">Analytics</p>
        <h1 className="pg-title mb-8">Analytics</h1>
        <div className="bg-surface-1 border border-white/10 rounded-xl p-16 text-center">
          <BarChart2 size={32} className="text-text-muted mx-auto mb-4" />
          <p className="text-sm text-text-muted">Post your first gig to see analytics here.</p>
        </div>
      </div>
    );
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────────
  const totalSlots  = gigs.reduce((s, g) => s + g.slots_total, 0);
  const filledSlots = gigs.reduce((s, g) => s + g.slots_filled, 0);
  const fillRate    = pct(filledSlots, totalSlots);

  const completedGigs  = gigs.filter((g) => g.status === "completed").length;
  const completionRate = pct(completedGigs, gigs.length);

  const noShowCount  = assignments.filter((a) => a.status === "no_show").length;
  const noShowRate   = pct(noShowCount, assignments.length);

  const totalCommitted = gigs.reduce((s, g) => s + g.pay_amount * g.slots_filled, 0);

  // ── Application funnel ────────────────────────────────────────────────────────
  const funnelApplied    = applications.length;
  const funnelAccepted   = applications.filter((a) => a.status === "accepted").length;
  const funnelCheckedIn  = assignments.filter((a) => ["checked_in", "completed", "left_early"].includes(a.status)).length;
  const funnelCompleted  = assignments.filter((a) => a.status === "completed").length;
  const funnelNoShow     = assignments.filter((a) => a.status === "no_show").length;

  const funnelSteps = [
    { label: "Applied",     value: funnelApplied,   color: "bg-white/20" },
    { label: "Accepted",    value: funnelAccepted,  color: "bg-secondary/60" },
    { label: "Checked In",  value: funnelCheckedIn, color: "bg-primary/60" },
    { label: "Completed",   value: funnelCompleted, color: "bg-primary" },
    { label: "No-Shows",    value: funnelNoShow,    color: "bg-error/60" },
  ];

  // ── Category performance ──────────────────────────────────────────────────────
  const catMap: Record<string, { count: number; filled: number; total: number; paySum: number }> = {};
  for (const g of gigs) {
    if (!catMap[g.category]) catMap[g.category] = { count: 0, filled: 0, total: 0, paySum: 0 };
    catMap[g.category].count++;
    catMap[g.category].filled += g.slots_filled;
    catMap[g.category].total  += g.slots_total;
    catMap[g.category].paySum += g.pay_amount;
  }
  const catStats = Object.entries(catMap)
    .map(([cat, d]) => ({
      cat,
      label:   cat.replace(/_/g, " "),
      count:   d.count,
      fillRate: pct(d.filled, d.total),
      avgPay:  Math.round(d.paySum / d.count),
    }))
    .sort((a, b) => b.fillRate - a.fillRate);

  // ── Monthly activity (last 6 months, by event_date) ───────────────────────────
  const months = last6Months();
  const monthlyData = months.map(({ key, label }) => {
    const mg = gigs.filter((g) => g.event_date.startsWith(key));
    return {
      label,
      count:  mg.length,
      filled: mg.reduce((s, g) => s + g.slots_filled, 0),
      total:  mg.reduce((s, g) => s + g.slots_total, 0),
    };
  });
  const maxCount  = Math.max(...monthlyData.map((m) => m.count), 1);
  const maxFilled = Math.max(...monthlyData.map((m) => m.filled), 1);

  // ── City distribution ─────────────────────────────────────────────────────────
  const cityMap: Record<string, { count: number; filled: number; total: number }> = {};
  for (const g of gigs) {
    if (!cityMap[g.city]) cityMap[g.city] = { count: 0, filled: 0, total: 0 };
    cityMap[g.city].count++;
    cityMap[g.city].filled += g.slots_filled;
    cityMap[g.city].total  += g.slots_total;
  }
  const cityStats = Object.entries(cityMap)
    .map(([city, d]) => ({ city, count: d.count, fillRate: pct(d.filled, d.total) }))
    .sort((a, b) => b.count - a.count);
  const maxCityCount = Math.max(...cityStats.map((c) => c.count), 1);

  // ── Calendar heatmap (last 12 weeks = 84 days) ────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const calStart = new Date(today);
  calStart.setDate(calStart.getDate() - 83);

  const gigsByDate: Record<string, number> = {};
  for (const g of gigs) {
    const key = g.event_date.split("T")[0];
    gigsByDate[key] = (gigsByDate[key] ?? 0) + g.slots_total;
  }

  const heatCells = Array.from({ length: 84 }, (_, i) => {
    const d = new Date(calStart);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split("T")[0];
    return { date: key, value: gigsByDate[key] ?? 0 };
  });
  const maxHeat = Math.max(...heatCells.map((c) => c.value), 1);

  const calStartLabel = calStart.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const calEndLabel   = today.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="mb-8">
        <p className="pg-eyebrow">Analytics</p>
        <h1 className="pg-title">Analytics</h1>
        <p className="pg-sub">
          {gigs.length} gig{gigs.length !== 1 ? "s" : ""} · {applications.length} applications · {assignments.length} assignments
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Fill Rate"       value={`${fillRate}%`}      sub={`${filledSlots}/${totalSlots} slots`}         Icon={TrendingUp}    accent="primary"   />
        <KpiCard label="Completion Rate" value={`${completionRate}%`} sub={`${completedGigs} of ${gigs.length} gigs`}   Icon={CheckCircle}   accent="secondary" />
        <KpiCard label="No-Show Rate"    value={`${noShowRate}%`}    sub={`${noShowCount} of ${assignments.length}`}    Icon={AlertTriangle} accent={noShowRate > 20 ? "error" : "primary"} />
        <KpiCard label="₹ Committed"     value={`₹${totalCommitted.toLocaleString("en-IN")}`} sub="pay for filled slots" Icon={Users} accent="secondary" />
      </div>

      {/* Funnel + Category */}
      <div className="grid grid-cols-12 gap-5">
        {/* Application Funnel */}
        <div className="col-span-12 lg:col-span-5 bg-surface-1 border border-white/10 rounded-xl p-6">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-6">Application Funnel</h2>
          {funnelApplied === 0 ? (
            <p className="text-sm text-text-muted">No applications yet.</p>
          ) : (
            <div className="space-y-5">
              {funnelSteps.map(({ label, value, color }) => {
                const w = pct(value, funnelApplied);
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-text-muted font-bold uppercase tracking-wide">{label}</span>
                      <span className="text-text font-bold">
                        {value}
                        <span className="text-text-muted font-normal ml-1">({w}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full`} style={{ width: `${w}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Category Performance */}
        <div className="col-span-12 lg:col-span-7 bg-surface-1 border border-white/10 rounded-xl p-6">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-6">Category Performance</h2>
          <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
            {catStats.map(({ cat, label, count, fillRate: fr, avgPay }) => (
              <div key={cat}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-text font-semibold capitalize">{label}</span>
                    <span className="text-text-muted text-[10px]">{count} gig{count !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-text-muted">avg ₹{avgPay.toLocaleString("en-IN")}</span>
                    <span className={`font-bold w-8 text-right ${fr >= 80 ? "text-primary" : fr >= 50 ? "text-secondary" : "text-text-muted"}`}>
                      {fr}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${fr >= 80 ? "bg-primary" : fr >= 50 ? "bg-secondary" : "bg-white/20"}`}
                    style={{ width: `${fr}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Activity + City */}
      <div className="grid grid-cols-12 gap-5">
        {/* Monthly Activity Bar Chart */}
        <div className="col-span-12 lg:col-span-7 bg-surface-1 border border-white/10 rounded-xl p-6">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-6">Monthly Activity</h2>
          <div className="flex items-end gap-3 h-36">
            {monthlyData.map(({ label, count, filled }) => (
              <div key={label} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                <div className="w-full flex gap-0.5 items-end h-full">
                  <div
                    className="flex-1 bg-primary/25 rounded-t-sm min-h-0"
                    style={{ height: count > 0 ? `${Math.max((count / maxCount) * 100, 6)}%` : "0%" }}
                    title={`${count} gig${count !== 1 ? "s" : ""}`}
                  />
                  <div
                    className="flex-1 bg-primary rounded-t-sm min-h-0"
                    style={{ height: filled > 0 ? `${Math.max((filled / maxFilled) * 100, 6)}%` : "0%" }}
                    title={`${filled} slots filled`}
                  />
                </div>
                <span className="text-[9px] text-text-muted font-bold uppercase tracking-wide mt-1">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-5 mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 text-[10px] text-text-muted">
              <div className="w-3 h-3 rounded-sm bg-primary/25" /> Gigs Posted
            </div>
            <div className="flex items-center gap-2 text-[10px] text-text-muted">
              <div className="w-3 h-3 rounded-sm bg-primary" /> Slots Filled
            </div>
          </div>
        </div>

        {/* City Distribution */}
        <div className="col-span-12 lg:col-span-5 bg-surface-1 border border-white/10 rounded-xl p-6">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-6 flex items-center gap-2">
            <MapPin size={10} /> City Distribution
          </h2>
          <div className="space-y-4">
            {cityStats.slice(0, 7).map(({ city, count, fillRate: fr }) => (
              <div key={city}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-text font-semibold">{city}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-text-muted">{count} gig{count !== 1 ? "s" : ""}</span>
                    <span className={`font-bold w-10 text-right ${fr >= 80 ? "text-primary" : "text-text-muted"}`}>
                      {fr}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary/60 rounded-full"
                    style={{ width: `${(count / maxCityCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gig Activity Heatmap */}
      <div className="bg-surface-1 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-text-muted flex items-center gap-2">
            <Calendar size={10} /> Gig Calendar — Last 12 Weeks
          </h2>
          <div className="flex items-center gap-1.5 text-[9px] text-text-muted">
            <span>Less</span>
            {["bg-surface-3", "bg-primary/20", "bg-primary/40", "bg-primary/70", "bg-primary"].map((c, i) => (
              <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
            ))}
            <span>More</span>
          </div>
        </div>

        <div className="flex gap-1">
          {Array.from({ length: 12 }, (_, weekIdx) => (
            <div key={weekIdx} className="flex-1 flex flex-col gap-1">
              {Array.from({ length: 7 }, (_, dayIdx) => {
                const cell = heatCells[weekIdx * 7 + dayIdx];
                const color = cell ? heatColor(cell.value, maxHeat) : "bg-surface-3";
                const label = cell ? `${cell.date}${cell.value > 0 ? `: ${cell.value} slots` : ""}` : "";
                return (
                  <div
                    key={dayIdx}
                    className={`aspect-square rounded-sm ${color}`}
                    title={label}
                  />
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-2 text-[9px] text-text-muted">
          <span>{calStartLabel}</span>
          <span>Today ({calEndLabel})</span>
        </div>
      </div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, Icon, accent,
}: {
  label: string;
  value: string;
  sub: string;
  Icon: React.ElementType;
  accent: "primary" | "secondary" | "error";
}) {
  const textColor  = accent === "error" ? "text-error"     : accent === "secondary" ? "text-secondary" : "text-primary";
  const barFrom    = accent === "error" ? "bg-error/20"    : accent === "secondary" ? "bg-secondary/20" : "bg-primary/20";
  const barTo      = accent === "error" ? "group-hover:bg-error" : accent === "secondary" ? "group-hover:bg-secondary" : "group-hover:bg-primary";

  return (
    <div className="bg-surface-1 border border-white/10 rounded-xl p-5 relative overflow-hidden group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{label}</span>
        <Icon size={15} className={textColor} />
      </div>
      <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
      <p className="text-[10px] text-text-muted mt-1">{sub}</p>
      <div className={`absolute bottom-0 left-0 w-full h-[2px] transition-colors duration-300 ${barFrom} ${barTo}`} />
    </div>
  );
}
