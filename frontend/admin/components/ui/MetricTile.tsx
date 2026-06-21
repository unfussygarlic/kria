"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkline } from "./Sparkline";

interface Props {
  label: string;
  value: number;
  sub?: string;
  sparkline?: number[];
  sparklineColor?: string;
  alert?: "amber" | "lime" | "red";
  mono?: boolean;
  className?: string;
}

function useCountUp(target: number, duration = 700) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(ease * target));
      if (p < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return display;
}

export function MetricTile({
  label, value, sub, sparkline, sparklineColor = "#D4FF00",
  alert, mono, className = "",
}: Props) {
  const display = useCountUp(value);

  const alertClass = alert === "amber" ? "alert-amber"
    : alert === "lime" ? "alert-lime"
    : "";

  return (
    <div className={`metric-tile flex flex-col justify-between ${alertClass} ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2"
            style={{ color: "#555550" }}
          >
            {label}
          </p>
          <p
            className="text-3xl font-bold leading-none"
            style={{
              fontFamily: mono !== false ? "var(--font-mono)" : undefined,
              color: alert === "amber" ? "#FFC83D"
                   : alert === "red"   ? "#ff7351"
                   : alert === "lime"  ? "#D4FF00"
                   : "#e2e4cf",
            }}
          >
            {display.toLocaleString()}
          </p>
        </div>
        {sparkline && (
          <div className="flex-shrink-0 mt-1">
            <Sparkline data={sparkline} color={sparklineColor} />
          </div>
        )}
      </div>
      {sub && (
        <p className="text-[11px] mt-3" style={{ color: "#555550", fontFamily: "var(--font-mono)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}
