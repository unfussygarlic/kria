"use client";

import SwipeStack from "../SwipeStack";
import { useWindowWidth } from "../utils";

const FEATURES = [
  { n: "01", title: "Swipe", sub: "A deck, not a search bar." },
  { n: "02", title: "GPS", sub: "Nearest first." },
  { n: "03", title: "OTP", sub: "Four digits, in person." },
  { n: "04", title: "KYC", sub: "Verified, not just claimed." },
];

function PhoneMockup() {
  return (
    <div style={{
      width: 260,
      background: "var(--ink-3)",
      border: "1.5px solid var(--hairline-strong)",
      borderRadius: 36,
      overflow: "hidden",
      boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)",
      position: "relative",
      flexShrink: 0,
    }}>
      {/* Notch */}
      <div style={{
        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 100, height: 26,
        background: "var(--ink)",
        borderRadius: "0 0 18px 18px",
        zIndex: 5,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        paddingBottom: 5,
        gap: 8,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: 99, background: "var(--ink-4)" }} />
        <div style={{ width: 10, height: 3, borderRadius: 3, background: "var(--ink-4)" }} />
      </div>

      {/* Status bar */}
      <div style={{
        height: 40,
        padding: "26px 20px 4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--text)" }}>9:41</span>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <svg width="14" height="10" viewBox="0 0 14 10" fill="var(--text)">
            <rect x="0" y="4" width="2" height="6" rx="1"/>
            <rect x="3" y="2.5" width="2" height="7.5" rx="1"/>
            <rect x="6" y="1" width="2" height="9" rx="1"/>
            <rect x="9" y="0" width="2" height="10" rx="1"/>
          </svg>
        </div>
      </div>

      {/* App header */}
      <div style={{
        padding: "8px 18px 12px",
        borderBottom: "1px solid var(--hairline)",
      }}>
        <div style={{
          fontSize: 16, fontWeight: 700, color: "var(--text)", lineHeight: 1,
        }}>Hi, Priya.</div>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 11,
          color: "var(--muted)", marginTop: 3,
        }}>7 gigs near you</div>
      </div>

      {/* Filter pills */}
      <div style={{
        padding: "10px 18px",
        display: "flex", gap: 6, flexWrap: "nowrap", overflow: "hidden",
      }}>
        {["All", "Today", "F&B", "Retail"].map((pill, i) => (
          <span key={pill} style={{
            padding: "4px 10px",
            borderRadius: 99,
            border: "1px solid " + (i === 0 ? "var(--lime)" : "var(--hairline)"),
            background: i === 0 ? "rgba(212,255,0,0.14)" : "transparent",
            color: i === 0 ? "var(--lime)" : "var(--muted)",
            fontSize: 10,
            fontWeight: 600,
            flexShrink: 0,
          }}>{pill}</span>
        ))}
      </div>

      {/* SwipeStack compact */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        padding: "0 0 8px",
        overflow: "hidden",
        height: 300,
        position: "relative",
      }}>
        <div style={{ transform: "scale(0.78)", transformOrigin: "top center", pointerEvents: "none" }}>
          <SwipeStack compact />
        </div>
      </div>

      {/* Bottom tab bar */}
      <div style={{
        borderTop: "1px solid var(--hairline)",
        padding: "10px 18px 18px",
        display: "flex",
        justifyContent: "space-around",
      }}>
        {[
          { icon: "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10", label: "Gigs" },
          { icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z", label: "Momentum" },
          { icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", label: "Me" },
        ].map(({ icon, label }, i) => (
          <div key={label} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={i === 0 ? "var(--lime)" : "var(--muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={icon}/>
            </svg>
            <span style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: i === 0 ? "var(--lime)" : "var(--muted)",
            }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SectionPocket() {
  const width = useWindowWidth();
  const isMobile = width < 860;

  return (
    <section id="pocket" style={{
      padding: isMobile ? "80px 20px" : "100px 48px",
      maxWidth: 1200,
      margin: "0 auto",
    }}>
      {/* Kicker */}
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--muted)",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        marginBottom: 20,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: 99, background: "var(--gold)", display: "inline-block" }} />
        Field gear — for Runners
      </div>

      {/* Headline */}
      <h2 style={{
        fontFamily: "var(--font-serif)",
        fontWeight: 700,
        fontSize: "clamp(32px, 4.8vw, 64px)",
        lineHeight: 1.05,
        letterSpacing: "-0.025em",
        color: "var(--text)",
        margin: "0 0 14px",
        maxWidth: 700,
      }}>
        Open the app. The work is already nearby.
      </h2>

      {/* Lead */}
      <p style={{
        fontSize: 17,
        lineHeight: 1.65,
        color: "var(--muted-2)",
        margin: "0 0 48px",
        maxWidth: 560,
      }}>
        Pocket is kria&apos;s mobile app for Runners. Swipe through a curated deck of nearby gigs, apply in a tap, and check in with OTP when you arrive. Your Momentum builds with every shift.
      </p>

      {/* Two-column */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "auto 1fr",
        gap: isMobile ? 48 : 72,
        alignItems: "start",
      }}>
        {/* Phone mockup */}
        <div style={{ display: "flex", justifyContent: isMobile ? "center" : "flex-start" }}>
          <PhoneMockup />
        </div>

        {/* Feature list */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
          paddingTop: isMobile ? 0 : 16,
        }}>
          {FEATURES.map(({ n, title, sub }, i) => (
            <div
              key={n}
              style={{
                padding: "22px 0",
                borderBottom: i < FEATURES.length - 1 ? "1px solid var(--hairline)" : "none",
                display: "flex",
                gap: 20,
                alignItems: "flex-start",
              }}
            >
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--muted)",
                paddingTop: 3,
                flexShrink: 0,
                letterSpacing: "0.04em",
              }}>{n}</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--lime)",
                  letterSpacing: "0.04em",
                }}>· {title}</span>
                <span style={{
                  fontSize: 16,
                  color: "var(--muted-2)",
                  lineHeight: 1.5,
                }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
