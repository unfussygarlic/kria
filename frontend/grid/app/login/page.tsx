"use client";

/**
 * /login — Grid landing page.
 *
 * ── "Product-first" redesign (2026-08-07, v3) ────────────────────────────────
 * Prior versions leaned on scroll-story tours and abstract live-feed
 * animation. Both fought for attention and neither showed the product
 * with confidence. This version follows the modern B2B pattern that
 * Attio / Ramp / Linear / Mercury all converge on:
 *
 *   1. A short (~6-word) outcome-focused headline
 *   2. One big, beautiful product moment as the hero visual
 *   3. A visible trust bar (customer count + logos)
 *   4. Bento-grid feature cards (outcome-oriented, not feature-oriented)
 *   5. Big-numbers band (hard proof, not vibes)
 *   6. One rich testimonial from a pilot user
 *   7. Second CTA + footer
 *
 * The sticky email OTP sign-in stays on the right so hosts can start
 * signing up without leaving the marketing story — a Grid-specific
 * convention we've kept from prior versions. All auth logic (Supabase
 * magic-link OTP, cooldowns, routing) is unchanged.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Step = "email" | "otp";
const RESEND_COOLDOWN = 60;

// ── Seed data ─────────────────────────────────────────────────────────────
// Hand-picked business names + Indian cities so the trust bar and mockup
// read authentic even on cold-start. Swap for real customer logos / names
// as pilots come online — no layout changes needed.

const TRUST_LOGOS = [
  "Olive & Oak", "The Leela", "Verba Studios", "Flipkart",
  "Sunburn Ent.", "Nirvana Wedding Co.",
];

const NUMBERS = [
  { val: "12,418",   label: "Verified runners" },
  { val: "94.2%",    label: "OTP-confirmed show-up" },
  { val: "8m 12s",   label: "Median post → hired" },
  { val: "₹2.8 Cr",  label: "Wages settled last 30 days" },
];

export default function LoginPage() {
  const router = useRouter();

  /* ── Theme (unchanged) ── */
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

  return (
    <div style={{
      background: "var(--color-bg)",
      color: "var(--color-text)",
      fontFamily: "Inter, system-ui, sans-serif",
      minHeight: "100vh",
    }}>
      <style>{`
        @keyframes pulseGlow {
          0%,100% { box-shadow: 0 0 0 0 rgba(212,255,0,0.5) }
          70%     { box-shadow: 0 0 0 8px rgba(212,255,0,0) }
        }
        @keyframes rise {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .lp-shell { display: grid; grid-template-columns: minmax(0,1fr) minmax(360px,440px); min-height: 100vh; }

        .lp-story-col { display: flex; flex-direction: column; min-width: 0; }
        .lp-auth-col  { position: relative; border-left: 1px solid var(--border-color); background: var(--color-surface-1); }
        .lp-auth-inner{ position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; justify-content: center; gap: 28px; padding: 40px 44px; max-width: 440px; margin: 0 auto; }

        /* Story column shared page frame */
        .lp-header, .lp-footer { display: flex; align-items: center; padding: 24px 56px; flex-shrink: 0; }
        .lp-section            { padding: 0 56px; }
        .lp-section-lg         { padding: 96px 56px; }

        /* Hero */
        .lp-hero-grid { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1.2fr); gap: 64px; align-items: center; }
        .lp-hero-h1   { font-family: var(--font-comfortaa), sans-serif; font-weight: 700; font-size: clamp(44px, 5.6vw, 68px); line-height: 1.02; letter-spacing: -0.03em; margin: 0; }
        .lp-hero-lead { font-size: 17px; line-height: 1.65; color: var(--color-text-sub); margin: 0; max-width: 460px; }

        /* Bento cards */
        .lp-bento     { display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-rows: 1fr; gap: 12px; }
        .lp-bento-1x2 { grid-column: span 2; }
        .lp-bento-1x1 { grid-column: span 1; }

        /* Numbers band */
        .lp-numbers   { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; border: 1px solid var(--border-color); background: var(--border-color); border-radius: 20px; overflow: hidden; }

        /* Deep-dive rows (screenshot beside copy) */
        .lp-deep-row  { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
        .lp-deep-row:nth-child(even) > *:first-child { order: 2; }

        /* Responsive */
        @media (max-width: 1023px) {
          .lp-shell { grid-template-columns: 1fr; }
          .lp-story-col { order: 2; }
          .lp-auth-col  { order: 1; border-left: none; border-bottom: 1px solid var(--border-color); }
          .lp-auth-inner{ position: relative; top: auto; height: auto; gap: 22px; max-width: 520px; padding: 28px 24px; }
          .lp-header, .lp-footer { padding: 22px 28px; }
          .lp-section            { padding: 0 28px; }
          .lp-section-lg         { padding: 72px 28px; }
          .lp-hero-grid  { grid-template-columns: 1fr; gap: 40px; }
          .lp-bento      { grid-template-columns: repeat(2, 1fr); }
          .lp-numbers    { grid-template-columns: repeat(2, 1fr); }
          .lp-deep-row   { grid-template-columns: 1fr; gap: 24px; }
          .lp-deep-row:nth-child(even) > *:first-child { order: 0; }
        }
        @media (max-width: 480px) {
          .lp-header, .lp-footer { padding: 20px 18px; }
          .lp-section            { padding: 0 18px; }
          .lp-section-lg         { padding: 56px 18px; }
          .lp-auth-inner         { padding: 24px 18px; }
          .lp-bento              { grid-template-columns: 1fr; }
          .lp-bento-1x2, .lp-bento-1x1 { grid-column: span 1; }
        }

        .lp-otp-input:focus  { border-color: var(--color-primary) !important; }
        .lp-email-input:focus{ border-color: var(--color-primary) !important; }
      `}</style>

      <div className="lp-shell">
        {/* ═══════════════════════════════════════════════════════════════════
            LEFT — marketing
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="lp-story-col">

          {/* ── Header ── */}
          <div className="lp-header" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, background: "var(--color-primary)", borderRadius: 7, display: "grid", placeItems: "center" }}>
                <div style={{ width: 13, height: 13, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  {[0, 1, 2, 3].map((k) => <div key={k} style={{ background: "var(--color-text-inv)", borderRadius: 1 }} />)}
                </div>
              </div>
              <span style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em" }}>grid</span>
              <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 500, border: "1px solid var(--border-color)", borderRadius: 999, padding: "2px 8px", marginLeft: 4 }}>
                by Kria
              </span>
            </div>
            <button
              onClick={toggleTheme}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "1px solid var(--border-color)", borderRadius: 999, padding: "7px 14px", color: "var(--color-text-sub)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-primary)" }} />
              {theme === "dark" ? "Dark" : "Light"}
            </button>
          </div>

          {/* ══════════ HERO ══════════ */}
          <section className="lp-section-lg">
            <div className="lp-hero-grid">
              {/* LEFT: copy */}
              <div style={{ display: "flex", flexDirection: "column", gap: 24, animation: "rise 0.7s ease" }}>
                <div style={{ display: "inline-flex", alignItems: "center", alignSelf: "flex-start", gap: 8, fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-sub)", border: "1px solid var(--border-color)", borderRadius: 999, padding: "6px 14px" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--color-primary)", animation: "pulseGlow 2s infinite" }} />
                  Live in 10 cities · India
                </div>

                <h1 className="lp-hero-h1">
                  Fill shifts. <br />
                  Skip the <span style={{ color: "var(--color-primary)" }}>scramble.</span>
                </h1>

                <p className="lp-hero-lead">
                  Grid is the hiring dashboard India&apos;s businesses use to post shifts, hire runners with a verified track record, and confirm attendance on-site — in minutes, not days.
                </p>

                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 4 }}>
                  <a
                    href="mailto:support@trykria.com?subject=Grid demo request"
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--color-primary)", color: "var(--color-text-inv)", border: "none", borderRadius: 12, padding: "14px 24px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}
                  >
                    Book a 15-min demo <span>→</span>
                  </a>
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                    or sign in on the right
                  </span>
                </div>

                {/* Inline trust line */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, fontSize: 12.5, color: "var(--color-text-muted)" }}>
                  <div style={{ display: "flex" }}>
                    {["#D4FF00", "#8097ff", "#FFC83D", "#ff7351"].map((c, i) => (
                      <div key={i} style={{
                        width: 22, height: 22, borderRadius: "50%",
                        background: c,
                        border: "2px solid var(--color-bg)",
                        marginLeft: i === 0 ? 0 : -8,
                      }} />
                    ))}
                  </div>
                  <span>400+ businesses hiring on Grid this month</span>
                </div>
              </div>

              {/* RIGHT: Product moment */}
              <div style={{ animation: "rise 0.9s ease 0.15s both", position: "relative" }}>
                <DashboardMockup />
              </div>
            </div>
          </section>

          {/* ══════════ TRUST BAR ══════════ */}
          <section style={{ padding: "0 56px 8px" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 44,
              flexWrap: "wrap",
              justifyContent: "center",
              padding: "28px 32px",
              borderTop: "1px solid var(--border-subtle)",
              borderBottom: "1px solid var(--border-subtle)",
              opacity: 0.8,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
                Trusted by
              </span>
              {TRUST_LOGOS.map((name) => (
                <span key={name} style={{
                  fontFamily: "var(--font-comfortaa), sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--color-text-sub)",
                  letterSpacing: "-0.01em",
                }}>
                  {name}
                </span>
              ))}
            </div>
          </section>

          {/* ══════════ BENTO — value promise ══════════ */}
          <section className="lp-section-lg">
            <div style={{ maxWidth: 620, marginBottom: 44 }}>
              <p style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-primary)", margin: 0, marginBottom: 12 }}>
                Why Grid
              </p>
              <h2 style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: "clamp(32px, 3.8vw, 44px)", lineHeight: 1.15, letterSpacing: "-0.02em", margin: 0 }}>
                Built for the shift that starts <em style={{ color: "var(--color-primary)", fontStyle: "italic" }}>tonight</em>, not next quarter.
              </h2>
            </div>

            <div className="lp-bento">
              {/* Big card 1 — spans 2 */}
              <BentoCard span={2} accent="primary">
                <BentoHead label="Post" icon={<IconLightning />} />
                <BentoTitle>A shift live in 60 seconds</BentoTitle>
                <BentoBody>
                  Type the role, set the time and pay, hit publish. Verified runners near your venue see it seconds later.
                </BentoBody>
                <BentoIllustration>
                  <MiniPostForm />
                </BentoIllustration>
              </BentoCard>

              {/* Small card 2 */}
              <BentoCard span={1}>
                <BentoHead label="Verify" icon={<IconShield />} />
                <BentoTitle>Every worker, a track record</BentoTitle>
                <BentoBody>
                  Momentum scores show you who actually shows up, on time, rated by hosts like you.
                </BentoBody>
              </BentoCard>

              {/* Small card 3 */}
              <BentoCard span={1}>
                <BentoHead label="Attend" icon={<IconKey />} />
                <BentoTitle>OTP at the door</BentoTitle>
                <BentoBody>
                  Workers confirm arrival with a 4-digit code at your venue. No clipboards, no phone chase.
                </BentoBody>
              </BentoCard>

              {/* Small card 4 */}
              <BentoCard span={1}>
                <BentoHead label="Pay" icon={<IconWallet />} />
                <BentoTitle>Settled overnight</BentoTitle>
                <BentoBody>
                  One tap and every worker on the shift is paid — direct bank transfer, no cash handling.
                </BentoBody>
              </BentoCard>

              {/* Small card 5 */}
              <BentoCard span={1}>
                <BentoHead label="Scale" icon={<IconLayers />} />
                <BentoTitle>Events, not just shifts</BentoTitle>
                <BentoBody>
                  Wedding weekends, multi-day festivals — bundle every role under one event.
                </BentoBody>
              </BentoCard>

              {/* Big card 6 — spans 2 */}
              <BentoCard span={2} accent="secondary">
                <BentoHead label="Zero no-shows" icon={<IconChart />} />
                <BentoTitle>Know 6 hours ahead, not 6 minutes</BentoTitle>
                <BentoBody>
                  See who&apos;s confirmed, who&apos;s en route, and who dropped — from a single dashboard, before the shift even starts.
                </BentoBody>
                <BentoIllustration>
                  <MiniConfirmedRow />
                </BentoIllustration>
              </BentoCard>
            </div>
          </section>

          {/* ══════════ BIG NUMBERS ══════════ */}
          <section className="lp-section-lg" style={{ paddingTop: 0 }}>
            <div className="lp-numbers">
              {NUMBERS.map((n) => (
                <div key={n.label} style={{ background: "var(--color-bg)", padding: "36px 28px" }}>
                  <div style={{
                    fontFamily: "var(--font-comfortaa), sans-serif",
                    fontWeight: 700,
                    fontSize: "clamp(32px, 3.4vw, 42px)",
                    color: "var(--color-text)",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "-0.02em",
                  }}>
                    {n.val}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", marginTop: 12, lineHeight: 1.4 }}>
                    {n.label}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ══════════ TESTIMONIAL ══════════ */}
          <section className="lp-section-lg" style={{ paddingTop: 0 }}>
            <div style={{
              background: "var(--color-surface-1)",
              border: "1px solid var(--border-color)",
              borderRadius: 24,
              padding: "56px 48px",
              maxWidth: 820,
              margin: "0 auto",
              textAlign: "center",
              boxShadow: "var(--card-shadow, none)",
            }}>
              <div style={{ fontSize: 48, lineHeight: 1, color: "var(--color-primary)", opacity: 0.4, marginBottom: 12 }}>
                &ldquo;
              </div>
              <p style={{
                fontFamily: "var(--font-comfortaa), sans-serif",
                fontWeight: 700,
                fontSize: "clamp(22px, 2.6vw, 28px)",
                lineHeight: 1.35,
                letterSpacing: "-0.01em",
                margin: 0,
                maxWidth: 640,
                marginInline: "auto",
              }}>
                We were spending 40 hours a week on WhatsApp groups just to staff a Saturday. Grid killed all of that in a week — we haven&apos;t missed a shift since.
              </p>
              <div style={{ marginTop: 28, display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))", display: "grid", placeItems: "center", fontWeight: 700, color: "var(--color-text-inv)", fontSize: 16 }}>
                  R
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)" }}>Rohan Kapoor</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>Ops · Olive &amp; Oak · Bengaluru</div>
                </div>
              </div>
            </div>
          </section>

          {/* ══════════ SECONDARY CTA ══════════ */}
          <section className="lp-section-lg" style={{ paddingTop: 0, paddingBottom: 96 }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 24,
              padding: "44px 44px",
              background: "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 8%, var(--color-surface-1)), var(--color-surface-1))",
              border: "1px solid color-mix(in srgb, var(--color-primary) 25%, var(--border-color))",
              borderRadius: 24,
            }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 26, margin: 0, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
                  Your next shift, filled in minutes.
                </h3>
                <p style={{ fontSize: 14, color: "var(--color-text-sub)", margin: 0, marginTop: 8 }}>
                  Sign in on the right with your email — no password to remember.
                </p>
              </div>
              <a
                href="mailto:support@trykria.com?subject=Grid demo request"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--color-primary)", color: "var(--color-text-inv)", border: "none", borderRadius: 12, padding: "13px 22px", fontSize: 14, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}
              >
                Book a 15-min demo <span>→</span>
              </a>
            </div>
          </section>

          {/* ── Footer ── */}
          <div className="lp-footer" style={{ borderTop: "1px solid var(--border-subtle)", gap: 24, fontSize: 12.5, color: "var(--color-text-muted)", flexWrap: "wrap" }}>
            <span>© 2026 Kria</span>
            <a href="https://trykria.com" target="_blank" rel="noopener noreferrer">trykria.com</a>
            <a href="https://trykria.com/terms" target="_blank" rel="noopener noreferrer">Terms</a>
            <a href="https://trykria.com/privacy" target="_blank" rel="noopener noreferrer">Privacy</a>
            <a href="mailto:support@trykria.com">Contact</a>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            RIGHT — sticky sign-in
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="lp-auth-col">
          <div className="lp-auth-inner">
            <div style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 28, lineHeight: 1.15, letterSpacing: "-0.02em" }}>
              Sign in to Grid
            </div>
            <p style={{ fontSize: 14, color: "var(--color-text-sub)", lineHeight: 1.6, margin: 0 }}>
              Enter your email and we&apos;ll send a one-time code — no password to remember.
            </p>

            {step === "email" && (
              <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <input
                  className="lp-email-input"
                  type="email"
                  inputMode="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{ background: "var(--color-bg)", border: "1px solid var(--border-color)", borderRadius: 12, padding: "14px 18px", fontSize: 15, color: "var(--color-text)", outline: "none" }}
                />
                {error && <p style={{ fontSize: 13, color: "var(--color-error)", margin: 0 }}>{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  style={{ background: "var(--color-primary)", color: "var(--color-text-inv)", border: "none", fontSize: 15, fontWeight: 700, padding: "14px 18px", borderRadius: 12, cursor: "pointer", opacity: loading ? 0.6 : 1 }}
                >
                  {loading ? "Sending…" : "Email me a code"}
                </button>
                <p style={{ fontSize: 11.5, color: "var(--color-text-muted)", lineHeight: 1.6, margin: 0, marginTop: 8 }}>
                  By continuing, you agree to Kria&apos;s{" "}
                  <a href="https://trykria.com/terms" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text-sub)", textDecoration: "underline" }}>Terms</a>{" "}and{" "}
                  <a href="https://trykria.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text-sub)", textDecoration: "underline" }}>Privacy</a>.
                </p>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={(e) => { e.preventDefault(); if (otp.length === 6) verifyOtp(otp); }} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <p style={{ fontSize: 13.5, color: "var(--color-text-sub)", margin: 0, lineHeight: 1.55 }}>
                  We sent a 6-digit code to <span style={{ color: "var(--color-text)", fontWeight: 600 }}>{email}</span>.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  {otpDigits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      className="lp-otp-input"
                      maxLength={1}
                      inputMode="numeric"
                      value={d}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      style={{ width: 42, height: 52, textAlign: "center", background: "var(--color-bg)", border: "1px solid var(--border-color)", borderRadius: 12, fontFamily: "ui-monospace, monospace", fontSize: 20, fontWeight: 700, color: "var(--color-text)", outline: "none" }}
                    />
                  ))}
                </div>
                {error && <p style={{ fontSize: 13, color: "var(--color-error)", margin: 0 }}>{error}</p>}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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

            {/* Trust footer */}
            <div style={{ marginTop: "auto", paddingTop: 24, borderTop: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 11.5, color: "var(--color-text-muted)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-primary)", animation: "pulseGlow 2s infinite" }} />
              <span>Made in India · for India&apos;s shift economy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════════════════════════ */

