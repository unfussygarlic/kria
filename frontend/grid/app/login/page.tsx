"use client";

/**
 * /login — Grid landing page.
 *
 * ── "Live Grid" redesign (2026-08-07) ────────────────────────────────────────
 * Replaced the 7-scene scroll story ("Intro → Why Grid → Post → Applicants → …
 * → Dashboard mockup") with a live-feed-first hero.
 *
 * Prior design was a features tour: employers had to scroll past 6 scenes
 * before reaching the dashboard mockup and the sign-in was buried behind
 * cognitive load. This version leads with **motion and specifics** — a live
 * (simulated) stream of activity across India + an animated India map with
 * pulsing city dots — so the pitch is "look how many businesses are hiring
 * on Kria right now" rather than "here's how our feature X works."
 *
 * Structure (left column = story, right column = sticky email OTP):
 *   1. Hero — headline + short lead + big live-feed panel
 *   2. India map + city rankings
 *   3. Three pillar cards (Post · Hire · Verify) with one condensed demo
 *   4. Dashboard mockup (kept, kept small)
 *
 * All auth logic (Supabase magic-link OTP flow, error/cooldown handling,
 * theme toggle) is unchanged from the prior version — same session code,
 * same route → dashboard-or-onboarding behavior.
 *
 * The activity feed is simulated: rotating templates keyed off a pool of
 * hand-picked hosts + cities so it feels grounded even on cold-start. When
 * we ship a real events stream (application-created / gig-posted / OTP-
 * verified), swap `useActivityFeed()` for a real WebSocket subscription
 * without touching the layout.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Step = "email" | "otp";

const RESEND_COOLDOWN = 60;

// ── Live activity feed seed data ───────────────────────────────────────────
// Hand-picked hosts + city so the stream reads authentic before any real
// signal exists. Kept small (~12 hosts × 10 templates) so patterns are
// visible enough to feel real but random enough not to loop obviously.

const HOSTS: { name: string; city: string; cityKey: string }[] = [
  { name: "Olive & Oak",           city: "Bengaluru",  cityKey: "blr" },
  { name: "Chennai Trade Centre",  city: "Chennai",    cityKey: "che" },
  { name: "Verba Studios",         city: "Mumbai",     cityKey: "mum" },
  { name: "Bandra Books",          city: "Mumbai",     cityKey: "mum" },
  { name: "Mama",                  city: "Bengaluru",  cityKey: "blr" },
  { name: "Flipkart",              city: "Hyderabad",  cityKey: "hyd" },
  { name: "Sunburn Ent.",          city: "Goa",        cityKey: "mum" },
  { name: "The Leela",             city: "Delhi NCR",  cityKey: "delhi" },
  { name: "Cafe Coffee Day",       city: "Pune",       cityKey: "pune" },
  { name: "Nirvana Wedding Co.",   city: "Jaipur",     cityKey: "jaipur" },
  { name: "Le Meridien",           city: "Kochi",      cityKey: "koc" },
  { name: "Ozone Wellness",        city: "Bengaluru",  cityKey: "blr" },
];

const RUNNER_NAMES = ["Priya S.", "Arjun M.", "Kavya N.", "Rohan G.", "Anika P.", "Vikram T.", "Meera K.", "Aditya R."];

type ActivityKind = "post" | "hire" | "fill" | "checkin" | "rating" | "level" | "pay" | "accept";

const ACTIVITY_TEMPLATES: {
  kind: ActivityKind;
  build: (h: (typeof HOSTS)[number], runner: string) => { text: string; sub: string };
}[] = [
  { kind: "post",    build: (h)    => ({ text: `${h.name} posted 3 shifts`,           sub: `Banquet crew · ${h.city}` }) },
  { kind: "hire",    build: (h)    => ({ text: `${h.name} hired 4 promoters`,         sub: `for launch event · ${h.city}` }) },
  { kind: "fill",    build: (h)    => ({ text: `${h.name} filled a 10-hour shoot`,    sub: `in 9 minutes · ${h.city}` }) },
  { kind: "checkin", build: (h, r) => ({ text: `${r} checked in`,                     sub: `${h.name} venue · ${h.city}` }) },
  { kind: "rating",  build: (h, r) => ({ text: `${r} rated 5.0`,                      sub: `after gig at ${h.name} · ${h.city}` }) },
  { kind: "post",    build: (h)    => ({ text: `${h.name} posted a wedding crew`,     sub: `12 roles across 3 days · ${h.city}` }) },
  { kind: "accept",  build: (h, r) => ({ text: `${r} accepted a shift`,               sub: `at ${h.name} · ${h.city}` }) },
  { kind: "pay",     build: (h)    => ({ text: `${h.name} settled ₹42,000 in wages`,  sub: `overnight · ${h.city}` }) },
  { kind: "level",   build: (h, r) => ({ text: `${r} hit 800 Momentum`,               sub: `Elite band · ${h.city}` }) },
  { kind: "fill",    build: (h)    => ({ text: `${h.name} filled 8 slots in 6 min`,   sub: `median today · 8m 12s · ${h.city}` }) },
];

// ── City coordinates on the India-map SVG (viewBox 0 0 400 500) ───────────
// Baseline "live count" per city — updated in-place by the feed hook so the
// numbers on the map tick up as new activity streams in.

const CITY_DOTS: { key: string; label: string; x: number; y: number; live: number }[] = [
  { key: "delhi",  label: "Delhi NCR",  x: 210, y: 118, live: 32 },
  { key: "jaipur", label: "Jaipur",     x: 176, y: 148, live: 12 },
  { key: "ahm",    label: "Ahmedabad",  x: 130, y: 195, live:  9 },
  { key: "kol",    label: "Kolkata",    x: 300, y: 220, live:  7 },
  { key: "mum",    label: "Mumbai",     x: 128, y: 245, live: 41 },
  { key: "pune",   label: "Pune",       x: 152, y: 268, live: 18 },
  { key: "hyd",    label: "Hyderabad",  x: 208, y: 285, live: 24 },
  { key: "blr",    label: "Bengaluru",  x: 194, y: 340, live: 47 },
  { key: "che",    label: "Chennai",    x: 240, y: 346, live: 22 },
  { key: "koc",    label: "Kochi",      x: 186, y: 392, live:  8 },
];

// ── Activity feed hook ────────────────────────────────────────────────────
// Pushes one new row every 2.8–5s. Ages every row every second so the "12s
// ago" labels tick. Also emits the cityKey of the latest event so the map
// can flash that city's dot.

interface ActivityRow {
  id: number;
  text: string;
  sub: string;
  kind: ActivityKind;
  cityKey: string;
  age: number; // seconds since it landed
}

let __actSeq = 0;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function makeActivity(): ActivityRow {
  const host = pick(HOSTS);
  const runner = pick(RUNNER_NAMES);
  const template = pick(ACTIVITY_TEMPLATES);
  const built = template.build(host, runner);
  return {
    id: __actSeq++,
    text: built.text,
    sub: built.sub,
    kind: template.kind,
    cityKey: host.cityKey,
    age: 0,
  };
}

function useActivityFeed() {
  // Seed with 6 rows so the panel isn't blank on first paint.
  const [rows, setRows] = useState<ActivityRow[]>(() =>
    Array.from({ length: 6 }, () => {
      const a = makeActivity();
      a.age = 5 + Math.floor(Math.random() * 90);
      return a;
    })
  );
  const [pulseCity, setPulseCity] = useState<string | null>(null);
  const [cityLive, setCityLive] = useState<Record<string, number>>(
    () => Object.fromEntries(CITY_DOTS.map((c) => [c.key, c.live]))
  );

  // Age counter: every row's "12s ago" ticks upward at 1Hz.
  useEffect(() => {
    const id = setInterval(
      () => setRows((prev) => prev.map((r) => ({ ...r, age: r.age + 1 }))),
      1000
    );
    return () => clearInterval(id);
  }, []);

  // Streamer: recursive setTimeout with jitter so gaps feel human, not robotic.
  useEffect(() => {
    let cancelled = false;
    let handle: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      const delay = 2800 + Math.random() * 2200;
      handle = setTimeout(() => {
        if (cancelled) return;
        const next = makeActivity();
        setRows((prev) => [next, ...prev].slice(0, 7));
        setPulseCity(next.cityKey);
        setCityLive((prev) => ({ ...prev, [next.cityKey]: (prev[next.cityKey] ?? 0) + 1 }));
        setTimeout(() => setPulseCity(null), 1400);
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => { cancelled = true; if (handle) clearTimeout(handle); };
  }, []);

  return { rows, pulseCity, cityLive };
}

// ── Presentational atoms ──────────────────────────────────────────────────

function formatAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  const min = Math.floor(seconds / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}

const KIND_META: Record<ActivityKind, { dot: string; label: string }> = {
  post:    { dot: "var(--color-primary)",  label: "POST" },
  hire:    { dot: "var(--color-primary)",  label: "HIRE" },
  fill:    { dot: "var(--color-primary)",  label: "FILL" },
  checkin: { dot: "var(--color-secondary)", label: "CHECK-IN" },
  rating:  { dot: "var(--color-amber)",    label: "RATED" },
  level:   { dot: "var(--color-amber)",    label: "LEVEL" },
  pay:     { dot: "var(--color-primary)",  label: "PAID" },
  accept:  { dot: "var(--color-secondary)", label: "ACCEPT" },
};

export default function LoginPage() {
  const router = useRouter();

  /* ── Theme ── */
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setTheme(current === "light" ? "light" : "dark");
  }, []);
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("kria-grid-theme", next);
  };

  /* ── Auth state (unchanged from prior version) ── */
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const otp = otpDigits.join("");

  const verifyOtp = useCallback(
    async (code: string) => {
      if (loading) return;
      setError("");
      setLoading(true);
      const { data, error: err } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code,
        type: "email",
      });
      if (err) { setLoading(false); setError(err.message); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", data.user!.id)
        .single();
      router.replace(profile?.first_name ? "/dashboard" : "/onboarding");
    },
    [email, loading, router]
  );

  useEffect(() => {
    if (otp.length === 6 && !loading) verifyOtp(otp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !email.includes("@")) { setError("Enter a valid email address."); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setCooldown(RESEND_COOLDOWN);
    setStep("otp");
    setTimeout(() => otpRefs.current[0]?.focus(), 50);
  };

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    setError("");
    setOtpDigits(["", "", "", "", "", ""]);
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setCooldown(RESEND_COOLDOWN);
    otpRefs.current[0]?.focus();
  };

  const goBack = () => {
    setError("");
    setOtpDigits(["", "", "", "", "", ""]);
    setStep("email");
  };

  const handleOtpChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    setOtpDigits((prev) => { const next = [...prev]; next[i] = digit; return next; });
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
      setOtpDigits((prev) => { const next = [...prev]; next[i - 1] = ""; return next; });
    }
  };

  /* ── Live feed ── */
  const { rows, pulseCity, cityLive } = useActivityFeed();

  /* ── IST clock (kept from prior; drives the right-panel pulse strip) ── */
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const clock = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(clock);
  }, []);
  const istTime = now
    ? new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })
        .format(now)
        .toLowerCase()
    : "";

  /* ── Interactive mini-demo (one condensed section, was 4 scenes) ── */
  const [demoStep, setDemoStep] = useState<"post" | "applying" | "hired">("post");
  const [demoRole, setDemoRole] = useState("");
  const publishDemo = () => {
    setDemoRole(demoRole || "Banquet service crew");
    setDemoStep("applying");
    setTimeout(() => setDemoStep("hired"), 1600);
  };
  const resetDemo = () => { setDemoRole(""); setDemoStep("post"); };

  /* ── Totals for stats strip ── */
  const totalLive = useMemo(
    () => Object.values(cityLive).reduce((a, b) => a + b, 0),
    [cityLive]
  );

  return (
    <div style={{
      background: "var(--color-bg)",
      color: "var(--color-text)",
      fontFamily: "Inter, system-ui, sans-serif",
      minHeight: "100vh",
    }}>
      <style>{`
        @keyframes gridBlink { 0%,45% { opacity: 1 } 50%,95% { opacity: 0 } 100% { opacity: 1 } }
        @keyframes gridPulse {
          0% { box-shadow: 0 0 0 0 rgba(212,255,0,0.5) }
          70% { box-shadow: 0 0 0 8px rgba(212,255,0,0) }
          100% { box-shadow: 0 0 0 0 rgba(212,255,0,0) }
        }
        @keyframes gridRise {
          0%   { opacity: 0; transform: translateY(-14px); }
          6%   { opacity: 1; transform: translateY(0); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes gridFlash {
          0%   { transform: scale(1);   opacity: 0.6; }
          50%  { transform: scale(3);   opacity: 0; }
          100% { transform: scale(3);   opacity: 0; }
        }

        .grid-shell { display: grid; grid-template-columns: minmax(0,1fr) minmax(340px,480px); min-height: 100vh; }
        .grid-auth-col { position: relative; border-left: 1px solid var(--border-color); background: var(--color-surface-1); }
        .grid-auth-inner { position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; justify-content: center; gap: 32px; padding: 36px 40px; min-width: 0; max-width: 460px; margin: 0 auto; }
        .grid-story-col { display: flex; flex-direction: column; min-width: 0; }
        .grid-header, .grid-footer { display: flex; align-items: center; padding: 22px 40px; flex-shrink: 0; }
        .grid-story-body { padding: 8px 40px 40px 40px; display: flex; flex-direction: column; gap: 72px; flex: 1; }

        /* Section grids */
        .hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; align-items: stretch; }
        .map-grid  { display: grid; grid-template-columns: minmax(0,1.1fr) minmax(0,0.9fr); gap: 32px; align-items: start; }
        .pillars   { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .stats-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; overflow: hidden; }

        @media (max-width: 1023px) {
          .grid-shell { grid-template-columns: 1fr; }
          .grid-story-col { order: 2; }
          .grid-auth-col { order: 1; border-left: none; border-bottom: 1px solid var(--border-color); }
          .grid-auth-inner { position: relative; top: auto; height: auto; gap: 24px; max-width: 520px; padding: 30px 24px; }
          .grid-header { padding: 20px 24px; }
          .grid-story-body { padding: 4px 24px 32px 24px; gap: 56px; }
          .grid-footer { padding: 20px 24px; }
          .hero-grid { grid-template-columns: 1fr; gap: 24px; }
          .map-grid  { grid-template-columns: 1fr; gap: 24px; }
          .pillars   { grid-template-columns: 1fr; }
          .stats-strip { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .grid-header { padding-left: 18px; padding-right: 18px; }
          .grid-story-body { padding-left: 18px; padding-right: 18px; }
          .grid-auth-inner { padding: 24px 18px; }
        }

        .grid-otp-input:focus  { border-color: var(--color-primary) !important; }
        .grid-email-input:focus{ border-color: var(--color-primary) !important; }
      `}</style>

      <div className="grid-shell">
        {/* ═══════════════════════════════════════════════════════════════════
            LEFT — story column
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="grid-story-col">

          {/* ── Header ── */}
          <div className="grid-header" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 26, height: 26, background: "var(--color-primary)", borderRadius: 6, display: "grid", placeItems: "center" }}>
                <div style={{ width: 12, height: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  {[0, 1, 2, 3].map((k) => <div key={k} style={{ background: "var(--color-text-inv)", borderRadius: 1 }} />)}
                </div>
              </div>
              <span style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 19, letterSpacing: "-0.02em" }}>grid</span>
              <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 500, border: "1px solid var(--border-color)", borderRadius: 999, padding: "2px 8px", marginLeft: 2 }}>
                by Kria
              </span>
            </div>
            <button
              onClick={toggleTheme}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "1px solid var(--border-color)", borderRadius: 999, padding: "6px 14px", color: "var(--color-text-sub)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-primary)" }} />
              {theme === "dark" ? "Dark" : "Light"}
            </button>
          </div>

          <div className="grid-story-body">

            {/* ═════ 1. Hero — headline + live feed panel ═════ */}
            <section className="hero-grid">
              <div style={{ display: "flex", flexDirection: "column", gap: 22, justifyContent: "center" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-primary)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-primary)", animation: "gridPulse 2s infinite" }} />
                  Live across 10 Indian cities
                </div>
                <h1 style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: "clamp(38px,4.6vw,52px)", lineHeight: 1.08, margin: 0, letterSpacing: "-0.02em" }}>
                  Hire in <span style={{ color: "var(--color-primary)" }}>minutes.</span><br />Verify at the door.
                </h1>
                <p style={{ fontSize: 17, lineHeight: 1.65, color: "var(--color-text-sub)", margin: 0, maxWidth: 480 }}>
                  Grid is Kria&apos;s hiring dashboard for shift and event work. Post the role, review runners with a verified performance history, hire in minutes, and confirm attendance on-site with a one-time code. No agency. No middlemen.
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
                  <a
                    href="mailto:support@trykria.com"
                    style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--color-primary)", color: "var(--color-text-inv)", border: "none", borderRadius: 999, padding: "11px 20px", fontSize: 13.5, fontWeight: 700, textDecoration: "none" }}
                  >
                    Talk to us <span>→</span>
                  </a>
                  <span style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>
                    Free to start · No credit card
                  </span>
                </div>
              </div>

              {/* Live activity panel */}
              <div style={{
                background: "var(--color-surface-1)",
                border: "1px solid var(--border-color)",
                borderRadius: 16,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                boxShadow: "var(--card-shadow, none)",
                minHeight: 420,
              }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-primary)", animation: "gridPulse 2s infinite" }} />
                    <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Live now across India</span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontFamily: "ui-monospace, monospace" }}>
                    {istTime && `${istTime} IST`}
                  </span>
                </div>
                <div style={{ padding: "8px 6px", display: "flex", flexDirection: "column", flex: 1 }}>
                  {rows.map((r) => {
                    const meta = KIND_META[r.kind];
                    return (
                      <div
                        key={r.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "auto 1fr auto",
                          gap: 12,
                          alignItems: "center",
                          padding: "10px 12px",
                          borderRadius: 8,
                          animation: "gridRise 0.5s ease",
                        }}
                      >
                        <span
                          style={{
                            width: 8, height: 8, borderRadius: "50%",
                            background: meta.dot,
                            boxShadow: `0 0 10px ${meta.dot}`,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text)", lineHeight: 1.35 }}>{r.text}</div>
                          <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 2 }}>{r.sub}</div>
                        </div>
                        <div style={{ fontSize: 10.5, color: "var(--color-text-muted)", fontFamily: "ui-monospace, monospace", whiteSpace: "nowrap" }}>
                          {formatAge(r.age)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* ═════ 2. Stats strip ═════ */}
            <section className="stats-strip" style={{ border: "1px solid var(--border-color)", background: "var(--border-color)", borderRadius: 14, overflow: "hidden" }}>
              {[
                { val: totalLive.toLocaleString("en-IN"), sub: "Gigs live today across India" },
                { val: "12,418",                          sub: "Verified runners on the platform" },
                { val: "94.2%",                           sub: "OTP-confirmed show-up rate" },
                { val: "8m 12s",                          sub: "Median time from post → hired" },
              ].map((s) => (
                <div key={s.sub} style={{ background: "var(--color-surface-1)", padding: "22px 20px" }}>
                  <div style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 26, color: "var(--color-text)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{s.val}</div>
                  <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 8, lineHeight: 1.4 }}>{s.sub}</div>
                </div>
              ))}
            </section>

            {/* ═════ 3. India map + city rankings ═════ */}
            <section>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--color-secondary)" }} />
                Where runners are working
              </div>
              <h2 style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 30, margin: 0, marginBottom: 22, lineHeight: 1.2 }}>
                Live in <span style={{ color: "var(--color-primary)" }}>10 cities</span>, growing every week
              </h2>
              <div className="map-grid">
                {/* Map */}
                <div style={{ background: "var(--color-surface-1)", border: "1px solid var(--border-color)", borderRadius: 16, padding: 18, boxShadow: "var(--card-shadow, none)" }}>
                  <svg viewBox="0 0 400 500" style={{ width: "100%", height: "auto", display: "block" }}>
                    {/* India silhouette — stylized soft blob */}
                    <path
                      d="M 175 32
                         C 208 26, 250 44, 268 76
                         C 288 100, 296 132, 292 160
                         C 288 190, 306 220, 316 258
                         C 322 288, 312 316, 300 340
                         C 282 370, 260 396, 240 420
                         C 220 434, 202 428, 192 412
                         C 174 384, 148 380, 128 372
                         C 108 360, 96 336, 90 300
                         C 82 264, 84 226, 92 190
                         C 100 156, 112 116, 132 84
                         C 148 58, 158 40, 175 32 Z"
                      fill="none"
                      stroke="var(--border-color)"
                      strokeWidth="1"
                      strokeDasharray="3 4"
                    />
                    {/* City dots */}
                    {CITY_DOTS.map((c) => {
                      const isPulsing = pulseCity === c.key;
                      const live = cityLive[c.key] ?? c.live;
                      const isTier1 = ["mum", "blr", "delhi"].includes(c.key);
                      return (
                        <g key={c.key} transform={`translate(${c.x} ${c.y})`}>
                          {isPulsing && (
                            <circle
                              r={isTier1 ? 6 : 5}
                              fill="var(--color-primary)"
                              opacity="0.6"
                              style={{ animation: "gridFlash 1.2s ease-out" }}
                            />
                          )}
                          <circle
                            r={isTier1 ? 5 : 4}
                            fill="var(--color-primary)"
                            style={{ filter: `drop-shadow(0 0 ${isTier1 ? 6 : 4}px var(--color-primary))` }}
                          />
                          <text
                            x={c.x > 240 ? 10 : (c.x < 140 ? -10 : 10)}
                            y="4"
                            textAnchor={c.x > 240 ? "start" : (c.x < 140 ? "end" : "start")}
                            fontSize="10"
                            fontFamily="ui-monospace, monospace"
                            fill="var(--color-text-sub)"
                          >
                            {c.label} <tspan fill="var(--color-primary)" fontWeight="700">{live}</tspan>
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* City breakdown */}
                <div style={{ background: "var(--color-surface-1)", border: "1px solid var(--border-color)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--card-shadow, none)" }}>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text)" }}>Gigs live now</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>10 cities</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {[...CITY_DOTS]
                      .sort((a, b) => (cityLive[b.key] ?? 0) - (cityLive[a.key] ?? 0))
                      .map((c) => {
                        const n = cityLive[c.key] ?? c.live;
                        const max = Math.max(...CITY_DOTS.map((x) => cityLive[x.key] ?? x.live));
                        const pct = max > 0 ? (n / max) * 100 : 0;
                        return (
                          <div key={c.key} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "center", padding: "10px 18px", borderTop: "1px solid var(--border-subtle)" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>{c.label}</span>
                            <div style={{ width: 100, height: 3, background: "var(--color-surface-3)", borderRadius: 999, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: "var(--color-primary)", transition: "width 400ms" }} />
                            </div>
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-text)", fontVariantNumeric: "tabular-nums", minWidth: 26, textAlign: "right" }}>{n}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </section>

            {/* ═════ 4. How Grid works — 3 pillar cards ═════ */}
            <section>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--color-primary)" }} />
                How Grid works
              </div>
              <h2 style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 30, margin: 0, marginBottom: 22, lineHeight: 1.2 }}>
                Three steps. That&apos;s the whole thing.
              </h2>

              <div className="pillars">
                {[
                  { n: "01", title: "Post the role",     copy: "Tell us what you need and when. A banquet crew for Saturday, two loaders for tonight. Takes a minute." },
                  { n: "02", title: "Hire verified",     copy: "Every runner carries a Momentum score built from finished gigs. See who showed up, who was on-time, who to trust." },
                  { n: "03", title: "Verify at the door", copy: "On the day, workers confirm arrival with a one-time code at your venue. No clipboards. No phone chase." },
                ].map((p) => (
                  <div key={p.n} style={{
                    background: "var(--color-surface-1)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 14,
                    padding: "22px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    boxShadow: "var(--card-shadow, none)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "var(--color-text-muted)", letterSpacing: "0.1em" }}>{p.n}</span>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-primary)" }} />
                    </div>
                    <div style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 18, lineHeight: 1.25 }}>{p.title}</div>
                    <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--color-text-sub)", margin: 0 }}>{p.copy}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ═════ 5. Interactive mini-demo ═════ */}
            <section>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--color-amber)" }} />
                Try it right here
              </div>
              <h2 style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 30, margin: 0, marginBottom: 22, lineHeight: 1.2 }}>
                Post a mock gig. Watch it fill.
              </h2>
              <div style={{
                background: "var(--color-surface-1)",
                border: "1px solid var(--border-color)",
                borderRadius: 16,
                padding: 22,
                display: "flex",
                flexDirection: "column",
                gap: 16,
                maxWidth: 560,
                boxShadow: "var(--card-shadow, none)",
              }}>
                {/* Form */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 130px auto", gap: 10, alignItems: "end" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.05em" }}>ROLE</label>
                    <input
                      value={demoRole}
                      onChange={(e) => setDemoRole(e.target.value)}
                      placeholder="Banquet service crew"
                      disabled={demoStep !== "post"}
                      style={{ background: "var(--color-surface-2)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "10px 12px", fontSize: 13.5, color: "var(--color-text)", outline: "none" }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.05em" }}>PAY</label>
                    <div style={{ background: "var(--color-surface-2)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "10px 12px", fontSize: 13.5, color: "var(--color-text-sub)" }}>₹1,100/shift</div>
                  </div>
                  {demoStep === "post" ? (
                    <button
                      onClick={publishDemo}
                      style={{ background: "var(--color-primary)", color: "var(--color-text-inv)", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", height: 40 }}
                    >
                      Publish
                    </button>
                  ) : (
                    <button
                      onClick={resetDemo}
                      style={{ background: "var(--color-surface-2)", color: "var(--color-text-sub)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", height: 40 }}
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Response area */}
                {demoStep === "post" && (
                  <p style={{ fontSize: 12.5, color: "var(--color-text-muted)", margin: 0, lineHeight: 1.55 }}>
                    Fill the role and hit Publish. We&apos;ll simulate applications coming in — no sign-up needed for this bit.
                  </p>
                )}
                {demoStep === "applying" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--color-text-sub)" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-primary)", animation: "gridPulse 1s infinite" }} />
                    Applications coming in for “{demoRole || "Banquet service crew"}”…
                  </div>
                )}
                {demoStep === "hired" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>3 applications · sorted by Momentum</div>
                    {[
                      { name: "Priya Sharma", meta: "38 gigs · Mumbai",     score: 812, band: "Elite",    bandVar: "--band-elite" },
                      { name: "Arjun Mehta",  meta: "21 gigs · Thane",      score: 704, band: "Trusted",  bandVar: "--band-trusted" },
                      { name: "Kavya Nair",   meta: "12 gigs · Navi Mumbai", score: 631, band: "Reliable", bandVar: "--band-reliable" },
                    ].map((a) => (
                      <div key={a.name} style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto auto",
                        gap: 12,
                        alignItems: "center",
                        background: "var(--color-surface-2)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: 10,
                        padding: "10px 14px",
                      }}>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{a.name}</div>
                          <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>{a.meta}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: `var(${a.bandVar})`, fontVariantNumeric: "tabular-nums" }}>{a.score}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)" }}>{a.band}</div>
                        </div>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--color-primary)", background: "color-mix(in srgb, var(--color-primary) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)", borderRadius: 999, padding: "4px 10px" }}>Hire</span>
                      </div>
                    ))}
                    <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", marginTop: 4 }}>
                      This is what your dashboard looks like. Ready to try it for real? Sign in →
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ═════ 6. Dashboard mockup ═════ */}
            <section>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--color-primary)" }} />
                What you&apos;ll actually use
              </div>
              <h2 style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 30, margin: 0, marginBottom: 22, lineHeight: 1.2 }}>
                One dashboard. Every gig, applicant, and shift.
              </h2>
              <div style={{
                border: "1px solid var(--border-color)",
                borderRadius: 16,
                overflow: "hidden",
                background: "var(--color-surface-1)",
                boxShadow: "var(--card-shadow, none)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)", background: "var(--color-surface-2)" }}>
                  {["#ff7351", "#ffeb9c", "#8097ff"].map((c) => (
                    <span key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.7 }} />
                  ))}
                  <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)", background: "var(--color-surface-3)", borderRadius: 999, padding: "3px 12px" }}>
                      grid.trykria.com/dashboard
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", minHeight: 260 }}>
                  <div style={{ width: 140, flexShrink: 0, borderRight: "1px solid var(--border-subtle)", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                    {["Dashboard", "Gigs", "Events", "Applications", "Analytics"].map((label, i) => (
                      <div key={label} style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        padding: "8px 10px",
                        borderRadius: 6,
                        background: i === 0 ? "color-mix(in srgb, var(--color-primary) 12%, transparent)" : "transparent",
                        color: i === 0 ? "var(--color-primary)" : "var(--color-text-muted)",
                      }}>
                        {label}
                      </div>
                    ))}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                      {[
                        { label: "Active gigs", val: "4" },
                        { label: "Applicants", val: "18" },
                        { label: "This week", val: "6" },
                        { label: "Paid", val: "₹68K" },
                      ].map((s) => (
                        <div key={s.label} style={{ background: "var(--color-surface-2)", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: "10px 12px" }}>
                          <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "var(--font-comfortaa), sans-serif", fontVariantNumeric: "tabular-nums" }}>{s.val}</div>
                          <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 3, letterSpacing: "0.04em" }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    {[
                      { title: "Banquet service crew", meta: "Sat · Bandra · 3/5 slots", status: "Filling", color: "var(--color-amber)" },
                      { title: "Warehouse loaders",    meta: "Tonight · Peenya · 2/2 slots", status: "Full", color: "var(--color-primary)" },
                      { title: "Wedding hostess",      meta: "Sun · Juhu · 6/8 slots", status: "Live", color: "var(--color-secondary)" },
                    ].map((g) => (
                      <div key={g.title} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--color-surface-2)", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: "10px 14px" }}>
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 600 }}>{g.title}</div>
                          <div style={{ fontSize: 10.5, color: "var(--color-text-muted)", marginTop: 2 }}>{g.meta}</div>
                        </div>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: g.color, background: `color-mix(in srgb, ${g.color} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${g.color} 25%, transparent)`, borderRadius: 999, padding: "4px 10px" }}>{g.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--color-text-sub)", margin: 0, marginTop: 18, maxWidth: 520 }}>
                Nothing to install. Sign in on the right with your email — your first gig can be live today.
              </p>
            </section>

          </div>

          {/* ── Footer ── */}
          <div className="grid-footer" style={{ borderTop: "1px solid var(--border-subtle)", gap: 24, fontSize: 12.5, color: "var(--color-text-muted)", flexWrap: "wrap" }}>
            <span>© 2026 Kria</span>
            <a href="https://trykria.com" target="_blank" rel="noopener noreferrer">trykria.com</a>
            <a href="https://trykria.com/terms" target="_blank" rel="noopener noreferrer">Terms</a>
            <a href="https://trykria.com/privacy" target="_blank" rel="noopener noreferrer">Privacy</a>
            <a href="mailto:support@trykria.com">Contact</a>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            RIGHT — sticky sign-in (unchanged from prior)
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="grid-auth-col">
          <div className="grid-auth-inner">
            {/* Compact pulse strip */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 600, color: "var(--color-text-sub)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-primary)", animation: "gridPulse 2s infinite" }} />
                {totalLive.toLocaleString("en-IN")} gigs live now
              </div>
              <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", fontVariantNumeric: "tabular-nums" }}>{istTime} IST</div>
            </div>

            {/* Sign-in card */}
            <div style={{ background: "var(--color-bg)", border: "1px solid var(--border-color)", borderRadius: 16, padding: 30, display: "flex", flexDirection: "column", gap: 22, boxShadow: "var(--card-shadow-strong, none)" }}>
              {step === "email" && (
                <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 22 }}>Sign in to Grid</div>
                    <div style={{ fontSize: 13.5, color: "var(--color-text-sub)", lineHeight: 1.6 }}>
                      Enter your email. We&apos;ll send a one-time code, so there&apos;s no password to remember.
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <input
                      className="grid-email-input"
                      type="email"
                      inputMode="email"
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      style={{ background: "var(--color-surface-1)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "14px 16px", fontSize: 15, color: "var(--color-text)", outline: "none" }}
                    />
                    {error && <p style={{ fontSize: 13, color: "var(--color-error)", margin: 0 }}>{error}</p>}
                    <button
                      type="submit"
                      disabled={loading}
                      style={{ background: "var(--color-primary)", color: "var(--color-text-inv)", border: "none", fontSize: 15, fontWeight: 700, padding: 14, borderRadius: 10, cursor: "pointer", opacity: loading ? 0.6 : 1 }}
                    >
                      {loading ? "Sending…" : "Email me a code"}
                    </button>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", lineHeight: 1.6 }}>
                    New to Kria? Same door. We&apos;ll set up your host account after your first sign-in.
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", lineHeight: 1.6 }}>
                    By continuing, you agree to Kria&apos;s{" "}
                    <a href="https://trykria.com/terms" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text-sub)", textDecoration: "underline" }}>
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="https://trykria.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text-sub)", textDecoration: "underline" }}>
                      Privacy Policy
                    </a>
                    .
                  </div>
                </form>
              )}

              {step === "otp" && (
                <form onSubmit={(e) => { e.preventDefault(); if (otp.length === 6) verifyOtp(otp); }} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 22 }}>Check your inbox</div>
                    <div style={{ fontSize: 13.5, color: "var(--color-text-sub)", lineHeight: 1.6 }}>
                      We sent a 6-digit code to {email}. Enter it here and you&apos;re in.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {otpDigits.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        className="grid-otp-input"
                        maxLength={1}
                        inputMode="numeric"
                        value={d}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        style={{ width: 40, height: 50, textAlign: "center", background: "var(--color-surface-1)", border: "1px solid var(--border-color)", borderRadius: 10, fontFamily: "ui-monospace, monospace", fontSize: 19, fontWeight: 700, color: "var(--color-text)", outline: "none" }}
                      />
                    ))}
                  </div>
                  {error && <p style={{ fontSize: 13, color: "var(--color-error)", margin: 0 }}>{error}</p>}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <button
                      type="button"
                      onClick={goBack}
                      style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}
                    >
                      Use a different email
                    </button>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={cooldown > 0 || loading}
                      style={{ background: "transparent", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, color: cooldown > 0 ? "var(--color-text-muted)" : "var(--color-primary)", opacity: cooldown > 0 || loading ? 0.6 : 1 }}
                    >
                      {cooldown > 0 ? `Resend (${cooldown}s)` : "Resend"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Small trust line under card */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--color-text-muted)", justifyContent: "center" }}>
              <span>🇮🇳</span>
              <span>Made in India for India&apos;s shift & event economy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
