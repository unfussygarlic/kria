"use client";

import { useWindowWidth } from "./utils";
import { useLang, type LangCode } from "./LanguageContext";

const LANG_LABELS: Record<LangCode, string> = { en: "EN", hi: "हि", ta: "த" };

export default function Nav() {
  const width = useWindowWidth();
  const isMobile = width < 860;
  const { lang, setLang } = useLang();

  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      background: "rgba(14, 18, 13, 0.82)",
      backdropFilter: "blur(18px)",
      WebkitBackdropFilter: "blur(18px)",
      borderBottom: "1px solid var(--hairline)",
    }}>
      <div style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: isMobile ? "0 20px" : "0 48px",
        height: isMobile ? 52 : 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}>
        {/* Wordmark */}
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1, flexShrink: 0 }}>
          <span style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 700,
            fontSize: isMobile ? 20 : 22,
            color: "var(--text)",
            letterSpacing: "-0.02em",
          }}>
            kria
            <span style={{ color: "var(--lime)" }}>.</span>
          </span>
          {!isMobile && (
            <span style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--muted)",
              letterSpacing: "0.04em",
              marginTop: 1,
            }}>India · 2026</span>
          )}
        </div>

        {/* Nav links — desktop only */}
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {["Pocket", "Grid", "Momentum"].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase()}`}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--muted-2)",
                  textDecoration: "none",
                  transition: "color 0.2s, background 0.2s",
                  fontFamily: "var(--font-sans)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = "var(--text)";
                  e.currentTarget.style.background = "var(--ink-3)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = "var(--muted-2)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {label}
              </a>
            ))}
          </div>
        )}

        {/* Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* Language toggle */}
          <div style={{
            display: "flex", gap: 2,
            background: "var(--ink-3)",
            border: "1px solid var(--hairline)",
            borderRadius: 9, padding: 3,
          }}>
            {(["en", "hi", "ta"] as LangCode[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  padding: "4px 9px", borderRadius: 6,
                  border: "none", cursor: "pointer",
                  fontSize: 11, fontWeight: 600,
                  background: lang === l ? "rgba(212,255,0,0.14)" : "transparent",
                  color: lang === l ? "var(--lime)" : "var(--muted)",
                  fontFamily: "var(--font-sans)", transition: "all 0.2s",
                }}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>

          {/* Post a gig CTA */}
          <a
            href="https://grid.trykria.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: isMobile ? "7px 14px" : "8px 18px",
              borderRadius: 10,
              border: "none",
              background: "var(--lime)",
              color: "var(--lime-ink)",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              textDecoration: "none",
              fontFamily: "var(--font-sans)",
              whiteSpace: "nowrap",
              display: "inline-block",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
          >
            {isMobile ? "Post a gig" : "Post a gig →"}
          </a>
        </div>
      </div>
    </nav>
  );
}
