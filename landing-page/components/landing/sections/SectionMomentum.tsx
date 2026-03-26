"use client";

import MomentumGauge from "../MomentumGauge";
import { LIME, BANDS } from "../constants";
import { useFadeIn, useWindowWidth } from "../utils";
import { useT } from "../LanguageContext";

const POINT_ICONS = [
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
];

export default function SectionMomentum() {
  const { ref, visible } = useFadeIn(0.15);
  const width    = useWindowWidth();
  const isMobile = width < 860;
  const t        = useT();

  return (
    <section ref={ref} style={{
      borderTop: "1px solid rgba(255,255,255,0.05)",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      padding: isMobile ? "80px 24px" : "120px 48px",
      position: "relative", overflow: "hidden",
      opacity: visible ? 1 : 0,
      transform: visible ? "none" : "translateY(28px)",
      transition: "opacity 0.7s ease, transform 0.7s ease",
    }}>

      {/* Ambient glow */}
      <div style={{
        position: "absolute", width: 500, height: 500,
        left: "50%", top: "50%", transform: "translate(-50%,-50%)",
        background: "radial-gradient(circle,rgba(212,255,0,0.07) 0%,transparent 65%)",
        filter: "blur(80px)", pointerEvents: "none",
        animation: "breathe 8s ease-in-out infinite",
      }} />

      <div style={{
        position: "relative", zIndex: 1,
        maxWidth: 1160, margin: "0 auto",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: isMobile ? 56 : 80,
        alignItems: "center",
      }}>

        {/* Left — gauge + bands */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
          <MomentumGauge score={742} animate={visible} />

          {/* Band pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {BANDS.map(b => (
              <span key={b.label} style={{
                fontSize: 11, fontWeight: 600,
                padding: "5px 14px", borderRadius: 99,
                border: `1px solid ${b.color}33`,
                background: `${b.color}0e`,
                color: b.color,
              }}>
                {t.momentum.bands[b.label as keyof typeof t.momentum.bands]}
                <span style={{ marginLeft: 6, opacity: 0.5, fontSize: 10 }}>
                  {b.range[0]}–{b.range[1]}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Right — copy */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <p style={{
            fontSize: 12, fontWeight: 700, letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.28)", margin: 0, textTransform: "uppercase",
          }}>
            {t.momentum.sectionLabel}
          </p>
          <h2 style={{
            fontSize: "clamp(28px, 3.8vw, 50px)", fontWeight: 900,
            letterSpacing: "-0.03em", lineHeight: 1.1, margin: 0, color: "#fff",
          }}>
            {t.momentum.headline}{" "}
            <span style={{
              background: `linear-gradient(90deg,${LIME},#b8e000)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              {t.momentum.headlineHighlight}
            </span>
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: "rgba(255,255,255,0.48)", margin: 0 }}>
            {t.momentum.sub}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4 }}>
            {t.momentum.points.map((text, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: "rgba(212,255,0,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={LIME} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={POINT_ICONS[i]} />
                  </svg>
                </div>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.52)", margin: 0, lineHeight: 1.65, paddingTop: 7 }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