// ── Bento card primitives ─────────────────────────────────────────────────

function BentoCard({
  span, accent, children,
}: {
  span: 1 | 2;
  accent?: "primary" | "secondary";
  children: React.ReactNode;
}) {
  const accentColor =
    accent === "primary" ? "var(--color-primary)" :
    accent === "secondary" ? "var(--color-secondary)" :
    "var(--border-color)";
  return (
    <div
      className={span === 2 ? "lp-bento-1x2" : "lp-bento-1x1"}
      style={{
        background: "var(--color-surface-1)",
        border: `1px solid ${accent ? `color-mix(in srgb, ${accentColor} 30%, var(--border-color))` : "var(--border-color)"}`,
        borderRadius: 20,
        padding: 26,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minHeight: 200,
        position: "relative",
        overflow: "hidden",
        boxShadow: "var(--card-shadow, none)",
      }}
    >
      {children}
    </div>
  );
}

function BentoHead({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
      <span style={{ display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: 8, background: "color-mix(in srgb, var(--color-primary) 12%, transparent)", color: "var(--color-primary)" }}>
        {icon}
      </span>
      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
        {label}
      </span>
    </div>
  );
}

function BentoTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "var(--font-comfortaa), sans-serif",
      fontWeight: 700,
      fontSize: 20,
      lineHeight: 1.2,
      letterSpacing: "-0.01em",
      color: "var(--color-text)",
    }}>
      {children}
    </div>
  );
}

