"use client";

import { LIME, SURFACE, SURFACE2, GIG_CARDS, type Role } from "./constants";
import KriaWordmark from "./KriaWordmark";

function TopCard({ role }: { role: Role }) {
  const card = GIG_CARDS[0];
  return (
    <div style={{
      height: "100%", borderRadius: 20, padding: "14px 14px 10px",
      background: "linear-gradient(150deg, rgba(255,255,255,0.09), rgba(255,255,255,0.04))",
      border: "1px solid rgba(212,255,0,0.22)",
      boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      {/* tag + pay */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
          padding: "3px 9px", borderRadius: 99,
          background: `${card.categoryColor}18`, color: card.categoryColor,
        }}>
          {card.category.toUpperCase()}
        </span>
        <span style={{
          fontSize: 12, fontWeight: 700, color: LIME,
          background: "rgba(212,255,0,0.1)", padding: "2px 8px", borderRadius: 8,
        }}>
          {card.pay}
        </span>
      </div>

      {/* title */}
      <div>
        <p style={{ fontSize: 17, fontWeight: 800, color: "#fff", lineHeight: 1.2, margin: 0 }}>{card.title}</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "3px 0 0" }}>{card.company}</p>
      </div>

      {/* details */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {[
          { d: "M8 6h13M8 12h13M3 6h.01M3 12h.01", text: card.date },
          { d: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z", text: card.location },
          { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", text: `${card.spots} spots open`, accent: true },
        ].map(({ d, text, accent }) => (
          <div key={text} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={accent ? LIME : "rgba(212,255,0,0.55)"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d={d} />
            </svg>
            <span style={{ fontSize: 12, color: accent ? LIME : "rgba(255,255,255,0.5)", fontWeight: accent ? 600 : 400 }}>
              {text}
            </span>
          </div>
        ))}
      </div>

      {/* swipe hint */}
      <div style={{
        marginTop: "auto", paddingTop: 10,
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(212,255,0,0.5)" strokeWidth="2.5"
          style={{ animation: "upbounce 1.6s ease-in-out infinite" }}>
          <polyline points="18 15 12 9 6 15" />
        </svg>
        <span style={{ fontSize: 11, color: "rgba(212,255,0,0.5)", fontWeight: 500 }}>
          {role === "seeker" ? "Swipe up to apply" : "Finder mode · browse only"}
        </span>
      </div>
    </div>
  );
}

export default function PhoneFrame({ role }: { role: Role }) {
  return (
    <div style={{
      width: 270,
      borderRadius: 38,
      padding: "14px 14px 18px",
      background: "linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
      border: "1px solid rgba(255,255,255,0.09)",
      boxShadow: "0 40px 90px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.07)",
    }}>

      {/* Status bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 6px 10px" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)" }}>9:41</span>
        <div style={{ width: 68, height: 18, borderRadius: 99, background: "rgba(255,255,255,0.07)" }} />
        <div style={{ display: "flex", gap: 3, alignItems: "flex-end" }}>
          {[4, 6, 8, 10].map(h => (
            <div key={h} style={{ width: 2.5, height: h, borderRadius: 2, background: "rgba(255,255,255,0.4)" }} />
          ))}
        </div>
      </div>

      {/* App header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px 12px" }}>
        <KriaWordmark size={19} />
        <div style={{
          width: 30, height: 30, borderRadius: 99, background: "rgba(212,255,0,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={LIME} strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      {/* Card stack */}
      <div style={{ position: "relative", height: 300 }}>
        {/* Back cards — solid backgrounds, no content, just deck depth */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 1,
          transform: "translateY(22px) rotate(-2deg) scale(0.93)",
          borderRadius: 20,
          background: SURFACE2,
          border: "1px solid rgba(255,255,255,0.06)",
        }} />
        <div style={{
          position: "absolute", inset: 0, zIndex: 2,
          transform: "translateY(11px) rotate(2.5deg) scale(0.965)",
          borderRadius: 20,
          background: SURFACE,
          border: "1px solid rgba(255,255,255,0.07)",
        }} />

        {/* Top card — full content */}
        <div style={{ position: "absolute", inset: 0, zIndex: 3 }}>
          <TopCard role={role} />
        </div>
      </div>

      {/* Action buttons */}
      <div style={{
        display: "flex", justifyContent: "center", gap: 10, marginTop: 12,
        paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)",
      }}>
        {[
          { label: "←", primary: false },
          { label: "↑", primary: true },
          { label: "→", primary: false },
        ].map(({ label, primary }) => (
          <button key={label} style={{
            width: 42, height: 42, borderRadius: 13,
            border: primary ? "none" : "1px solid rgba(255,255,255,0.08)",
            background: primary ? LIME : "rgba(255,255,255,0.04)",
            color: primary ? "#000" : "rgba(255,255,255,0.3)",
            fontWeight: 800, fontSize: 15, cursor: "pointer",
            boxShadow: primary ? "0 0 18px rgba(212,255,0,0.35)" : "none",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{label}</button>
        ))}
      </div>
    </div>
  );
}
