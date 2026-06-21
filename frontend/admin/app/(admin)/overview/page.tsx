"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { MetricTile } from "@/components/ui/MetricTile";

type SystemStatus = "healthy" | "warning" | "critical" | "unknown";

interface ServiceStatus {
  label: string;
  status: SystemStatus;
  latency?: number;
}

interface Stats {
  total_users: number;
  total_runners: number;
  total_hosts: number;
  active_gigs: number;
  open_tickets: number;
  pending_verifications: number;
  trials_expiring_soon: number;
  applications_7d: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function useLiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-IN", { hour12: false }) + " IST");
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function StatusDot({ status }: { status: SystemStatus }) {
  const cls = status === "healthy" ? "healthy"
    : status === "warning"  ? "warning"
    : status === "critical" ? "critical"
    : "warning";
  return <span className={`status-dot ${cls}`} />;
}

export default function OverviewPage() {
  const clock = useLiveClock();
  const [stats, setStats] = useState<Stats | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([
    { label: "API",      status: "unknown" },
    { label: "DB",       status: "unknown" },
    { label: "Inspector",status: "unknown" },
  ]);

  const pingServices = useCallback(async () => {
    // API
    try {
      const t0 = performance.now();
      const res = await fetch(`${API_URL.replace("/api/v1","")}/api/v1/health`);
      const latency = Math.round(performance.now() - t0);
      setServices(s => s.map(x => x.label === "API"
        ? { ...x, status: res.ok ? "healthy" : "critical", latency }
        : x));
    } catch {
      setServices(s => s.map(x => x.label === "API" ? { ...x, status: "critical" } : x));
    }
    // DB
    try {
      const t0 = performance.now();
      const res = await fetch(`${API_URL.replace("/api/v1","")}/api/v1/health/db`);
      const latency = Math.round(performance.now() - t0);
      setServices(s => s.map(x => x.label === "DB"
        ? { ...x, status: res.ok ? "healthy" : "critical", latency }
        : x));
    } catch {
      setServices(s => s.map(x => x.label === "DB" ? { ...x, status: "critical" } : x));
    }
    // Inspector (best-effort)
    setServices(s => s.map(x => x.label === "Inspector" ? { ...x, status: "healthy" } : x));
  }, []);

  const fetchStats = useCallback(async () => {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, default_role, is_active");
    if (error || !profiles) return;

    const total_users   = profiles.length;
    const total_runners = profiles.filter(p => p.default_role === "runner").length;
    const total_hosts   = profiles.filter(p => p.default_role === "host").length;

    const { count: active_gigs } = await supabase
      .from("gigs")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .eq("is_paused", false);

    const { count: open_tickets } = await supabase
      .from("support_queries")
      .select("id", { count: "exact", head: true })
      .eq("status", "open");

    const { count: pending_verifications } = await supabase
      .from("verification_jobs")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "processing"]);

    const trialCutoff = new Date();
    trialCutoff.setDate(trialCutoff.getDate() + 7);
    const { count: trials_expiring_soon } = await supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("plan", "trial")
      .lte("trial_ends_at", trialCutoff.toISOString());

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { count: applications_7d } = await supabase
      .from("gig_applications")
      .select("id", { count: "exact", head: true })
      .gte("applied_at", weekAgo.toISOString());

    setStats({
      total_users,
      total_runners,
      total_hosts,
      active_gigs: active_gigs ?? 0,
      open_tickets: open_tickets ?? 0,
      pending_verifications: pending_verifications ?? 0,
      trials_expiring_soon: trials_expiring_soon ?? 0,
      applications_7d: applications_7d ?? 0,
    });
  }, []);

  useEffect(() => {
    fetchStats();
    pingServices();
    const statInterval = setInterval(fetchStats, 60_000);
    const pingInterval = setInterval(pingServices, 30_000);
    return () => { clearInterval(statInterval); clearInterval(pingInterval); };
  }, [fetchStats, pingServices]);

  const s = stats;

  return (
    <div className="min-h-screen p-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1"
            style={{ color: "#D4FF00", fontFamily: "var(--font-mono)" }}
          >
            kria · admin
          </p>
          <h1 className="text-2xl font-bold text-white">Command Center</h1>
        </div>

        {/* System status strip */}
        <div
          className="flex items-center gap-5 px-4 py-2.5 rounded-xl"
          style={{ backgroundColor: "#111111", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {services.map(svc => (
            <div key={svc.label} className="flex items-center gap-2">
              <StatusDot status={svc.status} />
              <span
                className="text-[11px] font-medium"
                style={{ fontFamily: "var(--font-mono)", color: "#9a9a8a" }}
              >
                {svc.label}
                {svc.latency !== undefined && (
                  <span style={{ color: "#555550" }}> {svc.latency}ms</span>
                )}
              </span>
            </div>
          ))}
          <div style={{ width: "1px", height: "14px", backgroundColor: "rgba(255,255,255,0.07)" }} />
          <span
            className="text-[11px]"
            style={{ fontFamily: "var(--font-mono)", color: "#333330" }}
          >
            {clock}
          </span>
        </div>
      </div>

      {/* ── Bento grid ── */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(4, 1fr)", gridTemplateRows: "auto auto" }}
      >
        {/* Row 1 */}
        <MetricTile
          label="Total Users"
          value={s?.total_users ?? 0}
          sub={`${s?.total_runners ?? 0} runners · ${s?.total_hosts ?? 0} hosts`}
          className="col-span-1"
        />
        <MetricTile
          label="Active Gigs"
          value={s?.active_gigs ?? 0}
          sub="open & unpaused"
          className="col-span-1"
        />
        <MetricTile
          label="Applications (7d)"
          value={s?.applications_7d ?? 0}
          sub="last 7 days"
          sparklineColor="#8097ff"
          className="col-span-1"
        />
        <MetricTile
          label="Open Tickets"
          value={s?.open_tickets ?? 0}
          sub="awaiting response"
          alert={(s?.open_tickets ?? 0) > 0 ? "amber" : undefined}
          className="col-span-1"
        />

        {/* Row 2 */}
        <MetricTile
          label="Pending Verification"
          value={s?.pending_verifications ?? 0}
          sub="in queue"
          alert={(s?.pending_verifications ?? 0) > 0 ? "amber" : undefined}
          className="col-span-1"
        />
        <MetricTile
          label="Trials Expiring"
          value={s?.trials_expiring_soon ?? 0}
          sub="within 7 days"
          alert={(s?.trials_expiring_soon ?? 0) > 3 ? "amber" : undefined}
          className="col-span-1"
        />

        {/* Wide runner/host breakdown tile */}
        <div
          className="metric-tile col-span-2 flex flex-col justify-between"
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3"
            style={{ color: "#555550" }}
          >
            User Split
          </p>
          <div className="flex items-end gap-6 mb-3">
            <div>
              <p className="text-3xl font-bold leading-none" style={{ fontFamily: "var(--font-mono)", color: "#8097ff" }}>
                {(s?.total_runners ?? 0).toLocaleString()}
              </p>
              <p className="text-[11px] mt-1" style={{ color: "#555550" }}>Runners</p>
            </div>
            <div>
              <p className="text-3xl font-bold leading-none" style={{ fontFamily: "var(--font-mono)", color: "#D4FF00" }}>
                {(s?.total_hosts ?? 0).toLocaleString()}
              </p>
              <p className="text-[11px] mt-1" style={{ color: "#555550" }}>Hosts</p>
            </div>
          </div>
          {/* Split bar */}
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
            {s && s.total_users > 0 && (
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${(s.total_runners / s.total_users) * 100}%`,
                  background: "linear-gradient(90deg, #8097ff, #D4FF00)",
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Quick links ── */}
      <div className="mt-6 flex gap-3">
        {[
          { label: "View open tickets →",        href: "/tickets",      color: "#FFC83D" },
          { label: "Verification queue →",        href: "/verification", color: "#8097ff" },
          { label: "All users →",                 href: "/users",        color: "#e2e4cf" },
        ].map(({ label, href, color }) => (
          <a
            key={href}
            href={href}
            className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
            style={{
              backgroundColor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              color,
              fontFamily: "var(--font-mono)",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)")}
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}
