"use client";

import React from "react";

export interface GigData {
  id: string;
  host: { name: string; momentum: number; band: string };
  title: string;
  location: string;
  distance: string;
  pay: number;
  hours: string;
  date: string;
  skill: string;
}

const BAND_COLORS: Record<string, string> = {
  newcomer: "#777575",
  building: "#ff7351",
  reliable: "#8097ff",
  trusted:  "#FFC83D",
  elite:    "#D4FF00",
  legend:   "#F4EFE3",
};

const BAND_LABELS: Record<string, string> = {
  newcomer: "Newcomer",
  building: "Building",
  reliable: "Reliable",
  trusted:  "Trusted",
  elite:    "Elite",
  legend:   "Legend",
};

interface SwipeCardProps {
  gig: GigData;
  compact?: boolean;
  style?: React.CSSProperties;
  overlay?: "apply" | "skip" | null;
  rotation?: number;
  translateX?: number;
  translateY?: number;
  zIndex?: number;
}

export default function SwipeCard({
  gig,
  compact = false,
  style,
  overlay = null,
  rotation = 0,
  translateX = 0,
  translateY = 0,
  zIndex = 1,
}: SwipeCardProps) {
  const bandColor = BAND_COLORS[gig.host.band] || "#777575";
  const bandLabel = BAND_LABELS[gig.host.band] || "Newcomer";

  const cardScale = compact ? 0.82 : 1;
  const pad = compact ? "14px 14px" : "18px 18px";

  return (
    <div
      style={{
        position: "absolute",
        width: compact ? 220 : 300,
        background: "var(--card)",
        border: "1px solid var(--card-rule)",
        borderRadius: compact ? 14 : 18,
        overflow: "hidden",
        transform: `translate(${translateX}px, ${translateY}px) rotate(${rotation}deg)`,
        transformOrigin: "center bottom",
        zIndex,
        userSelect: "none",
        touchAction: "none",
        boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
        ...style,
      }}
    >
      {/* Apply overlay */}
      {overlay === "apply" && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 10,
          background: "rgba(0, 200, 80, 0.15)",
          border: "2px solid rgba(0, 200, 80, 0.6)",
          borderRadius: "inherit",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontSize: compact ? 20 : 28, fontWeight: 800,
            color: "#00c850",
            transform: "rotate(-12deg)",
            letterSpacing: "0.08em",
          }}>Applied ↑</span>
        </div>
      )}

      {/* Skip overlay */}
      {overlay === "skip" && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 10,
          background: "rgba(255, 80, 80, 0.12)",
          border: "2px solid rgba(255, 80, 80, 0.5)",
          borderRadius: "inherit",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontSize: compact ? 20 : 28, fontWeight: 800,
            color: "#ff5050",
            transform: "rotate(12deg)",
            letterSpacing: "0.08em",
          }}>Skip ✕</span>
        </div>
      )}

      {/* Ticket head */}
      <div style={{
        padding: compact ? "10px 14px 8px" : "14px 18px 12px",
        borderBottom: "1px solid var(--hairline)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: compact ? 9 : 11,
          color: "var(--muted)",
          letterSpacing: "0.06em",
        }}>№ {gig.id}</span>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: compact ? 9 : 11,
          color: "var(--muted)",
          letterSpacing: "0.04em",
        }}>{gig.skill}</span>
      </div>

      {/* Pay row */}
      <div style={{ padding: compact ? "10px 14px 0" : "14px 18px 0" }}>
        <div style={{
          fontFamily: "var(--font-serif)",
          fontSize: compact ? 26 : 34,
          fontWeight: 700,
          color: "var(--text)",
          lineHeight: 1,
        }}>₹{gig.pay.toLocaleString("en-IN")}</div>
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: compact ? 9 : 11,
          color: "var(--muted)",
          marginTop: compact ? 2 : 4,
        }}>{gig.hours} · {gig.date}</div>
      </div>

      {/* Title */}
      <div style={{
        padding: compact ? "8px 14px 0" : "10px 18px 0",
        fontSize: compact ? 12 : 15,
        fontWeight: 700,
        color: "var(--text)",
        lineHeight: 1.3,
      }}>{gig.title}</div>

      {/* Location */}
      <div style={{
        padding: compact ? "5px 14px 0" : "6px 18px 0",
        display: "flex", alignItems: "center", gap: 4,
        fontSize: compact ? 10 : 12,
        color: "var(--muted)",
      }}>
        <svg width={compact ? 10 : 12} height={compact ? 10 : 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <span>{gig.location}</span>
        <span style={{ color: "var(--muted)", opacity: 0.6 }}>· {gig.distance}</span>
      </div>

      {/* Image placeholder */}
      {!compact && (
        <div style={{
          margin: "10px 18px",
          height: 72,
          background: "var(--ink-4)",
          borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", overflow: "hidden",
        }}>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--muted)",
            padding: "3px 8px",
            background: "rgba(244,239,227,0.06)",
            borderRadius: 6,
            letterSpacing: "0.04em",
          }}>{gig.skill} · {gig.id}</span>
        </div>
      )}

      {/* Meta row */}
      <div style={{
        padding: compact ? "6px 14px" : "8px 18px",
        display: "flex", gap: compact ? 10 : 14,
        borderTop: "1px solid var(--hairline)",
      }}>
        {[
          { label: "Shift", value: gig.hours },
          { label: "Skill", value: gig.skill },
          { label: "From", value: gig.date },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{
              fontFamily: "var(--font-mono)",
              fontSize: compact ? 8 : 10,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}>{label}</span>
            <span style={{
              fontSize: compact ? 10 : 12,
              fontWeight: 700,
              color: "var(--text)",
            }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Host row */}
      <div style={{
        padding: compact ? "6px 14px 10px" : "8px 18px 14px",
        borderTop: "1px solid var(--hairline)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 8,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
          <span style={{
            fontSize: compact ? 11 : 13,
            fontWeight: 700,
            color: "var(--text)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{gig.host.name}</span>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: compact ? 8 : 10,
            color: "var(--muted)",
          }}>Verified host</span>
        </div>
        <div style={{
          padding: compact ? "3px 7px" : "4px 9px",
          borderRadius: 99,
          border: `1px solid ${bandColor}33`,
          background: `${bandColor}14`,
          fontFamily: "var(--font-mono)",
          fontSize: compact ? 9 : 11,
          fontWeight: 700,
          color: bandColor,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}>
          {gig.host.momentum} · {bandLabel}
        </div>
      </div>
    </div>
  );
}