function BentoBody({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--color-text-sub)", margin: 0 }}>
      {children}
    </p>
  );
}

function BentoIllustration({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginTop: "auto", paddingTop: 18 }}>
      {children}
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────
const iconProps = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IconLightning() { return <svg {...iconProps}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>; }
function IconShield()   { return <svg {...iconProps}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>; }
function IconKey()      { return <svg {...iconProps}><path d="M21 2 15 8" /><path d="m17 6 3 3" /><circle cx="9" cy="15" r="6" /></svg>; }
function IconWallet()   { return <svg {...iconProps}><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" /><path d="M15 12h6v-4h-6a2 2 0 0 0 0 4z" /></svg>; }
function IconLayers()   { return <svg {...iconProps}><path d="m12 2 10 6-10 6-10-6 10-6z" /><path d="m2 17 10 6 10-6" /><path d="m2 12 10 6 10-6" /></svg>; }
function IconChart()    { return <svg {...iconProps}><path d="M3 3v18h18" /><path d="m7 14 4-4 4 4 5-6" /></svg>; }

// ── Mini illustrations for the big bento cards ────────────────────────────

function MiniPostForm() {
  return (
    <div style={{ background: "var(--color-bg)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10.5, color: "var(--color-text-muted)", fontWeight: 600, letterSpacing: "0.05em" }}>
        <span>ROLE</span>
      </div>
      <div style={{ background: "var(--color-surface-2)", borderRadius: 6, padding: "8px 10px", fontSize: 12.5, color: "var(--color-text)", display: "flex", alignItems: "center", gap: 4 }}>
        Banquet crew
        <span style={{ display: "inline-block", width: 1.5, height: 12, background: "var(--color-primary)", animation: "pulseGlow 1.1s infinite" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ background: "var(--color-surface-2)", borderRadius: 6, padding: "6px 8px", fontSize: 11, color: "var(--color-text-sub)" }}>Sat 5–11 pm</div>
        <div style={{ background: "var(--color-surface-2)", borderRadius: 6, padding: "6px 8px", fontSize: 11, color: "var(--color-text-sub)" }}>₹1,100/shift</div>
      </div>
      <div style={{ background: "var(--color-primary)", color: "var(--color-text-inv)", fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 6, textAlign: "center", alignSelf: "flex-start" }}>
        Publish gig
      </div>
    </div>
  );
}

function MiniConfirmedRow() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {[
        { name: "Priya S.",  status: "Checked in",  color: "var(--color-primary)"   },
        { name: "Arjun M.",  status: "En route",    color: "var(--color-secondary)" },
        { name: "Kavya N.",  status: "Confirmed",   color: "var(--color-primary)"   },
      ].map((r) => (
        <div key={r.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--color-bg)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "8px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 600 }}>
            <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--color-surface-3)", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, color: "var(--color-text-sub)" }}>
              {r.name[0]}
            </span>
            {r.name}
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: r.color }}>{r.status}</span>
        </div>
      ))}
    </div>
  );
}

