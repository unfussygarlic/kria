"use client";

import { useState, useEffect, useRef } from "react";
import { LIME } from "../constants";
import { useWindowWidth } from "../utils";
import { useT } from "../LanguageContext";

function FileChip() {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 10px", borderRadius: 8, marginTop: 4,
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.12)",
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      </svg>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>CV.pdf</span>
    </div>
  );
}

export default function SectionWhyKria() {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(-1);
  const [played, setPlayed]     = useState(false);
  const width    = useWindowWidth();
  const isMobile = width < 860;
  const t        = useT();

  const THREAD = t.whyKria.thread;

  // Stagger: dividers fast, messages slightly slower
  const DELAYS = THREAD.map(item => item.kind === "divider" ? 320 : 480);

  const play = () => {
    setRevealed(-1);
    let acc = 200;
    THREAD.forEach((_, i) => {
      acc += DELAYS[i];
      setTimeout(() => setRevealed(i), acc);
    });
  };

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !played) { setPlayed(true); play(); obs.disconnect(); }
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [played]);

  // Re-play when language changes
  useEffect(() => {
    setPlayed(false);
    setRevealed(-1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  return (
    <section ref={sectionRef} style={{
      padding: isMobile ? "80px 24px" : "120px 48px",
      maxWidth: 1160, margin: "0 auto", width: "100%",
    }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 56 }}>
        <p style={{
          fontSize: 12, fontWeight: 700, letterSpacing: "0.1em",
          color: "rgba(255,255,255,0.28)", margin: "0 0 16px", textTransform: "uppercase",
        }}>
          {t.whyKria.sectionLabel}
        </p>
        <h2 style={{
          fontSize: "clamp(28px, 4.5vw, 56px)", fontWeight: 900,
          letterSpacing: "-0.03em", lineHeight: 1.05, margin: 0, color: "#fff",
          maxWidth: 680,
        }}>
          {t.whyKria.headline}{" "}
          <span style={{
            background: "linear-gradient(90deg,rgba(255,80,80,0.85),rgba(255,120,60,0.85))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            {t.whyKria.headlineHighlight}
          </span>
        </h2>
      </div>

      {/* ── Main grid ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1.1fr 0.9fr",
        gap: isMobile ? 32 : 40,
        alignItems: "start",
      }}>

        {/* ── Left: chat thread ── */}
        <div style={{
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(255,255,255,0.02)",
          overflow: "hidden",
        }}>
          {/* Chat header */}
          <div style={{
            padding: "14px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 99, flexShrink: 0,
              background: "rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
              </svg>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.whyKria.chatHeader}
              </p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", margin: 0 }}>
                {t.whyKria.chatSubtitle}
              </p>
            </div>
            {/* Replay */}
            <button
              onClick={() => { setPlayed(false); setTimeout(() => { setPlayed(true); play(); }, 50); }}
              style={{
                marginLeft: "auto", padding: "5px 12px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "transparent", color: "rgba(255,255,255,0.3)",
                fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3"/>
              </svg>
              {t.whyKria.replayBtn}
            </button>
          </div>

          {/* Messages */}
          <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6, minHeight: 340 }}>
            {THREAD.map((item, i) => {
              const visible = i <= revealed;

              if (item.kind === "divider") {
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10, margin: "8px 0",
                    opacity: visible ? 1 : 0,
                    transform: visible ? "none" : "translateY(4px)",
                    transition: "opacity 0.4s ease, transform 0.4s ease",
                  }}>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                    <span style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: "0.06em",
                      color: "rgba(255,100,100,0.5)", textTransform: "uppercase",
                      padding: "3px 10px", borderRadius: 99,
                      background: "rgba(255,80,80,0.06)",
                      border: "1px solid rgba(255,80,80,0.12)",
                      whiteSpace: "nowrap",
                    }}>
                      {item.text}
                    </span>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                  </div>
                );
              }

              const isSeeker = item.from === "seeker";
              const isLast   = i === THREAD.length - 1;

              return (
                <div key={i} style={{
                  display: "flex", flexDirection: "column",
                  alignItems: isSeeker ? "flex-start" : "flex-end",
                  opacity: visible ? (isLast ? 0.45 : 1) : 0,
                  transform: visible ? "none" : `translateY(8px) translateX(${isSeeker ? "-6px" : "6px"})`,
                  transition: "opacity 0.4s ease, transform 0.4s ease",
                }}>
                  <div style={{
                    maxWidth: "78%", padding: "9px 13px",
                    borderRadius: isSeeker ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                    background: isSeeker ? "rgba(255,255,255,0.07)" : "rgba(212,255,0,0.08)",
                    border: isSeeker ? "1px solid rgba(255,255,255,0.08)" : `1px solid rgba(212,255,0,0.12)`,
                  }}>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", margin: 0, lineHeight: 1.5 }}>
                      {item.text}
                    </p>
                    {item.file && <FileChip />}
                  </div>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 3, paddingLeft: 4 }}>
                    {item.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: kria way ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{
            fontSize: 12, fontWeight: 700, letterSpacing: "0.07em",
            textTransform: "uppercase", margin: "0 0 4px", color: "rgba(212,255,0,0.6)",
          }}>
            {t.whyKria.stepsLabel}
          </p>

          {t.whyKria.steps.map((step, i) => (
            <div key={step.n} style={{
              padding: "18px 20px", borderRadius: 16,
              border: `1px solid rgba(212,255,0,${0.14 - i * 0.02})`,
              background: `rgba(212,255,0,${0.04 - i * 0.005})`,
              display: "flex", alignItems: "center", gap: 16,
              opacity: revealed >= 0 ? 1 : 0,
              transform: revealed >= 0 ? "none" : "translateY(10px)",
              transition: `opacity 0.5s ease ${i * 120 + 200}ms, transform 0.5s ease ${i * 120 + 200}ms`,
            }}>
              <span style={{
                fontSize: 13, fontWeight: 800, fontFamily: "monospace",
                color: LIME, opacity: 0.5, flexShrink: 0, minWidth: 24,
              }}>{step.n}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>{step.title}</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", margin: "2px 0 0" }}>{step.sub}</p>
              </div>
              <div style={{
                width: 28, height: 28, borderRadius: 99, flexShrink: 0,
                background: "rgba(212,255,0,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={LIME} strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
          ))}

          {/* Time badge */}
          <div style={{
            padding: "14px 20px", borderRadius: 16,
            border: `1px solid rgba(212,255,0,0.2)`,
            background: "rgba(212,255,0,0.06)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            opacity: revealed >= THREAD.length - 1 ? 1 : 0,
            transform: revealed >= THREAD.length - 1 ? "none" : "translateY(6px)",
            transition: "opacity 0.5s ease 0.6s, transform 0.5s ease 0.6s",
          }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{t.whyKria.totalTimeLabel}</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: LIME, letterSpacing: "-0.02em" }}>
              {t.whyKria.totalTimeValue}
            </span>
          </div>

          {/* vs callout */}
          <div style={{
            padding: "14px 20px", borderRadius: 16,
            border: "1px solid rgba(255,80,80,0.12)",
            background: "rgba(255,80,80,0.04)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            opacity: revealed >= THREAD.length - 1 ? 1 : 0,
            transition: "opacity 0.5s ease 0.8s",
          }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{t.whyKria.vsLabel}</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "rgba(255,100,100,0.8)", letterSpacing: "-0.02em" }}>
              {t.whyKria.vsValue}
            </span>
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: width >= 500 ? "repeat(3, 1fr)" : "1fr",
        gap: 16, marginTop: 40,
      }}>
        {t.whyKria.stats.map(({ value, unit, desc }, i) => (
          <div key={desc} style={{
            padding: "24px", borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
            opacity: revealed >= THREAD.length - 1 ? 1 : 0,
            transform: revealed >= THREAD.length - 1 ? "none" : "translateY(12px)",
            transition: `opacity 0.5s ease ${i * 100 + 800}ms, transform 0.5s ease ${i * 100 + 800}ms`,
          }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
              <span style={{
                fontSize: 44, fontWeight: 900, lineHeight: 1,
                color: i === 2 ? LIME : "rgba(255,100,100,0.75)",
                letterSpacing: "-0.04em",
              }}>{value}</span>
              <span style={{
                fontSize: 16, fontWeight: 700,
                color: i === 2 ? "rgba(212,255,0,0.5)" : "rgba(255,100,100,0.4)",
              }}>{unit}</span>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", margin: 0, lineHeight: 1.5 }}>
              {desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
