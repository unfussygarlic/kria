"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { initializeSubscription } from "@/lib/api/subscriptions";

type Step = "name" | "location";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", session.user.id)
        .single();

      if (profile) { router.replace("/dashboard"); return; }

      setUserId(session.user.id);
      setUserEmail(session.user.email ?? null);
      setPhone(session.user.phone ?? null);
      setChecking(false);
    });
  }, [router]);

  const handleNameNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!firstName.trim()) { setError("First name is required."); return; }
    setStep("location");
  };

  const handleComplete = async (skip?: boolean) => {
    if (!userId || loading) return;
    setError("");
    setLoading(true);

    const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");

    const { error: err } = await supabase.from("profiles").upsert({
      id: userId,
      first_name: firstName.trim(),
      last_name: lastName.trim() || null,
      display_name: displayName,
      email: userEmail,
      phone: phone,
      default_role: "host",
      city: skip ? null : city.trim() || null,
      state: skip ? null : state.trim() || null,
    });

    setLoading(false);
    if (err) { setError(err.message); return; }

    // Snapshot trial start — idempotent if called twice
    await initializeSubscription();

    router.replace("/dashboard");
  };

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleComplete(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0c0d0a" }}>
        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#D4FF00", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen overflow-hidden relative flex flex-col items-center justify-center"
      style={{ backgroundColor: "#0c0d0a" }}
    >
      {/* Soft lime glow */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 30% 40%, rgba(212,255,0,0.03) 0%, transparent 40%),
            radial-gradient(circle at 70% 60%, rgba(212,255,0,0.02) 0%, transparent 40%),
            #0c0d0a
          `,
        }}
      />

      <main className="relative z-10 w-full max-w-[420px] px-6">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {(["name", "location"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-px" style={{ backgroundColor: "rgba(255,255,255,0.10)" }} />}
              <div
                className="w-2 h-2 rounded-full transition-all"
                style={{ backgroundColor: step === s ? "#D4FF00" : "rgba(255,255,255,0.15)" }}
              />
            </div>
          ))}
        </div>

        <div
          className="w-full rounded-2xl p-10 relative overflow-hidden"
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

          {/* ── Step 1: Name ── */}
          {step === "name" && (
            <>
              <div className="mb-8">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 mb-3" style={{ color: "#D4FF00" }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#D4FF00", boxShadow: "0 0 6px #D4FF00" }} />
                  Step 1 of 2
                </span>
                <h2 className="text-2xl font-bold text-white tracking-tight">Let's set up your profile</h2>
                <p className="text-sm text-neutral-400 mt-1.5">Tell us your name so runners can see who's posting.</p>
              </div>

              <form onSubmit={handleNameNext} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">First Name</label>
                  <input
                    type="text"
                    placeholder="Alex"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full text-white px-4 py-4 rounded-xl text-sm transition-all focus:outline-none"
                    style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(212,255,0,0.50)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)")}
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Last Name <span className="text-neutral-600 normal-case tracking-normal font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Rivera"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full text-white px-4 py-4 rounded-xl text-sm transition-all focus:outline-none"
                    style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(212,255,0,0.50)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)")}
                  />
                </div>

                {error && <p className="text-sm" style={{ color: "#ff7351" }}>{error}</p>}

                <button
                  type="submit"
                  className="w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-[0.98]"
                  style={{ backgroundColor: "#D4FF00", color: "#0c0d0a" }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 20px rgba(212,255,0,0.30)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                >
                  Continue
                </button>
              </form>
            </>
          )}

          {/* ── Step 2: Location ── */}
          {step === "location" && (
            <>
              <div className="mb-8">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 mb-3" style={{ color: "#D4FF00" }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#D4FF00", boxShadow: "0 0 6px #D4FF00" }} />
                  Step 2 of 2
                </span>
                <h2 className="text-2xl font-bold text-white tracking-tight">Where are you based?</h2>
                <p className="text-sm text-neutral-400 mt-1.5">Helps runners find local opportunities. You can skip this.</p>
              </div>

              <form onSubmit={handleLocationSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">City</label>
                  <input
                    type="text"
                    placeholder="Mumbai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full text-white px-4 py-4 rounded-xl text-sm transition-all focus:outline-none"
                    style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(212,255,0,0.50)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)")}
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">State</label>
                  <input
                    type="text"
                    placeholder="Maharashtra"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full text-white px-4 py-4 rounded-xl text-sm transition-all focus:outline-none"
                    style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(212,255,0,0.50)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)")}
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
                  {loading ? "Saving…" : "Finish Setup"}
                </button>

                <button
                  type="button"
                  onClick={() => handleComplete(true)}
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-xs font-bold text-neutral-500 uppercase tracking-wider transition-colors disabled:opacity-40"
                  style={{ border: "1px solid rgba(255,255,255,0.10)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  Skip for now
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
