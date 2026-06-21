"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Terminal } from "lucide-react";

type Step = "email" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep]       = useState<Step>("email");
  const [email, setEmail]     = useState("");
  const [otp, setOtp]         = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [cooldown, setCooldown] = useState(0);

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
    if (!email.trim() || !email.includes("@")) { setError("Enter a valid email."); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setCooldown(60);
    setStep("otp");
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
      .select("is_admin")
      .eq("id", data.user!.id)
      .single();

    if (!profile?.is_admin) {
      await supabase.auth.signOut();
      setLoading(false);
      setOtp("");
      setStep("email");
      setError("Access denied. This dashboard is restricted to admins.");
      return;
    }

    router.replace("/overview");
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#080808" }}>
      {/* Subtle grid background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(212,255,0,0.03) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 w-full max-w-sm px-6">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "rgba(212,255,0,0.10)", border: "1px solid rgba(212,255,0,0.20)" }}
          >
            <Terminal size={18} style={{ color: "#D4FF00" }} />
          </div>
          <div>
            <p className="text-sm font-bold leading-none" style={{ color: "#D4FF00", fontFamily: "var(--font-mono)" }}>
              kria
            </p>
            <p className="text-[10px] tracking-[0.25em] uppercase mt-0.5" style={{ color: "#555550" }}>
              admin
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            backgroundColor: "#111111",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
          }}
        >
          <div className="mb-7">
            <h1 className="text-xl font-bold text-white">
              {step === "email" ? "Sign in" : "Verify"}
            </h1>
            <p className="text-xs mt-1" style={{ color: "#555550" }}>
              {step === "email"
                ? "Restricted access — admin only"
                : `Code sent to ${email}`}
            </p>
          </div>

          {step === "email" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <input
                type="email"
                placeholder="admin@trykria.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  backgroundColor: "#161616",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "#e2e4cf",
                  fontFamily: "var(--font-mono)",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "rgba(212,255,0,0.40)")}
                onBlur={e  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
              />
              {error && (
                <p className="text-xs" style={{ color: "#ff7351", fontFamily: "var(--font-mono)" }}>
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                style={{ backgroundColor: "#D4FF00", color: "#080808" }}
              >
                {loading ? "Sending…" : "Send Code"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <input
                type="tel"
                inputMode="numeric"
                placeholder="000000"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus
                className="w-full px-4 py-3 rounded-xl text-2xl font-bold tracking-[0.5em] text-center outline-none transition-all"
                style={{
                  backgroundColor: "#161616",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "#D4FF00",
                  fontFamily: "var(--font-mono)",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "rgba(212,255,0,0.40)")}
                onBlur={e  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
              />
              {error && (
                <p className="text-xs" style={{ color: "#ff7351", fontFamily: "var(--font-mono)" }}>
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setStep("email"); setOtp(""); setError(""); }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                  style={{ border: "1px solid rgba(255,255,255,0.07)", color: "#555550" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  ← Back
                </button>
                <button
                  onClick={() => {
                    if (cooldown > 0 || loading) return;
                    setOtp("");
                    supabase.auth.signInWithOtp({ email: email.trim() });
                    setCooldown(60);
                  }}
                  disabled={cooldown > 0 || loading}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-40 transition-colors"
                  style={{ border: "1px solid rgba(255,255,255,0.07)", color: cooldown > 0 ? "#555550" : "#D4FF00" }}
                >
                  {cooldown > 0 ? `${cooldown}s` : "Resend"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] mt-6 tracking-widest uppercase" style={{ color: "#333330", fontFamily: "var(--font-mono)" }}>
          kria operations · restricted
        </p>
      </div>
    </div>
  );
}
