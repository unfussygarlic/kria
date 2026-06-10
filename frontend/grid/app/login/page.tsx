"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Step = "email" | "otp";

const HOW_IT_WORKS = [
  { n: "01", title: "Post",    sub: "Role, time, pay, location — four steps." },
  { n: "02", title: "Pick",    sub: "Browse applicants ranked by Momentum Score." },
  { n: "03", title: "Confirm", sub: "OTP check-in. Know exactly who showed up." },
];

const STATS = [
  { label: "Median apply→accept", value: "8 min" },
  { label: "OTP-confirmed show-up rate", value: "94.2%" },
  { label: "Paid out, last 30 days", value: "₹2.8 Cr" },
];

const RESEND_COOLDOWN = 60;

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep]   = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp,   setOtp]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Countdown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Auto-submit when all 6 digits are entered
  useEffect(() => {
    if (otp.length === 6 && !loading) verifyOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  // ── Step 1: send OTP ────────────────────────────────────────────────────────
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

  // ── Resend OTP ──────────────────────────────────────────────────────────────
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

  // ── Step 2: verify OTP ──────────────────────────────────────────────────────
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

    // Existing host → dashboard | New host → onboarding
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
              <span
                className="font-mono text-[10px] uppercase tracking-[0.12em]"
                style={{ color: "#D4FF00" }}
              >
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
              <span className="block" style={{ color: "#D4FF00" }}>
                before chai.
              </span>
            </h1>

            {/* Lead */}
            <p className="text-[17px] leading-relaxed text-neutral-400 max-w-md mb-12">
              Post a gig in four steps. Browse applicants ranked by Momentum Score — a verified track record built from real shifts, not a CV.
            </p>

            {/* How it works — numbered list */}
            <div className="flex flex-col divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {HOW_IT_WORKS.map(({ n, title, sub }) => (
                <div key={n} className="flex gap-5 items-start py-5">
                  <span className="font-mono text-[11px] text-neutral-600 tracking-wider pt-0.5 w-6 flex-shrink-0">{n}</span>
                  <div>
                    <span className="font-mono text-[12px] font-bold tracking-wider" style={{ color: "#D4FF00" }}>
                      · {title}
                    </span>
                    <p className="text-[15px] text-neutral-400 mt-1">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="mt-10 grid grid-cols-3 gap-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {STATS.map((s, i) => (
                <div
                  key={s.label}
                  className="pt-6"
                  style={i > 0 ? { paddingLeft: 24, borderLeft: "1px solid rgba(255,255,255,0.06)" } : {}}
                >
                  <span className="block text-[26px] font-bold text-white leading-none">{s.value}</span>
                  <span className="block font-mono text-[10px] text-neutral-600 mt-2 leading-snug uppercase tracking-wider">{s.label}</span>
                </div>
              ))}
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
              <div className="absolute -top-24 -right-24 w-64 h-64 pointer-events-none"
                style={{ backgroundColor: "#D4FF00", opacity: 0.03, filter: "blur(80px)" }} />

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

                  {/* Resend + Back row */}
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
                  <a href="#" className="text-white transition-colors"
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#D4FF00")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#ffffff")}>
                    Terms of Service
                  </a>{" "}and{" "}
                  <a href="#" className="text-white transition-colors"
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#D4FF00")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#ffffff")}>
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
            <a key={l} href="#"
              className="font-mono text-[10px] uppercase tracking-wider text-neutral-600 transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.color = "#D4FF00")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "")}>
              {l}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}
