"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Step = "email" | "otp";

const RAIL_STEPS = ["Grid", "Why Grid", "Post", "Applicants", "Check-in", "Events", "Start"];
const RESEND_COOLDOWN = 60;
const ROLE_TEXT = "Banquet service crew";

const CITIES = ["Mumbai", "Delhi NCR", "Bengaluru", "Hyderabad", "Pune", "Chennai", "Jaipur", "Kochi"];

const APPLICANTS = [
  { initials: "PS", name: "Priya Sharma", meta: "38 gigs · Mumbai", score: 812, band: "Elite", bandVar: "--band-elite" },
  { initials: "AM", name: "Arjun Mehta", meta: "21 gigs · Thane", score: 704, band: "Trusted", bandVar: "--band-trusted" },
  { initials: "KN", name: "Kavya Nair", meta: "12 gigs · Navi Mumbai", score: 631, band: "Reliable", bandVar: "--band-reliable" },
];

const BAND_LEGEND = [
  { label: "Newcomer", bandVar: "--band-newcomer" },
  { label: "Building", bandVar: "--band-building" },
  { label: "Reliable", bandVar: "--band-reliable" },
  { label: "Trusted", bandVar: "--band-trusted" },
  { label: "Elite", bandVar: "--band-elite" },
  { label: "Legend", bandVar: "--band-legend" },
];

const WITHOUT_GRID = [
  "Juggling WhatsApp groups and phone calls for every shift",
  "No way to check if someone actually shows up on time",
  "No-shows discovered mid-shift, when it's too late",
  "Attendance tracked on paper, or not at all",
];

const WITH_GRID = [
  "Post a role in minutes, from your phone or laptop",
  "See a verified performance history before you hire",
  "A one-time code confirms who's actually on-site",
  "One dashboard for every gig, shift, and event",
];

const ROLE_POOL = ["Valet · 3", "Housekeeping · 5", "AV crew · 2"];

/* ── Scroll-reveal helper ─────────────────────────────────────────────── */

