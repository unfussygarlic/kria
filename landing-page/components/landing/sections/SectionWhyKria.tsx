"use client";

import { useState, useEffect, useRef } from "react";
import { LIME } from "../constants";
import { useWindowWidth } from "../utils";

const OLD_STEPS = [
  { text: "Find a job board that has gig work", time: "~10 min" },
  { text: "Create an account", time: "~5 min" },
  { text: "Upload your resume", time: "~15 min" },
  { text: "Fill out a long application", time: "~20 min" },
  { text: "Wait for your application to be reviewed", time: "1–3 days" },
  { text: "Get a callback (if you're lucky)", time: "2–5 days" },
  { text: "Schedule an interview", time: "+1 day" },
  { text: "Wait for a decision", time: "+2 days" },
];

const NEW_STEPS = [
  { text: "Open kria", sub: "Seeker or Finder" },
  { text: "Browse shifts near you", sub: "Live gigs, real pay" },
  { text: "Swipe up to apply", sub: "One gesture. Done." },
  { text: "Show up and work", sub: "Same day, sometimes" },
];

// Total time for old way animation: 8 steps × 550ms = 4.4s
// Total time for new way animation: 4 steps × 120ms = 0.48s
const OLD_DELAY = 550;
const NEW_DELAY = 120;

export default function SectionWhyKria() {
  const sectionRef = useRef<HTMLElement>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [oldVisible, setOldVisible] = useState<number>(-1); // index of last visible step
  const [newVisible, setNewVisible] = useState<number>(-1);
  const [showResult, setShowResult] = useState(false);
  const width = useWindowWidth();
  const isMobile = width < 720;

  const runAnimation = () => {
    setOldVisible(-1);
    setNewVisible(-1);
    setShowResult(false);

    // New way: fast
    NEW_STEPS.forEach((_, i) => {
      setTimeout(() => setNewVisible(i), i * NEW_DELAY);
    });

    // Old way: slow
    OLD_STEPS.forEach((_, i) => {
      setTimeout(() => setOldVisible(i), i * OLD_DELAY);
    });

    // Result after old finishes
    setTimeout(() => setShowResult(true), OLD_STEPS.length * OLD_DELAY + 400);
  };

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !hasPlayed) {
          setHasPlayed(true);
          setTimeout(runAnimation, 300);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPlayed]);

  return (
    <section ref={sectionRef} style={{
      padding: isMobile ? "80px 24px" : "120px 48px",
      maxWidth: 1160, margin: "0 auto", width: "100%",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 56, display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.28)", margin: 0, textTransform: "uppercase" }}>
          Why we built this
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <h2 style={{
            fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900,
            letterSpacing: "-0.03em", lineHeight: 1.1, margin: 0, color: "#fff",
          }}>
            Gig hiring has{" "}
            <span style={{
              background: "linear-gradient(90deg,rgba(255,80,80,0.9),rgba(255,120,80,0.9))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              8 steps.
            </span>
            {" "}Ours has{" "}
            <span style={{
              background: `linear-gradient(90deg,${LIME},#b8e000)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              4.
            </span>
          </h2>
          <button
            onClick={runAnimation}
            style={{
              padding: "8px 18px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600,
              cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 6,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 .49-3" />
            </svg>
            Replay
          </button>
        </div>
      </div>

      {/* Race columns */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: isMobile ? 40 : 48,
        alignItems: "start",
      }}>

        {/* Old way */}
        <div>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 16,
          }}>
            <p style={{
              fontSize: 12, fontWeight: 700, letterSpacing: "0.07em",
              textTransform: "uppercase", margin: 0,
              color: "rgba(255,100,100,0.6)",
            }}>
              The old way
            </p>
            {showResult && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
                background: "rgba(255,80,80,0.1)", color: "rgba(255,100,100,0.7)",
                border: "1px solid rgba(255,80,80,0.2)",
                animation: "fadeInUp 0.4s ease forwards",
              }}>
                ~7 days
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {OLD_STEPS.map((step, i) => (
              <div key={step.text} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "11px 14px", borderRadius: 11,
                border: "1px solid rgba(255,255,255,0.05)",
                background: i <= oldVisible ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)",
                opacity: i <= oldVisible ? 1 : 0.18,
                transform: i <= oldVisible ? "translateX(0)" : "translateX(-6px)",
                transition: "opacity 0.35s ease, transform 0.35s ease, background 0.3s",
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 99, flexShrink: 0,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: i <= oldVisible ? "rgba(255,255,255,0.06)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.3s",
                }}>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", flex: 1 }}>
                  {step.text}
                </span>
                <span style={{
                  fontSize: 10, color: "rgba(255,100,100,0.45)", fontFamily: "monospace",
                  flexShrink: 0, opacity: i <= oldVisible ? 1 : 0,
                  transition: "opacity 0.3s",
                }}>
                  {step.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Kria way */}
        <div>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 16,
          }}>
            <p style={{
              fontSize: 12, fontWeight: 700, letterSpacing: "0.07em",
              textTransform: "uppercase", margin: 0, color: "rgba(212,255,0,0.6)",
            }}>
              The kria way
            </p>
            {showResult && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
                background: "rgba(212,255,0,0.1)", color: LIME,
                border: `1px solid rgba(212,255,0,0.25)`,
                animation: "fadeInUp 0.4s ease forwards",
              }}>
                ~90 seconds
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {NEW_STEPS.map((step, i) => (
              <div key={step.text} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px", borderRadius: 13,
                border: `1px solid ${i <= newVisible ? "rgba(212,255,0,0.18)" : "rgba(255,255,255,0.04)"}`,
                background: i <= newVisible ? "rgba(212,255,0,0.04)" : "rgba(255,255,255,0.01)",
                opacity: i <= newVisible ? 1 : 0.15,
                transform: i <= newVisible ? "translateX(0)" : "translateX(6px)",
                transition: "opacity 0.3s ease, transform 0.3s ease, border-color 0.3s, background 0.3s",
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 99, flexShrink: 0,
                  background: i <= newVisible ? LIME : "rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: i <= newVisible ? `0 0 14px rgba(212,255,0,0.3)` : "none",
                  transition: "all 0.3s",
                }}>
                  <span style={{
                    fontSize: 12, fontWeight: 800,
                    color: i <= newVisible ? "#000" : "rgba(255,255,255,0.2)",
                    transition: "color 0.3s",
                  }}>{i + 1}</span>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: i <= newVisible ? "#fff" : "rgba(255,255,255,0.3)", margin: 0, transition: "color 0.3s" }}>
                    {step.text}
                  </p>
                  <p style={{ fontSize: 11, color: i <= newVisible ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.15)", margin: 0, transition: "color 0.3s" }}>
                    {step.sub}
                  </p>
                </div>
              </div>
            ))}

            {/* Done flash */}
            {newVisible >= NEW_STEPS.length - 1 && (
              <div style={{
                padding: "12px 16px", borderRadius: 13,
                border: `1px solid rgba(212,255,0,0.3)`,
                background: "rgba(212,255,0,0.07)",
                display: "flex", alignItems: "center", gap: 10,
                animation: "fadeInUp 0.4s ease forwards",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={LIME} strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span style={{ fontSize: 14, fontWeight: 700, color: LIME }}>You&apos;re hired.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
