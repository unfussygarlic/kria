"use client";

import { useId, useMemo } from "react";
import { getBand } from "./MomentumChip";
import type { BreakdownItem } from "@/types";

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function pts(points: { x: number; y: number }[]) {
  return points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

interface Props {
  score: number;
  signals: BreakdownItem[];
  size?: number;
}

export function SkillGraph({ score, signals, size = 220 }: Props) {
  const uid        = useId().replace(/:/g, "");
  const filterId   = `sg-glow-${uid}`;
  const textGlowId = `sg-text-${uid}`;
  const bgGradId   = `sg-bg-${uid}`;

  const band = getBand(score);
  const cx   = size / 2;
  const cy   = size / 2;
  const bgR  = size / 2 - 1;
  const maxR = size * 0.36;

  // Axes are derived from the signals array — adding a signal file on the backend
  // automatically adds an axis here without any frontend changes.
  const N = signals.length;

  const signalMap = useMemo(() => {
    const m: Record<string, BreakdownItem> = {};
    signals.forEach((s) => { m[s.key] = s; });
    return m;
  }, [signals]);

  const rings = [0.25, 0.5, 0.75, 1.0];

  const ringPts = rings.map((scale) =>
    pts(signals.map((_, i) => polar(cx, cy, maxR * scale, N > 0 ? (360 / N) * i : 0)))
  );

  const dataPoints = signals.map((sig, i) => {
    const val = sig.has_data ? Math.max(sig.bar_value, 0.04) : 0;
    return polar(cx, cy, maxR * val, (360 / N) * i);
  });

  const dataPts    = pts(dataPoints);
  const hasAnyData = signals.some((s) => s.has_data);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <defs>
        <radialGradient id={bgGradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   style={{ stopColor: "var(--sg-canvas-from)" }} />
          <stop offset="100%" style={{ stopColor: "var(--sg-canvas-to)" }} />
        </radialGradient>

        <filter id={filterId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={textGlowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Canvas */}
      <circle cx={cx} cy={cy} r={bgR} fill={`url(#${bgGradId})`} />

      {/* Grid rings */}
      {ringPts.map((p, i) => (
        <polygon key={i} points={p} fill="none"
          style={{ stroke: "var(--sg-grid)" }}
          strokeWidth={i === rings.length - 1 ? 1 : 0.75}
        />
      ))}

      {/* Spokes */}
      {signals.map((_, i) => {
        const end = polar(cx, cy, maxR, (360 / N) * i);
        return (
          <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y}
            style={{ stroke: "var(--sg-grid)" }}
            strokeWidth={0.75}
          />
        );
      })}

      {/* Data: glow layer */}
      {hasAnyData && (
        <polygon points={dataPts}
          fill={`var(--${band.varName})`} fillOpacity={0.28}
          stroke={`var(--${band.varName})`} strokeWidth={2} strokeLinejoin="round"
          filter={`url(#${filterId})`}
        />
      )}
      {/* Data: sharp polygon */}
      {hasAnyData && (
        <polygon points={dataPts}
          fill={`var(--${band.varName})`} fillOpacity={0.13}
          stroke={`var(--${band.varName})`} strokeWidth={1.25} strokeLinejoin="round"
        />
      )}

      {/* Dots */}
      {signals.map((sig, i) => {
        if (!sig.has_data) return null;
        const p = polar(cx, cy, maxR * Math.max(sig.bar_value, 0.04), (360 / N) * i);
        return (
          <g key={sig.key}>
            <circle cx={p.x} cy={p.y} r={6} fill={`var(--${band.varName})`} fillOpacity={0.35}
              filter={`url(#${filterId})`}
            />
            <circle cx={p.x} cy={p.y} r={2.75} fill={`var(--${band.varName})`} />
          </g>
        );
      })}

      {/* Center score */}
      <text x={cx} y={cy - 10}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={32} fontWeight={800} fill={`var(--${band.varName})`} fontFamily="inherit"
        filter={`url(#${textGlowId})`}
      >
        {score}
      </text>
      <text x={cx} y={cy + 16}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={8} fontWeight={700} fill={`var(--${band.varName})`} opacity={0.65} fontFamily="inherit"
        style={{ letterSpacing: "0.15em" }}
      >
        {band.label.toUpperCase()}
      </text>
    </svg>
  );
}