function useReveal() {
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Created synchronously during render (not inside useEffect) so it already
  // exists by the time child Reveal components register in their own mount
  // effects — child effects fire before parent effects, so a parent-side
  // useEffect here would always lose that race and leave everything at
  // opacity: 0 forever.
  if (!observerRef.current && typeof window !== "undefined") {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        setVisible((prev) => {
          let changed = false;
          const next = new Set(prev);
          entries.forEach((entry) => {
            const id = (entry.target as HTMLElement).dataset.revealId;
            if (entry.isIntersecting && id && !next.has(id)) {
              next.add(id);
              changed = true;
            }
          });
          return changed ? next : prev;
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
  }

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  const register = useCallback((el: HTMLElement | null, id: string) => {
    if (!el || !observerRef.current) return;
    el.dataset.revealId = id;
    observerRef.current.observe(el);
  }, []);

  return { visible, register };
}

function Reveal({
  id,
  register,
  visible,
  delay = 0,
  scale = false,
  style,
  children,
}: {
  id: string;
  register: (el: HTMLElement | null, id: string) => void;
  visible: Set<string>;
  delay?: number;
  scale?: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    register(ref.current, id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [register, id]);
  const shown = visible.has(id);
  return (
    <div
      ref={ref}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? (scale ? "scale(1)" : "translateY(0)") : scale ? "scale(0.5)" : "translateY(28px)",
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

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
      if (err) {
        setLoading(false);
        setError(err.message);
        return;
      }
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
    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
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
    if (err) {
      setError(err.message);
      return;
    }
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
    setOtpDigits((prev) => {
      const next = [...prev];
      next[i] = digit;
      return next;
    });
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
      setOtpDigits((prev) => {
        const next = [...prev];
        next[i - 1] = "";
        return next;
      });
    }
  };

  /* ── Scroll story: reveal + active rail tracking ── */
  const { visible, register } = useReveal();
  const [active, setActive] = useState(0);
  const sceneRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const check = () => {
      const vh = window.innerHeight || document.documentElement.clientHeight;
      let next = 0;
      sceneRefs.current.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top < vh * 0.55) next = i;
      });
      setActive((prev) => (prev === next ? prev : next));
    };
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    check();
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  const goToScene = (i: number) => {
    const el = sceneRefs.current[i];
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 140, behavior: "smooth" });
  };

  /* ── Demo: typed role ── */
  const [typedRole, setTypedRole] = useState("");
  const typingStarted = useRef(false);
  useEffect(() => {
    if (!visible.has("scene-2") || typingStarted.current) return;
    typingStarted.current = true;
    let i = 0;
    const t = setInterval(() => {
      i++;
      setTypedRole(ROLE_TEXT.slice(0, i));
      if (i >= ROLE_TEXT.length) clearInterval(t);
    }, 55);
    return () => clearInterval(t);
  }, [visible]);
  const typedDone = typedRole.length >= ROLE_TEXT.length;

  /* ── Demo: publish gig ── */
  const [published, setPublished] = useState(false);

  /* ── Demo: accept applicants ── */
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const acceptedCount = Object.values(accepted).filter(Boolean).length;

  /* ── Demo: event roles ── */
  const [eventRoles, setEventRoles] = useState(["Service · 12", "Security · 4", "Setup · 6"]);
  const crewCount = eventRoles.reduce((n, r) => n + Number(r.split("·")[1]), 0);
  const addRole = () => {
    if (eventRoles.length >= 6) return;
    setEventRoles((prev) => [...prev, ROLE_POOL[prev.length - 3]]);
  };

  /* ── Live pulse: city + clock ── */
  const [cityIdx, setCityIdx] = useState(0);
  const [cityVisible, setCityVisible] = useState(true);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const cityTimer = setInterval(() => {
      setCityVisible(false);
      setTimeout(() => {
        setCityIdx((i) => (i + 1) % CITIES.length);
        setCityVisible(true);
      }, 350);
    }, 3000);
    const clock = setInterval(() => setNow(new Date()), 15000);
    return () => {
      clearInterval(cityTimer);
      clearInterval(clock);
    };
  }, []);
  const istTime = now
    ? new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })
        .format(now)
        .toLowerCase()
    : "";

  const setSceneRef = (i: number) => (el: HTMLDivElement | null) => {
    sceneRefs.current[i] = el;
  };

  return (
    <div style={{ background: "var(--color-bg)", color: "var(--color-text)", fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh" }}>
      <style>{`
        @keyframes gridBlink { 0%,45% { opacity: 1 } 50%,95% { opacity: 0 } 100% { opacity: 1 } }
        @keyframes gridPulse {
          0% { box-shadow: 0 0 0 0 rgba(212,255,0,0.45) }
          70% { box-shadow: 0 0 0 8px rgba(212,255,0,0) }
          100% { box-shadow: 0 0 0 0 rgba(212,255,0,0) }
        }
        .grid-shell { display: grid; grid-template-columns: minmax(0,1fr) minmax(340px,480px); min-height: 100vh; }
        .grid-auth-col { position: relative; border-left: 1px solid var(--border-color); background: var(--color-surface-1); }
        .grid-auth-inner { position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; justify-content: center; gap: 40px; padding: 36px 40px; min-width: 0; max-width: 460px; margin: 0 auto; }
        .grid-header, .grid-footer { display: flex; align-items: center; padding-left: 32px; padding-right: 32px; flex-shrink: 0; }
        .grid-rail { display: block; width: 120px; flex-shrink: 0; padding-left: 32px; box-sizing: border-box; }
        .grid-rail span { white-space: nowrap; }
        .grid-rail-sticky { position: sticky; top: 34vh; }
        .grid-scene-row { display: flex; flex: 1; }
        .grid-scene-content { padding: 40px 32px 0 40px; max-width: min(600px, 100%); min-width: 0; flex: 1 1 auto; display: flex; flex-direction: column; gap: 96px; margin-bottom: 96px; }
        .grid-story-inner { width: 100%; max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; flex: 1; }
        @media (max-width: 1023px) {
          .grid-shell { grid-template-columns: 1fr; }
          .grid-story-col { order: 2; }
          .grid-auth-col { order: 1; border-left: none; border-bottom: 1px solid var(--border-color); }
          .grid-auth-inner { position: relative; top: auto; height: auto; gap: 32px; max-width: 520px; }
          .grid-rail { display: none; }
          .grid-scene-content { padding: 32px 24px 0 24px; gap: 72px; margin-bottom: 72px; }
          .grid-header, .grid-footer { padding-left: 24px; padding-right: 24px; }
        }
        @media (max-width: 480px) {
          .grid-header, .grid-footer { padding-left: 18px; padding-right: 18px; }
          .grid-scene-content { padding-left: 18px; padding-right: 18px; gap: 56px; margin-bottom: 56px; }
          .grid-auth-inner { padding: 24px 18px; }
          .grid-mockup-sidebar { display: none; }
        }
        .grid-otp-input:focus { border-color: var(--color-primary) !important; }
        .grid-email-input:focus { border-color: var(--color-primary) !important; }
      `}</style>

      <div className="grid-shell">
        {/* ── LEFT: scroll story ── */}
        <div className="grid-story-col" style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div className="grid-header" style={{ justifyContent: "space-between", paddingTop: 22, paddingBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 26, height: 26, background: "var(--color-primary)", borderRadius: 6, display: "grid", placeItems: "center" }}>
                <div style={{ width: 12, height: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  {[0, 1, 2, 3].map((k) => (
                    <div key={k} style={{ background: "var(--color-text-inv)", borderRadius: 1 }} />
                  ))}
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
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-primary)", display: "inline-block" }} />
              {theme === "dark" ? "Dark" : "Light"}
            </button>
          </div>

        <div className="grid-story-inner">
          <div className="grid-scene-row">
            {/* progress rail */}
            <div className="grid-rail">
              <div className="grid-rail-sticky" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {RAIL_STEPS.map((name, i) => (
                  <div
                    key={name}
                    onClick={() => goToScene(i)}
                    style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "5px 0" }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: i === active ? "var(--color-primary)" : "var(--color-surface-5)",
                        transition: "background 0.3s",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: i === active ? "var(--color-text)" : "var(--color-text-muted)", transition: "color 0.3s" }}>
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid-scene-content">
              {/* Scene 0: Intro */}
              <div ref={setSceneRef(0)} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-primary)" }}>
                  Staffing platform for businesses
                </div>
                <h1 style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: "clamp(34px,4.2vw,42px)", lineHeight: 1.18, margin: 0, letterSpacing: "-0.01em" }}>
                  Hire verified shift &amp; gig staff across India.
                </h1>
                <p style={{ fontSize: 17, lineHeight: 1.65, color: "var(--color-text-sub)", margin: 0 }}>
                  Grid is Kria&apos;s hiring dashboard for businesses. Restaurants, event companies, retail stores, warehouses. Post the role, review workers with a verified performance history, hire in minutes, and confirm attendance on-site. No staffing agency, no middlemen.
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <button
                    onClick={() => goToScene(2)}
                    style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--color-primary)", color: "var(--color-text-inv)", border: "none", borderRadius: 999, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                  >
                    See how it works
                    <span style={{ fontSize: 14 }}>↓</span>
                  </button>
                  <a
                    href="mailto:support@trykria.com"
                    style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--border-color)", borderRadius: 999, padding: "10px 18px", fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}
                  >
                    Talk to us
                  </a>
                </div>
              </div>

              {/* Scene 1: Why Grid (before / after) */}
              <div ref={setSceneRef(1)}>
                <Reveal id="scene-1" register={register} visible={visible} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <h2 style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 26, margin: 0, lineHeight: 1.3 }}>
                    You&apos;re probably doing this the hard way
                  </h2>
                  <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "var(--color-text-sub)", margin: 0 }}>
                    Most businesses fill short-term shifts through phone calls, referrals, and hope. Here&apos;s what changes with Grid.
                  </p>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 260px", minWidth: 240, background: "var(--color-surface-1)", border: "1px solid var(--border-color)", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>Without Grid</div>
                      {WITHOUT_GRID.map((line) => (
                        <div key={line} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{ color: "var(--color-error)", fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>✕</span>
                          <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--color-text-sub)" }}>{line}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ flex: "1 1 260px", minWidth: 240, background: "var(--color-surface-1)", border: "1px solid var(--color-primary)", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-primary)" }}>With Grid</div>
                      {WITH_GRID.map((line) => (
                        <div key={line} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{ color: "var(--color-primary)", fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>✓</span>
                          <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--color-text)" }}>{line}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Reveal>
              </div>

              {/* Scene 2: Post a gig */}
              <div ref={setSceneRef(2)}>
                <Reveal id="scene-2" register={register} visible={visible} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <h2 style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 26, margin: 0, lineHeight: 1.3 }}>
                    Start with the work, not the paperwork
                  </h2>
                  <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "var(--color-text-sub)", margin: 0 }}>
                    Tell us what you need and when. A banquet crew for Saturday, two loaders for tonight. Watch, we&apos;ll fill this one in for you.
                  </p>
                  <div style={{ background: "var(--color-surface-1)", border: "1px solid var(--border-color)", borderRadius: 14, padding: 22, display: "flex", flexDirection: "column", gap: 12, maxWidth: 440 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" }}>Role</div>
                      <div style={{ background: "var(--color-surface-2)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "10px 14px", fontSize: 14, minHeight: 20, display: "flex", alignItems: "center" }}>
                        {typedRole}
                        <span style={{ display: "inline-block", width: 2, height: 16, background: "var(--color-primary)", marginLeft: 2, animation: "gridBlink 1.1s infinite" }} />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" }}>When</div>
                        <div style={{ background: "var(--color-surface-2)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "10px 14px", fontSize: 14, minHeight: 20, color: typedDone ? "var(--color-text)" : "var(--color-text-muted)", transition: "color 0.4s" }}>
                          Sat, 5 pm to 11 pm
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" }}>Pay</div>
                        <div style={{ background: "var(--color-surface-2)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "10px 14px", fontSize: 14, minHeight: 20, color: typedDone ? "var(--color-text)" : "var(--color-text-muted)", transition: "color 0.4s" }}>
                          ₹1,100 per shift
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setPublished(true)}
                      style={{
                        alignSelf: "flex-start",
                        background: published ? "var(--color-surface-3)" : "var(--color-primary)",
                        color: published ? "var(--color-text-sub)" : "var(--color-text-inv)",
                        border: "1px solid var(--border-subtle)",
                        fontSize: 13,
                        fontWeight: 700,
                        padding: "9px 18px",
                        borderRadius: 8,
                        marginTop: 4,
                        cursor: "pointer",
                        transition: "background 0.3s, color 0.3s",
                      }}
                    >
                      {published ? "Gig is live ✓" : "Publish gig"}
                    </button>
                  </div>
                </Reveal>
              </div>

              {/* Scene 3: Applicants */}
              <div ref={setSceneRef(3)}>
                <Reveal id="scene-3" register={register} visible={visible} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <h2 style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 26, margin: 0, lineHeight: 1.3 }}>
                    See who actually shows up
                  </h2>
                  <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "var(--color-text-sub)", margin: 0 }}>
                    Every Runner carries a Momentum score built from finished gigs. Did they turn up, were they on time, would the last host hire them again. Go ahead, hire someone.
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", fontSize: 11, color: "var(--color-text-muted)" }}>
                    {BAND_LEGEND.map((b) => (
                      <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: `var(${b.bandVar})`, flexShrink: 0 }} />
                        {b.label}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 480 }}>
                    {APPLICANTS.map((a, i) => {
                      const hired = !!accepted[a.name];
                      return (
                        <Reveal key={a.name} id={`applicant-${i}`} register={register} visible={visible} delay={i * 0.15}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              background: "var(--color-surface-1)",
                              border: `1px solid ${hired ? "var(--color-primary)" : "var(--border-color)"}`,
                              borderRadius: 12,
                              padding: "12px 14px",
                              transition: "border-color 0.3s",
                            }}
                          >
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--color-surface-4)", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, color: "var(--color-text-sub)", flexShrink: 0 }}>
                              {a.initials}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{a.name}</div>
                              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{a.meta}</div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
                              <div style={{ fontSize: 16, fontWeight: 700, color: `var(${a.bandVar})` }}>{a.score}</div>
                              <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--color-text-muted)" }}>{a.band}</div>
                            </div>
                            <button
                              onClick={() => setAccepted((prev) => ({ ...prev, [a.name]: !prev[a.name] }))}
                              style={{
                                background: hired ? "var(--color-primary)" : "transparent",
                                color: hired ? "var(--color-text-inv)" : "var(--color-text)",
                                border: "1px solid var(--border-color)",
                                fontSize: 12,
                                fontWeight: 700,
                                padding: "7px 13px",
                                borderRadius: 8,
                                cursor: "pointer",
                                transition: "background 0.25s, color 0.25s",
                                minWidth: 70,
                              }}
                            >
                              {hired ? "Hired" : "Accept"}
                            </button>
                          </div>
                        </Reveal>
                      );
                    })}
                    <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", paddingTop: 2, minHeight: 18 }}>
                      {acceptedCount === 0 ? "" : acceptedCount === 3 ? "Full crew. They'll be notified instantly." : `${acceptedCount} hired. They'd be notified instantly.`}
                    </div>
                  </div>
                </Reveal>
              </div>

              {/* Scene 4: Check-in */}
              <div ref={setSceneRef(4)}>
                <Reveal id="scene-4" register={register} visible={visible} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <h2 style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 26, margin: 0, lineHeight: 1.3 }}>
                    Attendance handles itself
                  </h2>
                  <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "var(--color-text-sub)", margin: 0 }}>
                    On the day, each worker confirms arrival with a one-time code at your venue. You know who is in before the shift starts, without keeping a register or chasing anyone on the phone.
                  </p>
                  <div style={{ background: "var(--color-surface-1)", border: "1px solid var(--border-color)", borderRadius: 14, padding: "20px 22px", display: "flex", alignItems: "center", gap: 16, maxWidth: 440 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      {["4", "8", "2", "1"].map((d, i) => (
                        <Reveal key={i} id={`otp-digit-${i}`} register={register} visible={visible} delay={0.2 + i * 0.25} scale>
                          <div style={{ width: 38, height: 46, border: "1px solid var(--border-color)", borderRadius: 8, display: "grid", placeItems: "center", fontFamily: "ui-monospace, monospace", fontSize: 19, fontWeight: 700, background: "var(--color-surface-2)" }}>
                            {d}
                          </div>
                        </Reveal>
                      ))}
                    </div>
                    <Reveal id="checkin-note" register={register} visible={visible} delay={1.2} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--color-primary)", animation: "gridPulse 2s infinite" }} />
                        Priya checked in
                      </div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>5:02 pm · Bandra West venue</div>
                    </Reveal>
                  </div>
                </Reveal>
              </div>

              {/* Scene 5: Events */}
              <div ref={setSceneRef(5)}>
                <Reveal id="scene-5" register={register} visible={visible} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <h2 style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 26, margin: 0, lineHeight: 1.3 }}>
                    One listing can hold a whole event
                  </h2>
                  <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "var(--color-text-sub)", margin: 0 }}>
                    Running a wedding or a festival? Bundle every role under a single event. Try adding a few roles to this one.
                  </p>
                  <div style={{ background: "var(--color-surface-1)", border: "1px solid var(--border-color)", borderRadius: 14, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12, maxWidth: 440 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>Mehta wedding · 3 days · Juhu</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{crewCount} workers</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {eventRoles.map((r) => (
                        <span key={r} style={{ fontSize: 12.5, fontWeight: 600, border: "1px solid var(--border-color)", borderRadius: 999, padding: "6px 12px" }}>
                          {r}
                        </span>
                      ))}
                      {eventRoles.length < 6 && (
                        <button
                          onClick={addRole}
                          style={{ fontSize: 12.5, fontWeight: 700, border: "1px dashed var(--border-color)", borderRadius: 999, padding: "6px 12px", background: "transparent", color: "var(--color-primary)", cursor: "pointer" }}
                        >
                          + Add a role
                        </button>
                      )}
                    </div>
                  </div>
                </Reveal>
              </div>

              {/* Scene 6: Close */}
              <div ref={setSceneRef(6)}>
                <Reveal id="scene-6" register={register} visible={visible} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <h2 style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 26, margin: 0, lineHeight: 1.3 }}>
                    This is what you&apos;ll be using
                  </h2>
                  <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "var(--color-text-sub)", margin: 0, maxWidth: 480 }}>
                    One dashboard for every gig, applicant, and shift. Here&apos;s a look at it.
                  </p>

                  {/* Dashboard mockup */}
                  <div style={{ border: "1px solid var(--border-color)", borderRadius: 14, overflow: "hidden", maxWidth: 520, background: "var(--color-surface-1)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid var(--border-subtle)", background: "var(--color-surface-2)" }}>
                      {["#ff7351", "#ffeb9c", "#8097ff"].map((c) => (
                        <span key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.6 }} />
                      ))}
                      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                        <span style={{ fontSize: 11, color: "var(--color-text-muted)", background: "var(--color-surface-3)", borderRadius: 999, padding: "3px 12px" }}>
                          grid.trykria.com/dashboard
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex" }}>
                      <div className="grid-mockup-sidebar" style={{ width: 108, flexShrink: 0, borderRight: "1px solid var(--border-subtle)", padding: "14px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
                        {["Dashboard", "Gigs", "Events", "Applications"].map((label, i) => (
                          <div
                            key={label}
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "6px 8px",
                              borderRadius: 6,
                              background: i === 0 ? "var(--color-primary)" : "transparent",
                              color: i === 0 ? "var(--color-text-inv)" : "var(--color-text-muted)",
                            }}
                          >
                            {label}
                          </div>
                        ))}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          {[
                            { label: "Active gigs", val: "4" },
                            { label: "Applicants", val: "18" },
                            { label: "This week", val: "6 shifts" },
                          ].map((s) => (
                            <div key={s.label} style={{ flex: 1, minWidth: 0, background: "var(--color-surface-2)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "8px 10px" }}>
                              <div style={{ fontSize: 15, fontWeight: 700 }}>{s.val}</div>
                              <div style={{ fontSize: 9.5, color: "var(--color-text-muted)" }}>{s.label}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {[
                            { title: "Banquet crew", status: "Filling", color: "var(--color-amber)" },
                            { title: "Warehouse loaders", status: "Live", color: "var(--color-primary)" },
                          ].map((g) => (
                            <div key={g.title} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--color-surface-2)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "8px 10px" }}>
                              <span style={{ fontSize: 11.5, fontWeight: 600 }}>{g.title}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: g.color }}>{g.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "var(--color-text-sub)", margin: 0, maxWidth: 480 }}>
                    It&apos;s free to start and there&apos;s nothing to install. Sign in on the right with your email and your first gig can be live today.
                  </p>
                </Reveal>
              </div>
            </div>
          </div>
        </div>

          <div className="grid-footer" style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 20, paddingBottom: 20, gap: 24, fontSize: 12.5, color: "var(--color-text-muted)", flexWrap: "wrap" }}>
            <span>© 2026 Kria</span>
            <a href="https://trykria.com" target="_blank" rel="noopener noreferrer">trykria.com</a>
            <a href="https://trykria.com/terms" target="_blank" rel="noopener noreferrer">Terms</a>
            <a href="https://trykria.com/privacy" target="_blank" rel="noopener noreferrer">Privacy</a>
            <a href="mailto:support@trykria.com">Contact</a>
          </div>
        </div>

        {/* ── RIGHT: sticky sign-in ── */}
        <div className="grid-auth-col">
          <div className="grid-auth-inner">
            {/* Live pulse */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 600, color: "var(--color-text-sub)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-primary)", animation: "gridPulse 2s infinite" }} />
                  Live across 8 cities
                </div>
                <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", fontVariantNumeric: "tabular-nums" }}>{istTime} IST</div>
              </div>
              <div style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 19, lineHeight: 1.4 }}>
                Hiring right now in
                <br />
                <span style={{ color: "var(--color-primary)", opacity: cityVisible ? 1 : 0, transition: "opacity 0.35s", display: "inline-block" }}>{CITIES[cityIdx]}</span>
              </div>
            </div>

            {/* Sign-in card */}
            <div style={{ background: "var(--color-bg)", border: "1px solid var(--border-color)", borderRadius: 16, padding: 30, display: "flex", flexDirection: "column", gap: 22 }}>
              {step === "email" && (
                <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontFamily: "var(--font-comfortaa), sans-serif", fontWeight: 700, fontSize: 22 }}>Sign in to Grid</div>
                    <div style={{ fontSize: 13.5, color: "var(--color-text-sub)", lineHeight: 1.6 }}>
                      Use your work email. We&apos;ll send a one-time code, so there&apos;s no password to remember.
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
                      placeholder="you@yourbusiness.in"
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
          </div>
        </div>
      </div>
    </div>
  );
}