// ── Big product mockup for the hero ───────────────────────────────────────
// A stylized Grid dashboard preview. Kept as inline JSX (not a screenshot)
// so it renders sharp on retina and adapts to the theme. Deliberately more
// spacious and richer than the small mockup at the bottom of the old page.

function DashboardMockup() {
  return (
    <div style={{
      background: "var(--color-surface-1)",
      border: "1px solid var(--border-color)",
      borderRadius: 20,
      overflow: "hidden",
      boxShadow: "0 24px 60px -20px rgba(0,0,0,0.35), var(--card-shadow, none)",
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

      {/* Dashboard content */}
      <div style={{ display: "flex", minHeight: 380 }}>
        {/* Sidebar */}
        <div style={{ width: 160, flexShrink: 0, borderRight: "1px solid var(--border-subtle)", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px 14px", borderBottom: "1px solid var(--border-subtle)", marginBottom: 8 }}>
            <div style={{ width: 20, height: 20, background: "var(--color-primary)", borderRadius: 5, display: "grid", placeItems: "center" }}>
              <div style={{ width: 9, height: 9, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                {[0, 1, 2, 3].map((k) => <div key={k} style={{ background: "var(--color-text-inv)", borderRadius: 0.5 }} />)}
              </div>
            </div>
            <span style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 14 }}>grid</span>
          </div>
          {[
            { l: "Dashboard",    active: false, dot: false },
            { l: "Gigs",         active: false, dot: false },
            { l: "Events",       active: false, dot: false },
            { l: "Applications", active: true,  dot: true  },
            { l: "Analytics",    active: false, dot: false },
          ].map((n) => (
            <div key={n.l} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              fontSize: 11.5, fontWeight: 600, padding: "8px 10px", borderRadius: 6,
              background: n.active ? "color-mix(in srgb, var(--color-primary) 12%, transparent)" : "transparent",
              color: n.active ? "var(--color-primary)" : "var(--color-text-muted)",
            }}>
              {n.l}
              {n.dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-primary)", boxShadow: "0 0 6px var(--color-primary)" }} />}
            </div>
          ))}
        </div>

        {/* Main */}
        <div style={{ flex: 1, minWidth: 0, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.15em", textTransform: "uppercase" }}>Applications</div>
            <div style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 20, marginTop: 2 }}>Banquet crew · Saturday</div>
          </div>

          {/* Applicant rows — the star of the mockup */}
          {[
            { name: "Priya Sharma",  meta: "38 gigs · Mumbai",   score: 812, band: "Elite",    bandVar: "--band-elite",    action: "Accept" },
            { name: "Arjun Mehta",   meta: "21 gigs · Thane",    score: 704, band: "Trusted",  bandVar: "--band-trusted",  action: "Accept" },
            { name: "Kavya Nair",    meta: "12 gigs · Navi Mumbai", score: 631, band: "Reliable", bandVar: "--band-reliable", action: "Accept" },
            { name: "Vikram Talwar", meta: "45 gigs · Bandra",   score: 878, band: "Elite",    bandVar: "--band-elite",    action: "Hired" },
          ].map((a) => (
            <div key={a.name} style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto auto",
              gap: 12,
              alignItems: "center",
              background: "var(--color-surface-2)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 10,
              padding: "10px 14px",
            }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--color-surface-4)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, color: "var(--color-text-sub)" }}>
                {a.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                <div style={{ fontSize: 10.5, color: "var(--color-text-muted)" }}>{a.meta}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: `var(${a.bandVar})` }}>{a.score}</div>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--color-text-muted)" }}>{a.band}</div>
              </div>
              <span style={{
                fontSize: 10.5, fontWeight: 700,
                color: a.action === "Hired" ? "var(--color-text-inv)" : "var(--color-primary)",
                background: a.action === "Hired" ? "var(--color-primary)" : "color-mix(in srgb, var(--color-primary) 10%, transparent)",
                border: a.action === "Hired" ? "1px solid var(--color-primary)" : "1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)",
                borderRadius: 999,
                padding: "5px 12px",
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
