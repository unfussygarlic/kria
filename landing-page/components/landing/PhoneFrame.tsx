"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { LIME, SURFACE, SURFACE2, GIG_CARDS, type Role } from "./constants";
import KriaWordmark from "./KriaWordmark";
import { useT } from "./LanguageContext";

const THRESHOLD_X = 75;
const THRESHOLD_Y = 65;

// ── Card content ──────────────────────────────────────────────────────────────
function CardContent({ index, role }: { index: number; role: Role }) {
  const t    = useT();
  const data = GIG_CARDS[index];    // structural: pay, categoryColor, spots
  const str  = t.gigCards[index];   // translatable: title, company, date, location, category

  return (
    <div style={{
      height: "100%", borderRadius: 20, padding: "14px 14px 10px",
      background: "linear-gradient(150deg, rgba(255,255,255,0.09), rgba(255,255,255,0.04))",
      border: "1px solid rgba(212,255,0,0.22)",
      boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
      display: "flex", flexDirection: "column", gap: 10,
      userSelect: "none",
    }}>
      {/* tag + pay */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
          padding: "3px 9px", borderRadius: 99,
          background: `${data.categoryColor}18`, color: data.categoryColor,
          pointerEvents: "none",
        }}>
          {str.category.toUpperCase()}
        </span>
        <span style={{
          fontSize: 12, fontWeight: 700, color: LIME,
          background: "rgba(212,255,0,0.1)", padding: "2px 8px", borderRadius: 8,
          pointerEvents: "none",
        }}>
          {data.pay}
        </span>
      </div>

      {/* title */}
      <div style={{ pointerEvents: "none" }}>
        <p style={{ fontSize: 17, fontWeight: 800, color: "#fff", lineHeight: 1.2, margin: 0 }}>{str.title}</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "3px 0 0" }}>{str.company}</p>
      </div>

      {/* details */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7, pointerEvents: "none" }}>
        {[
          { d: "M8 6h13M8 12h13M3 6h.01M3 12h.01", text: str.date },
          { d: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z", text: str.location },
          { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", text: `${data.spots} ${t.phone.spotsOpen}`, accent: true },
        ].map(({ d, text, accent }) => (
          <div key={d} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke={accent ? LIME : "rgba(212,255,0,0.55)"}
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
        pointerEvents: "none",
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="rgba(212,255,0,0.5)" strokeWidth="2.5"
          style={{ animation: "upbounce 1.6s ease-in-out infinite" }}>
          <polyline points="18 15 12 9 6 15" />
        </svg>
        <span style={{ fontSize: 11, color: "rgba(212,255,0,0.5)", fontWeight: 500 }}>
          {role === "runner" ? t.phone.runnerHint : t.phone.hostHint}
        </span>
      </div>
    </div>
  );
}

// ── Phone frame ───────────────────────────────────────────────────────────────
export default function PhoneFrame({ role }: { role: Role }) {
  const t = useT();

  const [index, setIndex]       = useState(0);
  const [offset, setOffset]     = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [flyDir, setFlyDir]     = useState<"left" | "right" | "up" | null>(null);

  const start    = useRef({ x: 0, y: 0 });
  const stackRef = useRef<HTMLDivElement>(null);

  const total = GIG_CARDS.length;
  const cur   = index % total;
  const next1 = (index + 1) % total;
  const next2 = (index + 2) % total;

  // suppress unused warning — kept for future use
  void next1; void next2;

  // ── fly-off then advance index ────────────────────────────────────────────
  const flyOff = useCallback((dir: "left" | "right" | "up") => {
    setDragging(false);
    setFlyDir(dir);
    setTimeout(() => {
      setIndex(i => i + 1);
      setOffset({ x: 0, y: 0 });
      setFlyDir(null);
    }, 340);
  }, []);

  // ── drag end logic ────────────────────────────────────────────────────────
  const onEnd = useCallback(() => {
    if (!dragging) return;
    const { x, y } = offset;
    const absX = Math.abs(x), absY = Math.abs(y);
    if (y < -THRESHOLD_Y && absY > absX) {
      flyOff("up");
    } else if (x > THRESHOLD_X) {
      flyOff("right");
    } else if (x < -THRESHOLD_X) {
      flyOff("left");
    } else {
      setDragging(false);
      setOffset({ x: 0, y: 0 });
    }
  }, [dragging, offset, flyOff]);

  // ── non-passive touchmove ─────────────────────────────────────────────────
  useEffect(() => {
    const el = stackRef.current;
    if (!el) return;
    const handleTouchMove = (e: TouchEvent) => {
      if (!dragging) return;
      e.preventDefault();
      setOffset({
        x: e.touches[0].clientX - start.current.x,
        y: e.touches[0].clientY - start.current.y,
      });
    };
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", handleTouchMove);
  }, [dragging]);

  // ── mouse handlers ────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    if (flyDir) return;
    start.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - start.current.x, y: e.clientY - start.current.y });
  };

  // ── touch handlers ────────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    if (flyDir) return;
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setDragging(true);
  };
  const onTouchEnd = () => onEnd();

  // ── top card transform ────────────────────────────────────────────────────
  const rot = offset.x / 14;
  const topTransform = (() => {
    if (flyDir === "left")  return "translateX(-520px) rotate(-22deg)";
    if (flyDir === "right") return "translateX(520px) rotate(22deg)";
    if (flyDir === "up")    return "translateY(-520px) scale(0.9)";
    return `translate(${offset.x}px,${offset.y}px) rotate(${rot}deg)`;
  })();

  // ── overlay opacities ─────────────────────────────────────────────────────
  const applyOpacity = (dragging || flyDir === "up")
    ? Math.min(Math.max((-offset.y - 20) / THRESHOLD_Y, 0), 1)
    : 0;
  const navOpacity = (dragging && Math.abs(offset.x) > 30)
    ? Math.min((Math.abs(offset.x) - 30) / (THRESHOLD_X - 30), 1) * 0.65
    : 0;
  const navLeft = offset.x < 0;

  // ── back card scale ───────────────────────────────────────────────────────
  const dragProgress = Math.min(
    Math.max(Math.abs(offset.x) / THRESHOLD_X, Math.abs(offset.y) / THRESHOLD_Y),
    1
  );
  const back1Scale  = 0.965 + dragProgress * 0.035;
  const back1TransY = 11   - dragProgress * 11;
  const back2Scale  = 0.93  + dragProgress * 0.03;
  const back2TransY = 22   - dragProgress * 11;

  return (
    <div style={{
      width: 270, borderRadius: 38,
      padding: "14px 14px 18px",
      background: "linear-gradient(160deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))",
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

      {/* ── Draggable card stack ── */}
      <div
        ref={stackRef}
        style={{ position: "relative", height: 300, cursor: dragging ? "grabbing" : "grab", overflow: "hidden", borderRadius: 20 }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Back card 2 */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 1,
          transform: `translateY(${back2TransY}px) rotate(-2deg) scale(${back2Scale})`,
          borderRadius: 20, background: SURFACE2,
          border: "1px solid rgba(255,255,255,0.06)",
          transition: dragging ? "none" : "transform 0.35s ease",
        }} />

        {/* Back card 1 */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 2,
          transform: `translateY(${back1TransY}px) rotate(2.5deg) scale(${back1Scale})`,
          borderRadius: 20, background: SURFACE,
          border: "1px solid rgba(255,255,255,0.07)",
          transition: dragging ? "none" : "transform 0.35s ease",
        }} />

        {/* Top card */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 3,
          transform: topTransform,
          transition: (dragging || flyDir) ? "none" : "transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275)",
          willChange: "transform",
        }}>
          <CardContent index={cur} role={role} />

          {/* Apply overlay */}
          {applyOpacity > 0 && (
            <div style={{
              position: "absolute", inset: 0, borderRadius: 20,
              background: "rgba(212,255,0,0.15)",
              border: `2px solid rgba(212,255,0,${applyOpacity * 0.6})`,
              opacity: applyOpacity,
              display: "flex", alignItems: "center", justifyContent: "center",
              pointerEvents: "none",
            }}>
              <div style={{
                background: LIME, borderRadius: 99, padding: "8px 18px",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#000" }}>{t.phone.apply}</span>
              </div>
            </div>
          )}

          {/* Skip/Next overlay */}
          {navOpacity > 0 && (
            <div style={{
              position: "absolute", inset: 0, borderRadius: 20,
              background: `rgba(${navLeft ? "80,97,255" : "255,115,81"},0.12)`,
              border: `2px solid rgba(${navLeft ? "80,97,255" : "255,115,81"},${navOpacity * 0.5})`,
              opacity: navOpacity,
              display: "flex", alignItems: "center", justifyContent: navLeft ? "flex-start" : "flex-end",
              padding: "0 18px",
              pointerEvents: "none",
            }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: navLeft ? "#8097ff" : "#ff7351" }}>
                {navLeft ? t.phone.skip : t.phone.next}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{
        display: "flex", justifyContent: "center", gap: 10, marginTop: 12,
        paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)",
      }}>
        {[
          { label: "←", primary: false, action: () => !flyDir && flyOff("left")  },
          { label: "↑", primary: true,  action: () => !flyDir && flyOff("up")    },
          { label: "→", primary: false, action: () => !flyDir && flyOff("right") },
        ].map(({ label, primary, action }) => (
          <button
            key={label}
            onClick={action}
            style={{
              width: 42, height: 42, borderRadius: 13,
              border: primary ? "none" : "1px solid rgba(255,255,255,0.08)",
              background: primary ? LIME : "rgba(255,255,255,0.04)",
              color: primary ? "#000" : "rgba(255,255,255,0.3)",
              fontWeight: 800, fontSize: 15, cursor: "pointer",
              boxShadow: primary ? "0 0 18px rgba(212,255,0,0.35)" : "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "transform 0.1s",
              fontFamily: "inherit",
            }}
            onMouseDown={e => { e.stopPropagation(); (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.9)"; }}
            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Card counter */}
      <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 10 }}>
        {GIG_CARDS.map((_, i) => (
          <div key={i} style={{
            width: i === cur ? 16 : 5, height: 5, borderRadius: 99,
            background: i === cur ? LIME : "rgba(255,255,255,0.15)",
            transition: "all 0.3s ease",
            boxShadow: i === cur ? `0 0 6px rgba(212,255,0,0.5)` : "none",
          }} />
        ))}
      </div>
    </div>
  );
}
