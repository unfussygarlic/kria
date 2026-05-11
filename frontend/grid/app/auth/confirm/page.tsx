"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type View = "loading" | "name";

export default function AuthConfirmPage() {
  const router = useRouter();
  const [view, setView]         = useState<View>("loading");
  const [user, setUser]         = useState<User | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState("");

  useEffect(() => {
    // Supabase processes the magic link tokens from the URL hash automatically.
    // Listen for the resulting SIGNED_IN event, then check if the user has a profile.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          subscription.unsubscribe();
          await handleSession(session.user);
        }
        // INITIAL_SESSION fires on page load if already logged in
        if (event === "INITIAL_SESSION" && session) {
          subscription.unsubscribe();
          await handleSession(session.user);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const handleSession = async (u: User) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", u.id)
      .single();

    if (profile) {
      router.replace("/dashboard");
    } else {
      setUser(u);
      setView("name");
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !user) return;
    setLoading(true);
    setError("");

    const display = `${firstName.trim()} ${lastName.trim()}`.trim();
    const { error: profileErr } = await supabase.from("profiles").upsert({
      id: user.id,
      first_name: firstName.trim(),
      last_name:  lastName.trim() || null,
      display_name: display,
    });

    setLoading(false);
    if (profileErr) { setError(profileErr.message); return; }
    router.replace("/dashboard");
  };

  if (view === "loading") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#0c0d0a" }}
      >
        <div className="text-center space-y-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent mx-auto animate-spin"
            style={{ borderColor: "#D4FF00", borderTopColor: "transparent" }}
          />
          <p className="text-sm text-neutral-400">Signing you in…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#0c0d0a" }}
    >
      <div
        className="w-full max-w-[420px] rounded-2xl p-10"
        style={{
          background: "rgba(26, 29, 16, 0.70)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.50)",
        }}
      >
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white tracking-tight">Your Name</h2>
          <p className="text-sm text-neutral-400 mt-1.5">Complete your host account</p>
        </div>

        <form onSubmit={handleCreateProfile} className="space-y-5">
          <div className="space-y-3">
            {[
              { label: "First Name *", value: firstName, set: setFirstName, ph: "Arjun",  auto: true  },
              { label: "Last Name",    value: lastName,  set: setLastName,  ph: "Sharma", auto: false },
            ].map(({ label, value, set, ph, auto }) => (
              <div key={label} className="space-y-1.5">
                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  {label}
                </label>
                <input
                  type="text"
                  placeholder={ph}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="w-full text-white px-4 py-4 rounded-xl text-sm focus:outline-none transition-all"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(212,255,0,0.50)")}
                  onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)")}
                  autoFocus={auto}
                />
              </div>
            ))}
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
            {loading ? "Creating…" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
