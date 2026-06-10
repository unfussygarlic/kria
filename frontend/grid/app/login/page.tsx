"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Step = "email" | "otp";

const HOW_IT_WORKS = [
  { n: "01", title: "Post",    sub: "Role, time, pay, location — four steps." },
  { n: "02", title: "Pick",    sub: "Browse applicants ranked by Momentum Score." },
  { n: "03", title: "Confirm", sub: "OTP check-in. Know exactly who showed up." },
];

const STEP_DURATION = 3200;
const RESEND_COOLDOWN = 60;

export default function LoginPage() {
  const router = useRouter();

  // ── Auth state ───────────────────────────────────────────────────────────────
  const [step, setStep]     = useState<Step>("email");
  const [email, setEmail]   = useState("");
  const [otp,   setOtp]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState("");
  const [cooldown, setCooldown] = useState(0);

  // ── Animated list state ──────────────────────────────────────────────────────
  const [active, setActive]           = useState(0);
  const [progressKey, setProgressKey] = useState(0);
  const pausedRef   = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const advance = useCallback((from?: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (pausedRef.current) return;
      setActive(prev => (prev + 1) % HOW_IT_WORKS.length);
      setProgressKey(k => k + 1);
    }, STEP_DURATION);
  }, []);

  useEffect(() => {
    advance();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [advance]);

  const handleSelect = (i: number) => {
    setActive(i);
    setProgressKey(k => k + 1);
    advance(i);
  };

  // ── Auth countdown ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (otp.length === 6 && !loading) verifyOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setCooldown(RESEND_COOLDOWN);
    setStep("otp");
  };

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    setError("");
    setOtp("");
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setCooldown(RESEND_COOLDOWN);
  };

  const verifyOtp = async () => {
    if (loading) return;
    setError("");
    setLoading(true);
    const { data, error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp,
      type: "email",
    });
    if (err) { setLoading(false); setError(err.message); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", data.user!.id)
      .single();

    router.replace(profile ? "/dashboard" : "/onboarding");
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    verifyOtp();
  };

  const goBack = () => {
    setError("");
    setOtp("");
    setStep("email");
  };

  return (
    <div
      className="min-h-screen overflow-hidden relative flex flex-col"
      style={{ backgroundColor: "#0c0d0a" }}
    >
      <style>{`
        @keyframes sweepProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>

      {/* Soft lime glow */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, rgba(212,255,0,0.03) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(212,255,0,0.02) 0%, transparent 40%),
            #0c0d0a
          `,
        }}
      />

      <main className="relative z-10 flex-1 flex items-center justify-center">
        <div className="w-full max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 min-h-screen items-center px-8">

          {/* ── Left: Marketing ── */}
          <div className="lg:col-span-7 hidden lg:flex flex-col justify-center py-16 pr-16">

            {/* Kicker */}
            <div className="flex items-center gap-3 mb-8">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: "#D4FF00" }}>
                kria · Grid
              </span>
              <span className="font-mono text-[10px] text-neutral-600 tracking-[0.06em]">
                for Hosts
              </span>
            </div>

            {/* Headline */}
            <h1
              className="font-bold leading-[0.96] tracking-tight mb-6"
              style={{ fontSize: "clamp(48px, 5.5vw, 80px)" }}
            >
              <span className="block text-white">Fill your roster</span>
              <span className="block" style={{ color: "#D4FF00" }}>before chai.</span>
            </h1>

            {/* Lead */}
            <p className="text-[17px] leading-relaxed text-neutral-400 max-w-md mb-10">
              Post a gig in four steps. Browse applicants ranked by Momentum Score — a verified track record built from real shifts, not a CV.
            </p>

            {/* ── Animated step list ── */}
            <div
              className="flex flex-col"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
              onMouseEnter={() => { pausedRef.current = true; }}
              onMouseLeave={() => { pausedRef.current = false; }}
            >
              {HOW_IT_WORKS.map(({ n, title, sub }, i) => {
                const isActive = active === i;
                return (
                  <button
                    key={n}
                    onClick={() => handleSelect(i)}
                    style={{
                      all: "unset",
                      cursor: "pointer",
                      display: "block",
                      position: "relative",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      borderLeft: `2px solid ${isActive ? "#D4FF00" : "rgba(255,255,255,0.08)"}`,
                      paddingLeft: 20,
                      paddingTop: 20,
                      paddingBottom: 20,
                      opacity: isActive ? 1 : 0.35,
                      transition: "opacity 0.4s ease, border-left-color 0.35s ease",
                    }}
                  >
                    {/* Number + title row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                      <span
                        className="font-mono"
                        style={{
                          fontSize: 11,
                          letterSpacing: "0.08em",
                          color: isActive ? "#D4FF00" : "rgba(255,255,255,0.25)",
                          transition: "color 0.35s ease",
                          flexShrink: 0,
                        }}
                      >
                        {n}
                      </span>
                      <span
                        className="font-mono"
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          color: isActive ? "#ffffff" : "rgba(255,255,255,0.4)",
                          transition: "color 0.35s ease",
                        }}
                      >
                        · {title}
                      </span>
                    </div>

                    {/* Sub text */}
                    <p
                      style={{
                        fontSize: 14,
                        lineHeight: 1.55,
                        color: "rgba(255,255,255,0.4)",
                        margin: 0,
                        paddingLeft: 30,
                      }}
                    >
                      {sub}
                    </p>

                    {/* Progress sweep — remount on each activation to restart animation */}
                    {isActive && (
                      <span
                        key={progressKey}
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          height: 1,
                          backgroundColor: "#D4FF00",
                          opacity: 0.6,
                          animation: `sweepProgress ${STEP_DURATION}ms linear forwards`,
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Right: Auth Card ── */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end items-center">
            <div
              className="w-full max-w-[420px] rounded-2xl p-10 relative overflow-hidden"
              style={{
                background: "rgba(26, 29, 16, 0.70)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.50)",
              }}
            >
              <div
                className="absolute -top-24 -right-24 w-64 h-64 pointer-events-none"
                style={{ backgroundColor: "#D4FF00", opacity: 0.03, filter: "blur(80px)" }}
              />

              <div className="mb-8 relative">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {step === "email" ? "Welcome" : "Check your email"}
                </h2>
                <p className="text-sm text-neutral-400 mt-1.5">
                  {step === "email"
                    ? "Sign in or create your host account"
                    : `We sent a 6-digit code to ${email}`}
                </p>
              </div>

              {/* ── Email step ── */}
              {step === "email" && (
                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                      Email Address
                    </label>
                    <input
                      type="email"
                      inputMode="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-white px-4 py-4 rounded-xl text-sm transition-all focus:outline-none"
                      style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(212,255,0,0.50)")}
                      onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)")}
                      autoFocus
                    />
                  </div>

                  {error && <p className="text-sm" style={{ color: "#ff7351" }}>{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-60"
                    style={{ backgroundColor: "#D4FF00", color: "#0c0d0a" }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 20px rgba(212,255,0,0.30)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                  >
                    {loading ? "Sending…" : "Continue"}
                  </button>
                </form>
              )}

              {/* ── OTP step ── */}
              {step === "otp" && (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                      6-digit code
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="w-full text-white px-4 py-4 rounded-xl text-2xl font-black tracking-[0.4em] placeholder:text-neutral-700 placeholder:tracking-normal placeholder:text-base placeholder:font-normal focus:outline-none transition-all"
                      style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(212,255,0,0.50)")}
                      onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)")}
                      autoFocus
                    />
                  </div>

                  {error && <p className="text-sm" style={{ color: "#ff7351" }}>{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-60"
                    style={{ backgroundColor: "#D4FF00", color: "#0c0d0a" }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 20px rgba(212,255,0,0.30)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                  >
                    {loading ? "Verifying…" : "Verify"}
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={goBack}
                      className="flex-1 py-3 rounded-xl text-xs font-bold text-neutral-500 uppercase tracking-wider transition-colors"
                      style={{ border: "1px solid rgba(255,255,255,0.10)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={cooldown > 0 || loading}
                      className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-40"
                      style={{
                        border: "1px solid rgba(255,255,255,0.10)",
                        color: cooldown > 0 ? "#555" : "#D4FF00",
                      }}
                      onMouseEnter={(e) => { if (cooldown === 0) e.currentTarget.style.backgroundColor = "rgba(212,255,0,0.05)"; }}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      {cooldown > 0 ? `Resend (${cooldown}s)` : "Resend"}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-8 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-xs text-neutral-500 text-center">
                  By signing in, you agree to our{" "}
                  <a
                    href="#"
                    className="text-white transition-colors"
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#D4FF00")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#ffffff")}
                  >
                    Terms of Service
                  </a>{" "}and{" "}
                  <a
                    href="#"
                    className="text-white transition-colors"
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#D4FF00")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#ffffff")}
                  >
                    Privacy Policy
                  </a>.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      <footer
        className="fixed bottom-0 left-0 w-full z-20 flex justify-between items-center px-10 py-4"
        style={{
          backgroundColor: "rgba(12,13,10,0.40)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <span className="font-mono text-[10px] text-neutral-700 tracking-wider">
          © 2026 kria
        </span>
        <div className="flex gap-6">
          {["Legal", "Support"].map((l) => (
            <a
              key={l}
              href="#"
              className="font-mono text-[10px] uppercase tracking-wider text-neutral-600 transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.color = "#D4FF00")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "")}
            >
              {l}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}
