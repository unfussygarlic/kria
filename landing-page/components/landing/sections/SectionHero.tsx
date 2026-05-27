"use client";

import SwipeStack from "../SwipeStack";
import { useWindowWidth } from "../utils";

const STATS = [
  { value: "12,418", sub: "Bengaluru, Mumbai, Pune, Hyderabad", label: "Runners onboarded" },
  { value: "8 min, 12 sec", sub: "Across all gigs filed last week", label: "Median apply→accept" },
  { value: "94.2%", sub: "OTP-confirmed arrivals at check-in", label: "Show-up rate" },
  { value: "₹2.8 Cr", sub: "Wages settled within 48 hours", label: "Paid out, last 30 days" },
];

export default function SectionHero() {
  const width = useWindowWidth();
  const isMobile = width < 860;

  return (
    <>
      <section style={{
        background: "var(--ink)",
        padding: isMobile ? "56px 20px 60px" : "72px 48px 80px",
        maxWidth: 1200,
        margin: "0 auto",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1.1fr 0.9fr",
          gap: isMobile ? 48 : 64,
          alignItems: "start",
        }}>
          {/* Left: copy */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Meta top */}
            <div style={{
              display: "flex", alignItems: "center", gap: 16,
              flexWrap: "wrap",
            }}>
              {/* Stamp */}
              <div style={{
                display: "inline-block",
                border: "1.5px solid rgba(212,255,0,0.4)",
                borderRadius: 6,
                padding: "3px 9px",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--lime)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                transform: "rotate(-2deg)",
                opacity: 0.85,
              }}>
                Issue 04 · May 2026
              </div>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--muted)",
                letterSpacing: "0.03em",
              }}>
                Filed from Bengaluru, 28.6° C
              </span>
            </div>

            {/* Headline */}
            <h1 style={{
              margin: 0,
              lineHeight: 0.92,
              letterSpacing: "-0.03em",
            }}>
              <span style={{
                display: "block",
                fontFamily: "var(--font-serif)",
                fontWeight: 700,
                fontSize: "clamp(56px, 8.4vw, 116px)",
                color: "var(--text)",
              }}>
                Short gigs.
              </span>
              <span style={{
                display: "block",
                fontFamily: "var(--font-serif)",
                fontWeight: 700,
                fontSize: "clamp(56px, 8.4vw, 116px)",
                color: "var(--text)",
              }}>
                Long{" "}
                <em style={{
                  fontStyle: "italic",
                  color: "var(--lime)",
                }}>momentum.</em>
              </span>
            </h1>

            {/* Lead */}
            <p style={{
              fontSize: 18,
              lineHeight: 1.65,
              color: "var(--muted-2)",
              margin: 0,
              maxWidth: 520,
            }}>
              There are{" "}
              <span style={{ textDecoration: "underline", textDecorationColor: "rgba(244,239,227,0.35)" }}>
                12 million daily-wage workers in India
              </span>{" "}
              who can&apos;t put <em>reliable</em> on a CV. kria is the receipt book that proves it for them — and the dashboard that lets Hosts hire by track record, not{" "}
              <span style={{
                background: "rgba(212,255,0,0.22)",
                borderRadius: 3,
                padding: "0 3px",
                color: "var(--text)",
              }}>
                a paragraph of hopes.
              </span>
            </p>

            {/* CTA row */}
            <div style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 4,
            }}>
              <a
                href="https://grid.trykria.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  padding: "13px 26px",
                  borderRadius: 12,
                  background: "var(--lime)",
                  color: "var(--lime-ink)",
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: "none",
                  fontFamily: "var(--font-sans)",
                  transition: "opacity 0.2s, transform 0.2s",
                  boxShadow: "0 0 32px rgba(212,255,0,0.35)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.opacity = "0.88";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                Post a gig on Grid →
              </a>

              <button
                style={{
                  padding: "12px 22px",
                  borderRadius: 12,
                  border: "1px solid var(--hairline-strong)",
                  background: "transparent",
                  color: "var(--muted-2)",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "default",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Pocket — coming soon
              </button>

              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--muted)",
              }}>
                Free until you fill it.
              </span>
            </div>
          </div>

          {/* Right: SwipeStack */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 16,
            paddingTop: isMobile ? 0 : 16,
            position: "relative",
          }}>
            {/* Curved arrow hint */}
            {!isMobile && (
              <div style={{
                position: "absolute",
                top: -8,
                left: -40,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                opacity: 0.7,
              }}>
                <svg width="60" height="48" viewBox="0 0 60 48" fill="none">
                  <path
                    d="M8 4 C8 4, 40 0, 52 32"
                    stroke="var(--lime)"
                    strokeWidth="1.5"
                    fill="none"
                    strokeDasharray="4 3"
                  />
                  <path d="M46 38 L54 30 L58 40" stroke="var(--lime)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--lime)",
                  letterSpacing: "0.04em",
                }}>try it ↘</span>
              </div>
            )}

            <SwipeStack />
          </div>
        </div>
      </section>

      {/* Stats Ribbon */}
      <div style={{
        borderTop: "1px solid var(--hairline)",
        borderBottom: "1px solid var(--hairline)",
        background: "var(--ink-2)",
      }}>
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: isMobile ? "0 20px" : "0 48px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
        }}>
          {STATS.map((s, i) => (
            <div
              key={s.label}
              style={{
                padding: isMobile ? "24px 0" : "28px 0",
                paddingLeft: i > 0 ? (isMobile ? 16 : 28) : 0,
                paddingRight: i < STATS.length - 1 ? (isMobile ? 16 : 28) : 0,
                borderLeft: i > 0 ? "1px solid var(--hairline)" : "none",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 700,
                fontSize: isMobile ? 22 : 28,
                color: "var(--text)",
                lineHeight: 1,
              }}>{s.value}</span>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: isMobile ? 9 : 10,
                color: "var(--muted)",
                lineHeight: 1.4,
                marginTop: 2,
              }}>{s.sub}</span>
              <span style={{
                fontSize: isMobile ? 11 : 12,
                color: "var(--muted-2)",
                marginTop: 1,
              }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
