"use client";

import { useEffect, useState } from "react";
import { initializeSubscription, type SubscriptionStatus } from "@/lib/api/subscriptions";
import { Spinner } from "@/components/ui/Spinner";

const PLAN_FEATURES = [
  "Unlimited gig postings",
  "Applicant Momentum Score access",
  "OTP check-in system",
  "Runner ratings & reviews",
  "Analytics dashboard",
  "Priority support",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function TimeBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold tabular-nums"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-primary) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--color-primary) 22%, transparent)",
          color: "var(--color-primary)",
          fontFamily: "var(--font-comfortaa)",
          letterSpacing: "-0.02em",
        }}
      >
        {pad(value)}
      </div>
      <span
        className="text-[10px] uppercase tracking-[0.2em] font-semibold"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
      </span>
    </div>
  );
}

function TrialProgress({ daysUsed, totalDays }: { daysUsed: number; totalDays: number }) {
  const pct = totalDays > 0 ? Math.min(100, (daysUsed / totalDays) * 100) : 0;
  const remaining = 100 - pct;

  let barColor = "var(--color-primary)";
  if (remaining <= 20) barColor = "var(--color-error)";
  else if (remaining <= 40) barColor = "var(--color-amber)";

  return (
    <div className="w-full">
      <div className="flex justify-between text-[11px] font-semibold mb-2.5" style={{ color: "var(--color-text-muted)" }}>
        <span>Day 1</span>
        <span>Day {totalDays}</span>
      </div>
      <div className="h-1.5 rounded-full w-full" style={{ backgroundColor: "var(--color-surface-3)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  const [sub, setSub] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    initializeSubscription().then(({ data }) => {
      setSub(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!sub?.trial_ends_at || sub.is_expired) return;

    const tick = () => {
      const now = Date.now();
      const end = new Date(sub.trial_ends_at!).getTime();
      const delta = Math.max(0, end - now);

      const totalSecs = Math.floor(delta / 1000);
      const days = Math.floor(totalSecs / 86400);
      const hours = Math.floor((totalSecs % 86400) / 3600);
      const minutes = Math.floor((totalSecs % 3600) / 60);
      const seconds = totalSecs % 60;

      setCountdown({ days, hours, minutes, seconds });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sub]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--content-bg)" }}>
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    );
  }

  const isExpired = sub?.is_expired ?? false;
  const totalDays = sub?.trial_duration_days ?? 90;
  const daysRemaining = sub?.days_remaining ?? 0;
  const daysUsed = Math.max(0, totalDays - daysRemaining);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <p className="pg-eyebrow">Billing</p>
        <h1 className="pg-title">Subscription</h1>
      </div>

      {isExpired ? (
        /* ── Expired state ── */
        <ExpiredView />
      ) : (
        /* ── Active trial state ── */
        <>
          {/* Trial card */}
          <div
            className="rounded-2xl p-8 mb-6 relative overflow-hidden"
            style={{
              backgroundColor: "var(--card-bg)",
              border: "1px solid color-mix(in srgb, var(--color-primary) 15%, transparent)",
            }}
          >
            {/* Subtle glow */}
            <div
              className="absolute -top-20 -right-20 w-64 h-64 pointer-events-none rounded-full"
              style={{ backgroundColor: "var(--color-primary)", opacity: 0.04, filter: "blur(60px)" }}
            />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="text-[10px] font-bold uppercase tracking-[0.2em] px-2.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
                        color: "var(--color-primary)",
                        border: "1px solid color-mix(in srgb, var(--color-primary) 22%, transparent)",
                      }}
                    >
                      Free Trial
                    </span>
                  </div>
                  <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
                    {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
                  </h2>
                  <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                    {totalDays}-day trial · all features included
                  </p>
                </div>
              </div>

              {/* Countdown */}
              {countdown && (
                <div className="flex items-start gap-4 mb-8 flex-wrap">
                  <TimeBox value={countdown.days} label="Days" />
                  <div className="text-2xl font-bold mt-6" style={{ color: "var(--color-text-muted)" }}>:</div>
                  <TimeBox value={countdown.hours} label="Hours" />
                  <div className="text-2xl font-bold mt-6" style={{ color: "var(--color-text-muted)" }}>:</div>
                  <TimeBox value={countdown.minutes} label="Min" />
                  <div className="text-2xl font-bold mt-6" style={{ color: "var(--color-text-muted)" }}>:</div>
                  <TimeBox value={countdown.seconds} label="Sec" />
                </div>
              )}

              <TrialProgress daysUsed={daysUsed} totalDays={totalDays} />
            </div>
          </div>

          {/* What's included */}
          <div
            className="rounded-2xl p-8"
            style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}
          >
            <h3 className="section-title mb-5">What's included</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PLAN_FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-3">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
                      color: "var(--color-primary)",
                    }}
                  >
                    ✓
                  </span>
                  <span className="text-sm" style={{ color: "var(--color-text-sub)" }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ExpiredView() {
  return (
    <div
      className="rounded-2xl p-10 text-center"
      style={{
        backgroundColor: "var(--card-bg)",
        border: "1px solid color-mix(in srgb, var(--color-error) 22%, transparent)",
      }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-5"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-error) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--color-error) 22%, transparent)",
        }}
      >
        ⚡
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: "var(--color-text)", fontFamily: "var(--font-comfortaa)" }}>
        Your trial has ended
      </h2>
      <p className="text-sm mb-8 max-w-xs mx-auto" style={{ color: "var(--color-text-muted)" }}>
        Paid plans are coming soon. We'll notify you when they're ready.
      </p>

      <div
        className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest"
        style={{
          backgroundColor: "var(--color-surface-2)",
          border: "1px solid var(--border-subtle)",
          color: "var(--color-text-muted)",
          cursor: "default",
        }}
      >
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--color-amber)" }} />
        Plans Coming Soon
      </div>

      <p className="text-[11px] mt-6" style={{ color: "var(--color-text-muted)" }}>
        In the meantime, contact us at{" "}
        <a href="mailto:hello@trykria.com" className="underline" style={{ color: "var(--color-text-sub)" }}>
          hello@trykria.com
        </a>
      </p>
    </div>
  );
}
