"use client";

import { LIME } from "../constants";
import { useFadeIn, useWindowWidth } from "../utils";
import { useT } from "../LanguageContext";

const FEATURE_META = [
  {
    color: "#8097ff",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8097ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <polyline points="9 12 11 14 15 10"/>
      </svg>
    ),
  },
  {
    color: "#FFC83D",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFC83D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="10" r="3"/>
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      </svg>
    ),
  },
  {
    color: LIME,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={LIME} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="6"/>
        <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
      </svg>
    ),
  },
];

export default function SectionFeatures() {
  const { ref, visible } = useFadeIn(0.1);
  const width    = useWindowWidth();
  const isMobile = width < 640;
  const t        = useT();

  return (
    <section ref={ref} style={{
      padding: isMobile ? "64px 24px" : "100px 48px",
      opacity: visible ? 1 : 0,
      transform: visible ? "none" : "translateY(24px)",
      transition: "opacity 0.7s ease, transform 0.7s ease",
    }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 48, textAlign: isMobile ? "center" : "left" }}>
          <p style={{
            fontSize: 12, fontWeight: 700, letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.28)", margin: "0 0 16px", textTransform: "uppercase",
          }}>
            {t.features.sectionLabel}
          </p>
          <h2 style={{
            fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 900,
            letterSpacing: "-0.03em", lineHeight: 1.05, margin: 0, color: "#fff",
          }}>
            {t.features.headline}{" "}
            <span style={{
              background: `linear-gradient(90deg,${LIME},#b8e000)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              {t.features.headlineHighlight}
            </span>
          </h2>
        </div>

        {/* Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)",
          gap: 16,
        }}>
          {t.features.items.map((item, i) => {
            const meta = FEATURE_META[i];
            return (
              <div
                key={item.title}
                style={{
                  padding: "28px 24px", borderRadius: 20,
                  border: `1px solid ${meta.color}22`,
                  background: `${meta.color}07`,
                  display: "flex", flexDirection: "column", gap: 16,
                  opacity: visible ? 1 : 0,
                  transform: visible ? "none" : "translateY(16px)",
                  transition: `opacity 0.6s ease ${i * 120 + 100}ms, transform 0.6s ease ${i * 120 + 100}ms`,
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: `${meta.color}12`,
                  border: `1px solid ${meta.color}22`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {meta.icon}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <h3 style={{
                    fontSize: 18, fontWeight: 800, color: "#fff",
                    margin: 0, letterSpacing: "-0.02em",
                  }}>
                    {item.title}
                  </h3>
                  <p style={{
                    fontSize: 14, color: "rgba(255,255,255,0.45)",
                    margin: 0, lineHeight: 1.65,
                  }}>
                    {item.sub}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
