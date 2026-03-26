"use client";
import { LIME } from "./constants";
import KriaWordmark from "./KriaWordmark";

export default function Nav() {
  const scrollToWaitlist = () => {
    document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav style={{
      position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
      zIndex: 20,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      maxWidth: 1160, padding: "28px 48px",
      width: "100%",
    }}>
      <KriaWordmark size={22} />
      <button
        onClick={scrollToWaitlist}
        style={{
          padding: "9px 22px", borderRadius: 12,
          border: "1px solid rgba(212,255,0,0.25)",
          background: "rgba(212,255,0,0.06)",
          color: LIME, fontSize: 13, fontWeight: 600,
          cursor: "pointer", transition: "all 0.2s",
          fontFamily: "inherit",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "rgba(212,255,0,0.12)";
          e.currentTarget.style.borderColor = "rgba(212,255,0,0.5)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "rgba(212,255,0,0.06)";
          e.currentTarget.style.borderColor = "rgba(212,255,0,0.25)";
        }}
      >
        Join Waitlist
      </button>
    </nav>
  );
}
