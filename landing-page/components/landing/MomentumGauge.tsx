"use client";

import { useState, useEffect } from "react";
import { LIME, BANDS } from "./constants";

const BG = "#0B0F0A";

// SVG layout — 180° semicircle, center at bottom-center of the arc area
const CX = 150;
const CY = 148;
const R  = 118;

// 5 equal band segments across 180° (-90° → +90°), 3° gap between each
const SEG_DEG  = 31; // degrees per segment (5 × 31 + 4 × 3 = 167°, padded to 180 by shifting starts)
const SEGMENTS = [-90, -57, -24, 9, 42]; // start angle of each band segment

function polar(deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
}

function arc(startDeg: number, endDeg: number) {
  const s = polar(startDeg);
  const e = polar(endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M${s.x.toFixed(2)},${s.y.toFixed(2)} A${R},${R},0,${large},1,${e.x.toFixed(2)},${e.y.toFixed(2)}`;
}

export default function MomentumGauge({ score, animate }: { score: number; animate: boolean }) {
  const [displayed, setDisplayed] = useState(300);

  useEffect(() => {
    if (!animate) return;
    let frame: number;
    const start = performance.now();
    const duration = 1800;
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(300 + (score - 300) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, score]);

  const pct         = (displayed - 300) / 550;           // 0 → 1
  const needleAngle = -90 + pct * 180;                   // -90° (left) → +90° (right)
  const activeBand  = BANDS.findIndex(b => displayed >= b.range[0] && displayed <= b.range[1]);
  const bandColor   = activeBand >= 0 ? BANDS[activeBand].color : LIME;

  // Arc endpoints sit exactly at y = CY — nothing extends below that line
  const leftPt  = polar(-90);   // (CX-R, CY)
  const rightPt = polar(90);    // (CX+R, CY)

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      {/*
        viewBox is 300 × 158
        - Arc top:       (CX, CY-R) = (150, 30)
        - Arc endpoints: (CX±R, CY) = (32, 148) and (268, 148)
        - Labels row:    y ≈ 158 (bottom edge)
        Nothing escapes the viewBox.
      */}
      <div style={{ width: "100%", maxWidth: 300 }}>
      <svg
        width="100%"
        height="auto"
        viewBox="0 0 300 158"
        style={{ display: "block", overflow: "hidden" }}
      >
        {/* Track (full dim arc) */}
        <path
          d={arc(-90, 90)}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="14"
          strokeLinecap="round"
        />

        {/* Band segments */}
        {BANDS.map((band, i) => {
          const segStart = SEGMENTS[i];
          const segEnd   = segStart + SEG_DEG;
          const isActive = i <= activeBand;
          return (
            <path
              key={band.label}
              d={arc(segStart, segEnd)}
              fill="none"
              stroke={band.color}
              strokeWidth="14"
              strokeLinecap="round"
              style={{
                opacity:    isActive ? 1 : 0.1,
                filter:     isActive ? `drop-shadow(0 0 5px ${band.color}88)` : "none",
                transition: "opacity 0.3s, filter 0.3s",
              }}
            />
          );
        })}

        {/* Needle */}
        <g transform={`translate(${CX},${CY}) rotate(${needleAngle})`}>
          {/* shaft pointing upward (toward arc) */}
          <line
            x1="0" y1="8"
            x2="0" y2={-(R - 18)}
            stroke={bandColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* pivot dot */}
          <circle cx="0" cy="0" r="8"  fill={bandColor} style={{ filter: `drop-shadow(0 0 8px ${bandColor})` }} />
          <circle cx="0" cy="0" r="4"  fill={BG} />
        </g>

        {/* Range end-labels, anchored just below the arc endpoints */}
        <text
          x={leftPt.x}  y="158"
          fill="rgba(255,255,255,0.22)"
          fontSize="10" fontFamily="monospace"
          textAnchor="middle"
        >300</text>
        <text
          x={rightPt.x} y="158"
          fill="rgba(255,255,255,0.22)"
          fontSize="10" fontFamily="monospace"
          textAnchor="middle"
        >850</text>
      </svg>
      </div>

      {/* Score — completely outside the SVG, no chance of overlap */}
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{
            fontSize: 72, fontWeight: 900, lineHeight: 1,
            color: bandColor,
            letterSpacing: "-0.04em",
            textShadow: `0 0 48px ${bandColor}55`,
          }}>
            {displayed}
          </span>
          <span style={{ fontSize: 22, color: "rgba(255,255,255,0.2)", fontWeight: 600 }}>/850</span>
        </div>
        {activeBand >= 0 && (
          <span style={{
            fontSize: 13, fontWeight: 600,
            padding: "5px 18px", borderRadius: 99,
            border:      `1px solid ${bandColor}44`,
            background:  `${bandColor}12`,
            color:        bandColor,
          }}>
            {BANDS[activeBand].label}
          </span>
        )}
      </div>
    </div>
  );
}
