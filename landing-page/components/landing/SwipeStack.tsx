"use client";

import { useState, useRef, useCallback } from "react";
import SwipeCard, { type GigData } from "./SwipeCard";

export const GIG_DATA: GigData[] = [
  {
    id: "KR-0142",
    host: { name: "Olive & Oak Catering", momentum: 842, band: "elite" },
    title: "Banquet server — wedding reception",
    location: "Indiranagar, Bengaluru",
    distance: "2.4 km",
    pay: 1800,
    hours: "6 hrs",
    date: "Sat, 17 May",
    skill: "Hospitality",
  },
  {
    id: "KR-0156",
    host: { name: "Verba Studios", momentum: 612, band: "trusted" },
    title: "Camera assistant — Versova short film",
    location: "Versova, Mumbai",
    distance: "5.1 km",
    pay: 2400,
    hours: "10 hrs",
    date: "Sun, 18 May",
    skill: "Production",
  },
  {
    id: "KR-0188",
    host: { name: "Bandra Books", momentum: 348, band: "reliable" },
    title: "Store assistant — weekend pop-up",
    location: "Bandra W, Mumbai",
    distance: "1.2 km",
    pay: 950,
    hours: "5 hrs",
    date: "Sat, 17 May",
    skill: "Retail",
  },
  {
    id: "KR-0204",
    host: { name: "Loop Logistics", momentum: 921, band: "legend" },
    title: "Dispatch helper — same-day routes",
    location: "Koramangala, Bengaluru",
    distance: "3.8 km",
    pay: 1400,
    hours: "7 hrs",
    date: "Today",
    skill: "Logistics",
  },
  {
    id: "KR-0221",
    host: { name: "Sundar Tea Co.", momentum: 489, band: "reliable" },
    title: "Barista — pop-up coffee bar",
    location: "HSR Layout, Bengaluru",
    distance: "4.6 km",
    pay: 1100,
    hours: "6 hrs",
    date: "Sun, 18 May",
    skill: "F&B",
  },
];

interface SwipeStackProps {
  compact?: boolean;
}

export default function SwipeStack({ compact = false }: SwipeStackProps) {
  const [topIndex, setTopIndex] = useState(0);
  const [dismissed, setDismissed] = useState<number[]>([]);

  // Drag state
  const dragRef = useRef<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    active: boolean;
  } | null>(null);

  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });

  const overlay: "apply" | "skip" | null =
    drag.active
      ? Math.abs(drag.y) > Math.abs(drag.x) && drag.y < -60
        ? "apply"
        : Math.abs(drag.x) > 90
        ? "skip"
        : null
      : null;

  const dismiss = useCallback(
    (direction: "apply" | "skip") => {
      setDismissed((d) => [...d, topIndex]);
      setDrag({ x: 0, y: 0, active: false });
      dragRef.current = null;
      // Advance to next card
      const next = (topIndex + 1) % GIG_DATA.length;
      setTopIndex(next);
    },
    [topIndex]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (compact) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      active: true,
    };
    setDrag({ x: 0, y: 0, active: true });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current?.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    dragRef.current.currentX = e.clientX;
    dragRef.current.currentY = e.clientY;
    setDrag({ x: dx, y: dy, active: true });
  };

  const onPointerUp = () => {
    if (!dragRef.current?.active) return;
    const { x, y } = drag;
    // Determine action
    if (Math.abs(y) > Math.abs(x) && y < -90) {
      dismiss("apply");
    } else if (Math.abs(x) > 110) {
      dismiss("skip");
    } else {
      // Snap back
      setDrag({ x: 0, y: 0, active: false });
      dragRef.current = null;
    }
  };

  const cardW = compact ? 220 : 300;
  const stackH = compact ? 340 : 440;

  return (
    <div
      style={{
        position: "relative",
        width: cardW,
        height: stackH,
        cursor: compact ? "default" : "grab",
      }}
    >
      {/* Render background cards */}
      {[2, 1].map((offset) => {
        const idx = (topIndex + offset) % GIG_DATA.length;
        return (
          <SwipeCard
            key={`bg-${offset}`}
            gig={GIG_DATA[idx]}
            compact={compact}
            zIndex={offset}
            style={{
              top: offset * (compact ? 6 : 10),
              left: offset * (compact ? 4 : 6),
              opacity: 1 - offset * 0.2,
              transform: `translate(${offset * (compact ? 4 : 6)}px, ${offset * (compact ? 6 : 10)}px) scale(${1 - offset * 0.03})`,
            }}
          />
        );
      })}

      {/* Top card — interactive */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 10,
          cursor: compact ? "default" : drag.active ? "grabbing" : "grab",
          transition: drag.active ? "none" : "transform 0.35s cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        <SwipeCard
          gig={GIG_DATA[topIndex]}
          compact={compact}
          zIndex={10}
          translateX={drag.x}
          translateY={drag.y}
          rotation={drag.active ? drag.x * 0.04 : 0}
          overlay={overlay}
          style={{ position: "relative", top: "auto", left: "auto" }}
        />
      </div>

      {/* Hint text */}
      {!compact && (
        <div style={{
          position: "absolute",
          bottom: -32,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--muted)",
        }}>
          drag to swipe · up = apply · side = skip
        </div>
      )}
    </div>
  );
}
