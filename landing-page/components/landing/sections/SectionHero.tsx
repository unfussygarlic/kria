"use client";

import { useState, useEffect } from "react";
import PhoneFrame from "../PhoneFrame";
import { LIME, type Role } from "../constants";
import { useWindowWidth } from "../utils";
import { useT } from "../LanguageContext";

export default function SectionHero({ role, setRole }: { role: Role; setRole: (r: Role) => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const width    = useWindowWidth();
  const isMobile = width < 860;
  const t        = useT();

  return (
    <section style={{
      minHeight: "100vh",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      overflow: "hidden",
    }}>

      {/* Glow blobs */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", width: 700, height: 700, left: "50%", top: "-10%",
          transform: "translateX(-50%)",
          background: "radial-gradient(circle, rgba(212,255,0,0.14) 0%, transparent 60%)",
          filter: "blur(100px)", animation: "breathe 10s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", width: 500, height: 500, right: "-5%", top: "30%",
          background: "radial-gradient(circle, rgba(212,255,0,0.08) 0%, transparent 60%)",
          filter: "blur(110px)", animation: "breathe 13s ease-in-out infinite reverse",
        }} />
        <div style={{
          position: "absolute", width: 400, height: 400, left: "-5%", top: "40%",
          background: "radial-gradient(circle, rgba(128,151,255,0.07) 0%, transparent 60%)",
          filter: "blur(90px)",
        }} />
      </div>

      {/* ── Two-column body ── */}
      <div style={{
        position: "relative", zIndex: 10,
        flex: 1, display: "flex",
        alignItems: "center",
        flexDirection: isMobile ? "column" : "row",
        maxWidth: 1100, margin: "0 auto", width: "100%",
        padding: isMobile ? "120px 24px 60px" : "100px 48px 80px",
        gap: isMobile ? 44 : 60,
      }}>

        {/* Left — copy */}
        <div style={{
          flex: "1 1 0", minWidth: 0,
          display: "flex", flexDirection: "column",
          gap: 26,
          alignItems: isMobile ? "center" : "flex-start",
          textAlign: isMobile ? "center" : "left",
        }}>

          {/* Eyebrow */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 14px", borderRadius: 99,
            border: "1px solid rgba(212,255,0,0.2)",
            background: "rgba(212,255,0,0.06)",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: 99, background: LIME,
              boxShadow: `0 0 8px ${LIME}`, display: "block",
              animation: "pulseOpacity 2s ease-in-out infinite",
            }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(212,255,0,0.8)", letterSpacing: "0.05em" }}>
              {t.hero.eyebrow}
            </span>
          </div>

          {/* Headline */}
          <h1 style={{ margin: 0 }}>
            {[
              { text: t.hero.headlineLine1, lime: false },
              { text: t.hero.headlineLine2, lime: true  },
            ].map(({ text, lime }) => (
              <span key={text} style={{
                display: "block",
                fontSize: "clamp(44px, 6vw, 80px)",
                fontWeight: 900, lineHeight: 1.0,
                letterSpacing: "-0.04em",
                ...(lime
                  ? { background: `linear-gradient(95deg,${LIME},#b8e000)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }
                  : { color: "#fff" }),
              }}>{text}</span>
            ))}
          </h1>

          {/* Sub */}
          <p style={{
            fontSize: 17, lineHeight: 1.7,
            color: "rgba(255,255,255,0.5)", margin: 0, maxWidth: 400,
          }}>
            {t.hero.sub}
          </p>

          {/* Role toggle */}
          <div style={{
            display: "inline-flex",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14, padding: 4, gap: 4,
          }}>
            {([["runner", t.hero.runnerLabel], ["host", t.hero.hostLabel]] as [Role, string][]).map(([r, label]) => (
              <button key={r} onClick={() => setRole(r)} style={{
                padding: "9px 22px", borderRadius: 10,
                border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600,
                transition: "all 0.25s",
                fontFamily: "inherit",
                ...(role === r
                  ? { background: LIME, color: "#000", boxShadow: "0 0 18px rgba(212,255,0,0.3)" }
                  : { background: "transparent", color: "rgba(255,255,255,0.38)" }),
              }}>
                {label}
              </button>
            ))}
          </div>

          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", margin: 0, fontWeight: 500 }}>
            {role === "runner" ? t.hero.runnerHint : t.hero.hostHint}
          </p>

          {/* CTA */}
          <button
            onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })}
            style={{
              alignSelf: isMobile ? "center" : "flex-start",
              padding: "15px 32px", borderRadius: 14, border: "none",
              background: LIME, color: "#000", fontSize: 15, fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 0 36px rgba(212,255,0,0.4), 0 4px 18px rgba(0,0,0,0.4)",
              transition: "all 0.2s",
              display: "inline-flex", alignItems: "center", gap: 8,
              fontFamily: "inherit",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = "0 0 52px rgba(212,255,0,0.6), 0 4px 20px rgba(0,0,0,0.4)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = "0 0 36px rgba(212,255,0,0.4), 0 4px 18px rgba(0,0,0,0.4)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {t.hero.cta}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>

        {/* Right — phone */}
        <div style={{
          flex: "0 0 auto",
          display: "flex", justifyContent: "center", alignItems: "center",
          animation: mounted ? "float 6s ease-in-out infinite" : "none",
        }}>
          <PhoneFrame role={role} />
        </div>
      </div>

      {/* Scroll cue */}
      {!isMobile && (
        <div style={{
          position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6, zIndex: 10,
        }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", letterSpacing: "0.08em", fontWeight: 500 }}>SCROLL</span>
          <div style={{ width: 1, height: 28, background: "linear-gradient(to bottom,rgba(255,255,255,0.18),transparent)" }} />
        </div>
      )}
    </section>
  );
}
