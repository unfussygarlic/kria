"use client";

import { useRef, useState, useEffect } from "react";
import { LIME } from "../constants";
import { useFadeIn, useWindowWidth } from "../utils";
import { useT } from "../LanguageContext";

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={LIME} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function GridMockup() {
  return (
    <div style={{
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.1)",
      background: "#111510",
      overflow: "hidden",
      boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,255,0,0.06)",
      maxWidth: 480,
      width: "100%",
    }}>
      {/* Browser chrome */}
      <div style={{
        padding: "10px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", gap: 10,
        background: "#0d120c",
      }}>
        <div style={{ display: "flex", gap: 5 }}>
          {["#ff5f57","#febc2e","#28c840"].map(c => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: 99, background: c, opacity: 0.7 }} />
          ))}
        </div>
        <div style={{
          flex: 1, height: 22, borderRadius: 6,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", paddingLeft: 10, gap: 6,
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", fontFamily: "monospace" }}>
            grid.trykria.com
          </span>
        </div>
      </div>

      {/* Dashboard content */}
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.05em" }}>DASHBOARD</p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff" }}>Good morning, Priya</p>
          </div>
          <div style={{
            padding: "6px 12px", borderRadius: 8,
            background: LIME, color: "#000",
            fontSize: 11, fontWeight: 700, cursor: "pointer",
          }}>
            + Post Gig
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {[
            { label: "Active Gigs", value: "3" },
            { label: "Applicants", value: "12" },
            { label: "Avg Score",  value: "648" },
          ].map(s => (
            <div key={s.label} style={{
              padding: "10px 12px", borderRadius: 10,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#fff" }}>{s.value}</p>
              <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Applicant cards */}
        <div>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>
            RECENT APPLICANTS
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { name: "Rahul M.", score: 742, band: "Elite",    color: LIME,      role: "Event Bartender" },
              { name: "Sneha K.", score: 581, band: "Trusted",  color: "#FFC83D", role: "Brand Ambassador" },
              { name: "Arjun P.", score: 334, band: "Reliable", color: "#8097ff", role: "Event Bartender" },
            ].map(a => (
              <div key={a.name} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", borderRadius: 10,
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 99, flexShrink: 0,
                  background: `${a.color}1a`,
                  border: `1px solid ${a.color}33`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: a.color }}>
                    {a.name[0]}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#fff" }}>{a.name}</p>
                  <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.role}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: a.color,
                    padding: "2px 7px", borderRadius: 99,
                    background: `${a.color}12`,
                    border: `1px solid ${a.color}30`,
                  }}>
                    {a.score} · {a.band}
                  </span>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, cursor: "pointer",
                    background: "rgba(212,255,0,0.1)",
                    border: `1px solid ${LIME}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={LIME} strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, cursor: "pointer",
                    background: "rgba(255,80,80,0.08)",
                    border: "1px solid rgba(255,80,80,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,100,100,0.7)" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SectionGrid() {
  const { ref, visible } = useFadeIn(0.12);
  const width    = useWindowWidth();
  const isMobile = width < 860;
  const t        = useT();

  return (
    <section ref={ref} style={{
      padding: isMobile ? "80px 24px" : "120px 48px",
      position: "relative", overflow: "hidden",
      opacity: visible ? 1 : 0,
      transform: visible ? "none" : "translateY(28px)",
      transition: "opacity 0.7s ease, transform 0.7s ease",
    }}>

      {/* Ambient glow */}
      <div style={{
        position: "absolute", width: 600, height: 600,
        right: "-5%", top: "10%",
        background: "radial-gradient(circle,rgba(212,255,0,0.06) 0%,transparent 65%)",
        filter: "blur(90px)", pointerEvents: "none",
      }} />

      <div style={{
        position: "relative", zIndex: 1,
        maxWidth: 1160, margin: "0 auto",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: isMobile ? 48 : 80,
        alignItems: "center",
      }}>

        {/* Left — copy */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <p style={{
            fontSize: 12, fontWeight: 700, letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.28)", margin: 0, textTransform: "uppercase",
          }}>
            {t.grid.sectionLabel}
          </p>

          {/* LIVE badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 14px", borderRadius: 99,
            border: `1px solid ${LIME}33`,
            background: `${LIME}0d`,
            alignSelf: "flex-start",
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: 99, background: LIME,
              boxShadow: `0 0 8px ${LIME}`,
              animation: "pulseOpacity 2s ease-in-out infinite",
            }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: LIME, letterSpacing: "0.08em" }}>
              {t.grid.eyebrow}
            </span>
          </div>

          <h2 style={{
            fontSize: "clamp(28px, 3.8vw, 52px)", fontWeight: 900,
            letterSpacing: "-0.03em", lineHeight: 1.1, margin: 0, color: "#fff",
          }}>
            {t.grid.headline}{" "}
            <span style={{
              background: `linear-gradient(90deg,${LIME},#b8e000)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              {t.grid.headlineHighlight}
            </span>
          </h2>

          <p style={{ fontSize: 16, lineHeight: 1.7, color: "rgba(255,255,255,0.46)", margin: 0, maxWidth: 460 }}>
            {t.grid.sub}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {t.grid.features.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                  background: "rgba(212,255,0,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <CheckIcon />
                </div>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.52)", margin: 0, lineHeight: 1.55 }}>{f}</p>
              </div>
            ))}
          </div>

          <a
            href="https://grid.trykria.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              alignSelf: "flex-start",
              padding: "13px 28px", borderRadius: 12,
              background: LIME, color: "#000",
              fontSize: 14, fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex", alignItems: "center", gap: 8,
              boxShadow: `0 0 32px rgba(212,255,0,0.3), 0 4px 14px rgba(0,0,0,0.3)`,
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 0 48px rgba(212,255,0,0.5), 0 4px 16px rgba(0,0,0,0.3)`;
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 0 32px rgba(212,255,0,0.3), 0 4px 14px rgba(0,0,0,0.3)`;
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
            }}
          >
            {t.grid.cta}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </a>
        </div>

        {/* Right — dashboard mockup */}
        <div style={{
          display: "flex", justifyContent: isMobile ? "center" : "flex-end",
          animation: visible ? "float 6s ease-in-out infinite" : "none",
        }}>
          <GridMockup />
        </div>
      </div>
    </section>
  );
}
