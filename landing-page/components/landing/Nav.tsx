"use client";
import { LIME } from "./constants";
import KriaWordmark from "./KriaWordmark";
import { useWindowWidth } from "./utils";
import { useT, useLang, type LangCode } from "./LanguageContext";

const LANG_LABELS: Record<LangCode, string> = { en: "EN", hi: "हि", ta: "த" };

export default function Nav() {
  const width    = useWindowWidth();
  const isMobile = width < 640;
  const t        = useT();
  const { lang, setLang } = useLang();

  return (
    <nav style={{
      position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
      zIndex: 20,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      maxWidth: 1160, padding: isMobile ? "20px 24px" : "28px 48px",
      width: "100%", gap: 12,
    }}>
      <KriaWordmark size={22} />

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Language toggle */}
        <div style={{
          display: "flex", gap: 2,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10, padding: 3,
        }}>
          {(["en", "hi", "ta"] as LangCode[]).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                padding: "5px 10px", borderRadius: 7,
                border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600,
                background: lang === l ? "rgba(212,255,0,0.12)" : "transparent",
                color: lang === l ? LIME : "rgba(255,255,255,0.3)",
                fontFamily: "inherit", transition: "all 0.2s",
              }}
            >
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })}
          style={{
            padding: "9px 22px", borderRadius: 12,
            border: "1px solid rgba(212,255,0,0.25)",
            background: "rgba(212,255,0,0.06)",
            color: LIME, fontSize: 13, fontWeight: 600,
            cursor: "pointer", transition: "all 0.2s",
            fontFamily: "inherit", whiteSpace: "nowrap",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background    = "rgba(212,255,0,0.12)";
            e.currentTarget.style.borderColor   = "rgba(212,255,0,0.5)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background    = "rgba(212,255,0,0.06)";
            e.currentTarget.style.borderColor   = "rgba(212,255,0,0.25)";
          }}
        >
          {t.nav.joinWaitlist}
        </button>
      </div>
    </nav>
  );
}
