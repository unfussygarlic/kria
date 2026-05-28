"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, BarChart3, Network } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Step = "email" | "otp";

const FEATURES = [
  { icon: Users,     label: "Post Gigs in Seconds" },
  { icon: BarChart3, label: "Real-time Performance Metrics" },
  { icon: Network,   label: "Automated Staffing Solutions" },
];

const STATS = [
  { label: "Partners",        value: "500+" },
  { label: "Qualified Hosts", value: "12.5k" },
  { label: "Placements / Mo", value: "4.8k" },
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
          <div className="lg:col-span-7 hidden lg:flex flex-col justify-center py-16">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-3 mb-4"
              style={{ color: "#D4FF00" }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#D4FF00", boxShadow: "0 0 6px #D4FF00" }} />
              Source Top Talent
            </span>

            <h1 className="text-[56px] xl:text-[72px] font-bold leading-[1.05] text-white tracking-tight max-w-2xl">
              The Professional<br />
              <span style={{ color: "#D4FF00" }}>Host Network</span>
            </h1>

            <p className="text-lg text-neutral-400 max-w-lg mt-6 leading-relaxed">
              Connect with elite hospitality professionals through our streamlined workforce management ecosystem.
            </p>

            <ul className="mt-10 space-y-6">
              {FEATURES.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
                  >
                    <Icon size={18} style={{ color: "#D4FF00" }} />
                  </div>
                  <span className="text-lg text-neutral-300 font-medium">{label}</span>
                </li>
              ))}
            </ul>

            <div className="mt-16 flex gap-12 items-center" style={{ opacity: 0.6 }}>
              {STATS.map((s, i) => (
                <div
                  key={s.label}
                  className={`flex flex-col ${i > 0 ? "pl-12" : ""}`}
                  style={i > 0 ? { borderLeft: "1px solid rgba(255,255,255,0.10)" } : undefined}
                >
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-500 mb-1">{s.label}</span>
                  <span className="text-2xl font-bold text-white">{s.value}</span>
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
        className="fixed bottom-0 left-0 w-full z-20 flex flex-col md:flex-row justify-between items-center px-10 py-5"
        style={{
          backgroundColor: "rgba(12,13,10,0.40)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 mb-2 md:mb-0">
          © 2025 Kria Network. Elevating Hospitality Standards.
        </span>
        <div className="hidden md:flex gap-8">
          {["Legal", "Cookies", "Support", "Enterprise"].map((l) => (
            <a key={l} href="#"
              className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.color = "#D4FF00")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "")}>
              {l}
            </a>
          ))}
        </div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2 mt-2 md:mt-0">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Operational Status
        </div>
      </footer>
    </div>
  );
}
