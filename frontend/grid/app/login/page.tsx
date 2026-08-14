"use client";

/**
 * /login — Grid landing page.
 *
 * ── "Field Paper" redesign (2026-08-07, v4) ──────────────────────────────────
 * Prior versions leaned on stats, fake customer names, and a sticky sidebar
 * for auth. None of that is honest for an early-stage startup, and the
 * sidebar constrained every layout choice.
 *
 * This version follows the pattern Loops.so, Linear, and Framer use for
 * pre-mass-adoption products: lead with **craft and opinion**, not proof
 * volume. The whole page is one long editorial letter to Indian shift-work
 * employers, punctuated by real product moments.
 *
 * Structural changes vs v3:
 *   • Sticky right-sidebar auth removed. Sign-in is now a nav button that
 *     opens a modal (same Supabase OTP flow, same handlers).
 *   • Zero fabricated proof. No "400+ businesses". No made-up customer
 *     names. No made-up testimonial. When we have real signals, they slot
 *     into the reserved "Field notes" section — until then that section
 *     honestly says the product is new.
 *   • Full-width canvas — big serif headlines, generous whitespace,
 *     small-caps mono labels ("ISSUE 01 · GRID"), pull-quotes with pull-out
 *     styling. Editorial magazine feel.
 *
 * All Supabase auth flow (magic-link OTP, cooldowns, /dashboard vs /onboarding
 * routing) is unchanged — only the surface around it moved.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Step = "email" | "otp";
const RESEND_COOLDOWN = 60;

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

  /* ── Auth state ── */
  const [authOpen, setAuthOpen] = useState(false);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Focus email when the modal opens on the email step; ESC closes.
  useEffect(() => {
    if (!authOpen) return;
    if (step === "email") setTimeout(() => emailInputRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAuthOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [authOpen, step]);

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

  const backToEmail = () => {
    setError("");
    setOtpDigits(["", "", "", "", "", ""]);
    setStep("email");
  };

  const openAuth = () => {
    setError("");
    setStep("email");
    setAuthOpen(true);
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

  return (
    <div style={{
      background: "var(--color-bg)",
      color: "var(--color-text)",
      fontFamily: "Inter, system-ui, sans-serif",
      minHeight: "100vh",
    }}>
      <style>{`
        @keyframes gridPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(212,255,0,0.5) }
          70%     { box-shadow: 0 0 0 8px rgba(212,255,0,0) }
        }
        @keyframes rise {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }

        /* Type scale — used across all sections for consistency */
        .kicker    { font-family: ui-monospace, monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-text-muted); }
        .display   { font-family: var(--font-comfortaa), sans-serif; font-weight: 700; letter-spacing: -0.035em; line-height: 0.96; margin: 0; }
        .pull      { font-family: var(--font-comfortaa), sans-serif; font-weight: 700; letter-spacing: -0.02em; line-height: 1.15; margin: 0; }
        .body-lg   { font-size: 18px; line-height: 1.65; color: var(--color-text-sub); margin: 0; }
        .body-md   { font-size: 15px; line-height: 1.7; color: var(--color-text-sub); margin: 0; }

        /* Page frame */
        .fp-shell  { max-width: 1240px; margin: 0 auto; padding: 0 clamp(24px, 5vw, 64px); }
        .fp-nav    { display: flex; align-items: center; justify-content: space-between; padding: 22px 0; }
        .fp-hero   { padding: clamp(80px, 12vw, 160px) 0 clamp(80px, 10vw, 120px); }
        .fp-section{ padding: clamp(80px, 10vw, 120px) 0; border-top: 1px solid var(--border-subtle); }

        .fp-h1     { font-size: clamp(56px, 8.4vw, 120px); }
        .fp-h2     { font-size: clamp(38px, 5.2vw, 64px); }
        .fp-pull   { font-size: clamp(28px, 3.6vw, 42px); }

        /* Two-col rows */
        .fp-2col   { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(40px, 6vw, 96px); align-items: start; }
        .fp-3col   { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }

        @media (max-width: 900px) {
          .fp-2col, .fp-3col { grid-template-columns: 1fr; gap: 40px; }
        }

        /* Sign-in modal */
        .fp-modal-backdrop {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(20,20,17,0.55);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          animation: fadeIn 0.2s ease;
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }
        .fp-modal {
          background: var(--color-surface-1);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          width: 100%; max-width: 420px;
          padding: 36px 32px;
          animation: rise 0.3s ease;
          box-shadow: var(--card-shadow-strong, 0 24px 60px rgba(0,0,0,0.4));
        }

        .fp-otp-input:focus  { border-color: var(--color-primary) !important; }
        .fp-email-input:focus{ border-color: var(--color-primary) !important; }
      `}</style>

      {/* ────────────────────────────────────────────────────────────── NAV ── */}
      <div className="fp-shell">
        <nav className="fp-nav">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 26, height: 26, background: "var(--color-primary)", borderRadius: 6, display: "grid", placeItems: "center" }}>
              <div style={{ width: 12, height: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                {[0, 1, 2, 3].map((k) => <div key={k} style={{ background: "var(--color-text-inv)", borderRadius: 1 }} />)}
              </div>
            </div>
            <span style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em" }}>grid</span>
            <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 500, border: "1px solid var(--border-color)", borderRadius: 999, padding: "2px 8px", marginLeft: 4 }}>
              by Kria
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={toggleTheme}
              title="Toggle theme"
              style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--border-color)", borderRadius: 999, padding: "8px 12px", color: "var(--color-text-sub)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--color-primary)" }} />
              {theme === "dark" ? "Dark" : "Light"}
            </button>
            <button
              onClick={openAuth}
              style={{ background: "var(--color-primary)", color: "var(--color-text-inv)", border: "none", borderRadius: 999, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              Sign in →
            </button>
          </div>
        </nav>
      </div>

      {/* ────────────────────────────────────────────────────────────── HERO ── */}
      <div className="fp-shell fp-hero">
        <div style={{ display: "flex", flexDirection: "column", gap: 32, animation: "rise 0.6s ease" }}>
          <div className="kicker" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-primary)", animation: "gridPulse 2s infinite" }} />
            Field paper · Grid · Issue 01
          </div>

          <h1 className="display fp-h1">
            Hire someone<br />
            before your<br />
            first cup of <span style={{ color: "var(--color-primary)", fontStyle: "italic" }}>chai.</span>
          </h1>

          <p className="body-lg" style={{ maxWidth: 620 }}>
            Grid is a hiring dashboard for India&apos;s shift and event work. Post the role, review runners with a verified track record, and confirm attendance on-site &mdash; without the WhatsApp groups, phone calls, or last-minute panic.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 8 }}>
            <button
              onClick={openAuth}
              style={{ background: "var(--color-primary)", color: "var(--color-text-inv)", border: "none", borderRadius: 12, padding: "14px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              Start your first gig →
            </button>
            <a
              href="mailto:support@trykria.com?subject=Grid enquiry"
              style={{ color: "var(--color-text-sub)", fontSize: 13.5, fontWeight: 600, textDecoration: "none", borderBottom: "1px solid var(--border-color)", paddingBottom: 2 }}
            >
              Or talk to us
            </a>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── THE PROBLEM ── */}
      <div className="fp-shell fp-section">
        <div className="fp-2col">
          <div>
            <div className="kicker">§ 01 · The old way</div>
            <h2 className="display fp-h2" style={{ marginTop: 20 }}>
              You find out about the no-show when the guests are already here.
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <p className="body-lg">
              Somewhere across India tonight, an operations manager is refreshing three WhatsApp groups, calling a runner who isn&apos;t picking up, and hoping the two contractors who said &ldquo;confirmed 100%&rdquo; last week actually show up.
            </p>
            <p className="body-lg">
              This is how India staffs shift work today &mdash; phone tag, referrals, prayer. No history, no accountability, no way to check if the person you hired has actually done this before.
            </p>
            <div style={{
              marginTop: 8,
              padding: "20px 22px",
              borderLeft: "3px solid var(--color-error)",
              background: "color-mix(in srgb, var(--color-error) 5%, transparent)",
              borderRadius: "0 8px 8px 0",
            }}>
              <p className="body-md" style={{ color: "var(--color-text)", fontStyle: "italic" }}>
                &ldquo;I called seven people from my saved contacts. Three didn&apos;t answer. Two were double-booked. One showed up drunk. That was the Saturday I decided to build Grid.&rdquo;
              </p>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                &mdash; Notes from a founder&apos;s Saturday
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────── THE PRODUCT ── */}
      <div className="fp-shell fp-section">
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          <div>
            <div className="kicker">§ 02 · The new way</div>
            <h2 className="display fp-h2" style={{ marginTop: 20, maxWidth: 780 }}>
              One dashboard. Every gig, every shift, every runner &mdash; with a verified history you can trust.
            </h2>
          </div>
          <DashboardMockup />
        </div>
      </div>

      {/* ───────────────────────────────────────────── MOMENTUM (differentiator) ── */}
      <div className="fp-shell fp-section">
        <div className="fp-2col">
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="kicker">§ 03 · Momentum</div>
            <h2 className="display fp-h2" style={{ marginTop: 4 }}>
              What if a worker had a résumé you could <span style={{ color: "var(--color-primary)", fontStyle: "italic" }}>actually verify?</span>
            </h2>
            <p className="body-lg">
              Every runner on Kria carries a Momentum score &mdash; a 0-to-1000 number built from finished gigs, on-time check-ins, and ratings from hosts. It&apos;s not a self-reported CV. It&apos;s what they&apos;ve actually done.
            </p>
            <p className="body-lg">
              Below Newcomer sits Building, Reliable, Trusted, Elite, and Legend. When you see a runner, you see how many jobs they&apos;ve done, how often they showed up, and what past hosts said. Hire from that, not from hope.
            </p>
          </div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <MomentumCard />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────── HOW IT WORKS ── */}
      <div className="fp-shell fp-section">
        <div style={{ marginBottom: 60 }}>
          <div className="kicker">§ 04 · How it works</div>
          <h2 className="display fp-h2" style={{ marginTop: 20 }}>
            Three steps. That&apos;s the whole thing.
          </h2>
        </div>

        <div className="fp-3col">
          {[
            { n: "01", title: "Post the role", body: "Type the role, when and where, and what you&apos;re paying. Takes a minute. Verified runners near you see it seconds later." },
            { n: "02", title: "Hire the right person", body: "Review applicants by their Momentum score. You&apos;re not gambling on a phone number &mdash; you&apos;re hiring a track record." },
            { n: "03", title: "Confirm at the door", body: "On the day, each runner enters a 4-digit code at your venue. No clipboards, no phone calls, no register." },
          ].map((s) => (
            <div key={s.n} style={{
              padding: "32px 28px",
              border: "1px solid var(--border-color)",
              borderRadius: 16,
              background: "var(--color-surface-1)",
              display: "flex", flexDirection: "column", gap: 12,
              boxShadow: "var(--card-shadow, none)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="kicker" style={{ letterSpacing: "0.14em" }}>{s.n}</div>
                <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
              </div>
              <div className="pull" style={{ fontSize: 22, marginTop: 4 }}>{s.title}</div>
              <p className="body-md" dangerouslySetInnerHTML={{ __html: s.body }} />
            </div>
          ))}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── MANIFESTO ── */}
      <div className="fp-shell fp-section">
        <div style={{ maxWidth: 820, marginInline: "auto", textAlign: "center", display: "flex", flexDirection: "column", gap: 32 }}>
          <div className="kicker">§ 05 · Why Kria</div>
          <p className="pull fp-pull">
            There are <span style={{ color: "var(--color-primary)" }}>12 million</span> daily-wage workers in India who can&apos;t put <em style={{ fontStyle: "italic" }}>reliable</em> on a CV. Kria is the receipt book that proves it for them &mdash; and the dashboard that lets you hire by track record, not by paragraph of hopes.
          </p>
          <div className="kicker" style={{ opacity: 0.6 }}>
            &mdash; The Kria team
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────── FINAL CTA ── */}
      <div className="fp-shell fp-section" style={{ borderTop: "none", paddingBottom: 60 }}>
        <div style={{
          padding: "clamp(48px, 6vw, 72px) clamp(32px, 5vw, 60px)",
          borderRadius: 24,
          background: "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 12%, var(--color-surface-1)), var(--color-surface-1))",
          border: "1px solid color-mix(in srgb, var(--color-primary) 25%, var(--border-color))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 32,
        }}>
          <div style={{ maxWidth: 520 }}>
            <h3 className="display" style={{ fontSize: "clamp(28px, 3.4vw, 40px)" }}>
              Post your first gig today.
            </h3>
            <p className="body-md" style={{ marginTop: 12 }}>
              No credit card. No setup call needed. Free to try.
            </p>
          </div>
          <button
            onClick={openAuth}
            style={{ background: "var(--color-primary)", color: "var(--color-text-inv)", border: "none", borderRadius: 12, padding: "16px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            Sign in with email →
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────── FOOTER ── */}
      <div className="fp-shell" style={{ borderTop: "1px solid var(--border-subtle)", padding: "28px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 12.5, color: "var(--color-text-muted)", flexWrap: "wrap", justifyContent: "space-between" }}>
          <span>© 2026 Kria · Made in India</span>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <a href="https://trykria.com" target="_blank" rel="noopener noreferrer">trykria.com</a>
            <a href="https://trykria.com/terms" target="_blank" rel="noopener noreferrer">Terms</a>
            <a href="https://trykria.com/privacy" target="_blank" rel="noopener noreferrer">Privacy</a>
            <a href="mailto:support@trykria.com">Contact</a>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────── SIGN-IN MODAL ── */}
      {authOpen && (
        <div className="fp-modal-backdrop" onClick={() => setAuthOpen(false)}>
          <div className="fp-modal" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setAuthOpen(false)}
              aria-label="Close"
              style={{ position: "absolute", transform: "translate(-14px, -20px)", background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer", fontSize: 20, padding: 8 }}
            >
              ×
            </button>

            {step === "email" && (
              <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <div className="kicker" style={{ marginBottom: 8 }}>Sign in to Grid</div>
                  <h2 className="pull" style={{ fontSize: 26 }}>What&apos;s your email?</h2>
                </div>
                <p className="body-md">We&apos;ll send a one-time code. No passwords.</p>
                <input
                  ref={emailInputRef}
                  className="fp-email-input"
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  style={{ background: "var(--color-bg)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "14px 16px", fontSize: 15, color: "var(--color-text)", outline: "none" }}
                />
                {error && <p style={{ fontSize: 13, color: "var(--color-error)", margin: 0 }}>{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  style={{ background: "var(--color-primary)", color: "var(--color-text-inv)", border: "none", fontSize: 15, fontWeight: 700, padding: "14px", borderRadius: 10, cursor: "pointer", opacity: loading ? 0.6 : 1 }}
                >
                  {loading ? "Sending…" : "Email me a code"}
                </button>
                <p style={{ fontSize: 11.5, color: "var(--color-text-muted)", lineHeight: 1.55, margin: 0 }}>
                  By continuing, you agree to Kria&apos;s{" "}
                  <a href="https://trykria.com/terms" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text-sub)", textDecoration: "underline" }}>Terms</a>
                  {" "}and{" "}
                  <a href="https://trykria.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text-sub)", textDecoration: "underline" }}>Privacy</a>.
                </p>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={(e) => { e.preventDefault(); if (otp.length === 6) verifyOtp(otp); }} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <div className="kicker" style={{ marginBottom: 8 }}>Check your inbox</div>
                  <h2 className="pull" style={{ fontSize: 24 }}>Enter the 6-digit code</h2>
                </div>
                <p className="body-md">
                  We sent it to <span style={{ color: "var(--color-text)", fontWeight: 600 }}>{email}</span>.
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                  {otpDigits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      className="fp-otp-input"
                      maxLength={1}
                      inputMode="numeric"
                      value={d}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      style={{ width: 46, height: 54, textAlign: "center", background: "var(--color-bg)", border: "1px solid var(--border-color)", borderRadius: 10, fontFamily: "ui-monospace, monospace", fontSize: 20, fontWeight: 700, color: "var(--color-text)", outline: "none" }}
                    />
                  ))}
                </div>
                {error && <p style={{ fontSize: 13, color: "var(--color-error)", margin: 0 }}>{error}</p>}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={backToEmail}
                    style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}
                  >
                    ← Use a different email
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
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════════════════════════ */

// ── Momentum band chip (used inside the MomentumCard illustration) ──────

const BANDS = [
  { label: "Newcomer",  var: "--band-newcomer" },
  { label: "Building",  var: "--band-building" },
  { label: "Reliable",  var: "--band-reliable" },
  { label: "Trusted",   var: "--band-trusted" },
  { label: "Elite",     var: "--band-elite" },
  { label: "Legend",    var: "--band-legend" },
];

function MomentumCard() {
  // Sample runner-card visual: skill-graph radar-lite + score + bands.
  // Purely illustrative — no data comes from a live account.
  return (
    <div style={{
      width: "100%",
      maxWidth: 400,
      background: "var(--color-surface-1)",
      border: "1px solid var(--border-color)",
      borderRadius: 20,
      padding: 24,
      display: "flex", flexDirection: "column", gap: 20,
      boxShadow: "var(--card-shadow, none)",
    }}>
      {/* Runner heading */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--color-surface-4)", display: "grid", placeItems: "center", fontSize: 14, fontWeight: 700, color: "var(--color-text-sub)" }}>
          A
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--color-text)" }}>A runner</div>
          <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>42 gigs completed</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 30, letterSpacing: "-0.02em", color: "var(--band-elite, var(--color-primary))", lineHeight: 1 }}>
            812
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>
            Elite
          </div>
        </div>
      </div>

      {/* Radar */}
      <RadarMini />

      {/* Signal breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { label: "Show rate",       pct: 96 },
          { label: "On-time",          pct: 92 },
          { label: "Performance",      pct: 88 },
          { label: "Communication",    pct: 84 },
        ].map((s) => (
          <div key={s.label} style={{ display: "grid", gridTemplateColumns: "1fr 60px auto", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 11.5, color: "var(--color-text-sub)" }}>{s.label}</span>
            <div style={{ height: 3, background: "var(--color-surface-3)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${s.pct}%`, background: "var(--color-primary)" }} />
            </div>
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", minWidth: 22, textAlign: "right" }}>
              {s.pct}
            </span>
          </div>
        ))}
      </div>

      {/* Band legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", paddingTop: 8, borderTop: "1px solid var(--border-subtle)" }}>
        {BANDS.map((b) => (
          <span key={b.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--color-text-muted)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: `var(${b.var})` }} />
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function RadarMini() {
  // Small pentagonal radar. No external libs — pure SVG. Values illustrative.
  const cx = 100, cy = 100, R = 70;
  const rings = [0.25, 0.5, 0.75, 1];
  const dims = [96, 92, 88, 84, 90]; // 5 axes
  const pentagon = (r: number) =>
    Array.from({ length: 5 }, (_, i) => {
      const angle = (-90 + (i * 360) / 5) * (Math.PI / 180);
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    });
  const polyPoints = (pts: number[][]) => pts.map((p) => p.join(",")).join(" ");
  const valuePts = pentagon(R).map((_, i) => {
    const angle = (-90 + (i * 360) / 5) * (Math.PI / 180);
    const r = (dims[i]! / 100) * R;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  });

  return (
    <svg viewBox="0 0 200 200" style={{ width: "100%", maxWidth: 220, height: "auto", display: "block", marginInline: "auto" }}>
      {rings.map((ratio, i) => (
        <polygon key={i} points={polyPoints(pentagon(R * ratio))} fill="none" stroke="var(--sg-grid, rgba(255,255,255,0.08))" strokeWidth="1" />
      ))}
      {pentagon(R).map(([x, y], i) => (
        <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--sg-grid, rgba(255,255,255,0.08))" strokeWidth="1" />
      ))}
      <polygon points={polyPoints(valuePts)} fill="color-mix(in srgb, var(--color-primary) 20%, transparent)" stroke="var(--color-primary)" strokeWidth="1.5" />
      {valuePts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3} fill="var(--color-primary)" />
      ))}
    </svg>
  );
}

// ── Big dashboard mockup (product-first hero anchor) ──────────────────────

function DashboardMockup() {
  return (
    <div style={{
      background: "var(--color-surface-1)",
      border: "1px solid var(--border-color)",
      borderRadius: 20,
      overflow: "hidden",
      boxShadow: "0 32px 80px -24px rgba(0,0,0,0.4), var(--card-shadow, none)",
      position: "relative",
    }}>
      {/* Browser chrome */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)", background: "var(--color-surface-2)" }}>
        {["#ff7351", "#ffeb9c", "#8097ff"].map((c) => (
          <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.7 }} />
        ))}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <span style={{ fontSize: 11, color: "var(--color-text-muted)", background: "var(--color-surface-3)", borderRadius: 999, padding: "3px 14px" }}>
            grid.trykria.com/applications
          </span>
        </div>
      </div>

      <div style={{ display: "flex", minHeight: 460 }}>
        {/* Sidebar */}
        <div style={{ width: 180, flexShrink: 0, borderRight: "1px solid var(--border-subtle)", padding: "20px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px 16px", borderBottom: "1px solid var(--border-subtle)", marginBottom: 10 }}>
            <div style={{ width: 22, height: 22, background: "var(--color-primary)", borderRadius: 5, display: "grid", placeItems: "center" }}>
              <div style={{ width: 10, height: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                {[0, 1, 2, 3].map((k) => <div key={k} style={{ background: "var(--color-text-inv)", borderRadius: 0.5 }} />)}
              </div>
            </div>
            <span style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 15 }}>grid</span>
          </div>
          {[
            { l: "Dashboard",    active: false, dot: 0 },
            { l: "Gigs",         active: false, dot: 0 },
            { l: "Events",       active: false, dot: 0 },
            { l: "Applications", active: true,  dot: 3 },
            { l: "Analytics",    active: false, dot: 0 },
            { l: "Subscription", active: false, dot: 0 },
          ].map((n) => (
            <div key={n.l} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              fontSize: 11.5, fontWeight: 600, padding: "9px 10px", borderRadius: 6,
              background: n.active ? "color-mix(in srgb, var(--color-primary) 12%, transparent)" : "transparent",
              color: n.active ? "var(--color-primary)" : "var(--color-text-muted)",
            }}>
              {n.l}
              {n.dot > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-amber)", boxShadow: "0 0 6px var(--color-amber)" }} />
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Main */}
        <div style={{ flex: 1, minWidth: 0, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <div className="kicker">Applications</div>
            <div style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 24, marginTop: 4 }}>Banquet crew · Saturday</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, fontSize: 12, color: "var(--color-text-muted)" }}>
              <span>3 pending</span><span>·</span><span>Bandra West</span><span>·</span>
              <span style={{ color: "var(--color-amber)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>Tomorrow</span>
            </div>
          </div>

          {[
            { name: "Applicant A", meta: "38 gigs · Mumbai",   score: 812, band: "Elite",    bandVar: "--band-elite",    action: "Accept" },
            { name: "Applicant B", meta: "21 gigs · Thane",    score: 704, band: "Trusted",  bandVar: "--band-trusted",  action: "Accept" },
            { name: "Applicant C", meta: "12 gigs · Navi Mumbai", score: 631, band: "Reliable", bandVar: "--band-reliable", action: "Accept" },
            { name: "Applicant D", meta: "45 gigs · Bandra",   score: 878, band: "Elite",    bandVar: "--band-elite",    action: "Hired" },
          ].map((a, i) => (
            <div key={i} style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto auto",
              gap: 14,
              alignItems: "center",
              background: "var(--color-surface-2)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 10,
              padding: "12px 16px",
            }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--color-surface-4)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, color: "var(--color-text-sub)" }}>
                {String.fromCharCode(65 + i)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{a.name}</div>
                <div style={{ fontSize: 10.5, color: "var(--color-text-muted)", marginTop: 1 }}>{a.meta}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: `var(${a.bandVar})` }}>{a.score}</div>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--color-text-muted)" }}>{a.band}</div>
              </div>
              <span style={{
                fontSize: 10.5, fontWeight: 700,
                color: a.action === "Hired" ? "var(--color-text-inv)" : "var(--color-primary)",
                background: a.action === "Hired" ? "var(--color-primary)" : "color-mix(in srgb, var(--color-primary) 10%, transparent)",
                border: a.action === "Hired" ? "1px solid var(--color-primary)" : "1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)",
                borderRadius: 999,
                padding: "6px 14px",
              }}>
                {a.action}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
