"use client";

import { useState } from "react";
import { useWindowWidth } from "../utils";

const BANDS = [
  { label: "Newcomer", color: "#777575", range: "0–99" },
  { label: "Building", color: "#ff7351", range: "100–299" },
  { label: "Reliable", color: "#8097ff", range: "300–499" },
  { label: "Trusted", color: "#FFC83D", range: "500–699" },
  { label: "Elite", color: "#D4FF00", range: "700–899" },
  { label: "Legend", color: "#F4EFE3", range: "900–1000" },
];

type DimKey = "showRate" | "onTime" | "performance" | "communication" | "professionalism";

const DIMENSIONS: { key: DimKey; label: string; value: number }[] = [
  { key: "showRate",        label: "Show rate",       value: 96 },
  { key: "onTime",          label: "On-time",          value: 92 },
  { key: "performance",     label: "Performance",      value: 88 },
  { key: "communication",   label: "Communication",    value: 81 },
  { key: "professionalism", label: "Professionalism",  value: 90 },
];

function pentagon(cx: number, cy: number, r: number, offset = -90): [number, number][] {
  return Array.from({ length: 5 }, (_, i) => {
    const angle = (offset + (i * 360) / 5) * (Math.PI / 180);
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  });
}

function pts(points: [number, number][]) {
  return points.map(p => p.join(",")).join(" ");
}

function SkillGraph({ highlighted }: { highlighted: DimKey | null }) {
  const cx = 80, cy = 80, maxR = 60;
  const rings = [0.25, 0.5, 0.75, 1];

  const valuePoints = DIMENSIONS.map(({ value }, i) => {
    const baseAngle = -90 + (i * 360) / 5;
    const r = (value / 100) * maxR;
    const angle = baseAngle * (Math.PI / 180);
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as [number, number];
  });

  const axisPoints = pentagon(cx, cy, maxR);

  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      {/* Grid rings */}
      {rings.map(ratio => (
        <polygon
          key={ratio}
          points={pts(pentagon(cx, cy, maxR * ratio))}
          fill="none"
          stroke="var(--hairline-strong)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      ))}

      {/* Axis lines */}
      {axisPoints.map(([x, y], i) => (
        <line key={i} x1={cx} y1={cy} x2={x} y2={y}
          stroke="var(--hairline)"
          strokeWidth="1"
        />
      ))}

      {/* Value polygon */}
      <polygon
        points={pts(valuePoints)}
        fill="rgba(212,255,0,0.15)"
        stroke="#D4FF00"
        strokeWidth="1.5"
      />

      {/* Axis dots with highlight */}
      {axisPoints.map(([x, y], i) => {
        const dim = DIMENSIONS[i];
        const isHl = highlighted === dim.key;
        return (
          <circle key={i} cx={x} cy={y} r={isHl ? 5 : 3}
            fill={isHl ? "var(--lime)" : "var(--ink-4)"}
            stroke={isHl ? "var(--lime)" : "var(--hairline-strong)"}
            strokeWidth="1.5"
          />
        );
      })}

      {/* Axis labels */}
      {axisPoints.map(([x, y], i) => {
        const dim = DIMENSIONS[i];
        const isHl = highlighted === dim.key;
        const labelX = cx + (x - cx) * 1.35;
        const labelY = cy + (y - cy) * 1.35;
        return (
          <text key={i}
            x={labelX} y={labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="8"
            fill={isHl ? "var(--lime)" : "var(--muted)"}
            fontFamily="var(--font-mono)"
          >
            {dim.label}
          </text>
        );
      })}
    </svg>
  );
}

function IDCard({ highlighted }: { highlighted: DimKey | null }) {
  return (
    <div style={{
      background: "var(--card)",
      border: "1px solid var(--card-rule)",
      borderRadius: 18,
      overflow: "hidden",
      width: 260,
      boxShadow: "0 16px 60px rgba(0,0,0,0.5)",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--hairline)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--ink-3)",
      }}>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--muted)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}>Momentum · Runner ID</span>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--muted)",
        }}>KR-9041</span>
      </div>

      {/* Runner info */}
      <div style={{
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderBottom: "1px solid var(--hairline)",
      }}>
        <div style={{
          width: 40, height: 40,
          borderRadius: 99,
          background: "rgba(212,255,0,0.12)",
          border: "1.5px solid rgba(212,255,0,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 700, color: "var(--lime)",
        }}>A</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>Arjun M.</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", marginTop: 3 }}>Bengaluru · 64 gigs</div>
        </div>
      </div>

      {/* Skill graph */}
      <div style={{
        padding: "12px 16px",
        display: "flex",
        justifyContent: "center",
        borderBottom: "1px solid var(--hairline)",
      }}>
        <SkillGraph highlighted={highlighted} />
      </div>

      {/* Score / band */}
      <div style={{ padding: "12px 16px" }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 14px",
          borderRadius: 99,
          background: "rgba(212,255,0,0.12)",
          border: "1px solid rgba(212,255,0,0.25)",
        }}>
          <span style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 700,
            fontSize: 20,
            color: "var(--lime)",
            lineHeight: 1,
          }}>842</span>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--lime)",
            opacity: 0.7,
          }}>· Elite</span>
        </div>
      </div>
    </div>
  );
}

export default function SectionMomentum() {
  const [highlighted, setHighlighted] = useState<DimKey | null>(null);
  const width = useWindowWidth();
  const isMobile = width < 860;

  return (
    <section id="momentum" style={{
      background: "var(--ink-2)",
      borderTop: "1px solid var(--hairline)",
      borderBottom: "1px solid var(--hairline)",
      padding: isMobile ? "80px 20px" : "100px 48px",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Kicker */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--muted)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: 20,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: 99, background: "var(--cobalt)",
            display: "inline-block",
          }} />
          The score that travels with you
        </div>

        {/* Headline */}
        <h2 style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 700,
          fontSize: "clamp(32px, 4.8vw, 64px)",
          lineHeight: 1.05,
          letterSpacing: "-0.025em",
          color: "var(--text)",
          margin: "0 0 48px",
          maxWidth: 700,
        }}>
          842. It means you showed up.
        </h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "auto 1fr",
          gap: isMobile ? 48 : 80,
          alignItems: "start",
        }}>
          {/* ID Card */}
          <div style={{ display: "flex", justifyContent: isMobile ? "center" : "flex-start" }}>
            <IDCard highlighted={highlighted} />
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <p style={{
              fontSize: 17,
              lineHeight: 1.65,
              color: "var(--muted-2)",
              margin: "0 0 32px",
              maxWidth: 520,
            }}>
              Momentum is a 0–1000 trust score built from every gig you complete. It goes beyond stars — it breaks down into five dimensions that Hosts can actually read.
            </p>

            {/* Dimension list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 40 }}>
              {DIMENSIONS.map(({ key, label, value }) => (
                <div
                  key={key}
                  onMouseEnter={() => setHighlighted(key)}
                  onMouseLeave={() => setHighlighted(null)}
                  style={{
                    padding: "16px 0",
                    borderBottom: "1px solid var(--hairline)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: 99,
                      background: highlighted === key ? "var(--lime)" : "var(--hairline-strong)",
                      transition: "background 0.15s",
                    }} />
                    <span style={{
                      fontSize: 15,
                      fontWeight: highlighted === key ? 600 : 400,
                      color: highlighted === key ? "var(--text)" : "var(--muted-2)",
                      transition: "all 0.15s",
                    }}>{label}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Progress bar */}
                    <div style={{
                      width: 100,
                      height: 3,
                      background: "var(--ink-4)",
                      borderRadius: 99,
                      overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${value}%`,
                        background: highlighted === key ? "var(--lime)" : "var(--cobalt)",
                        borderRadius: 99,
                        transition: "background 0.15s",
                      }} />
                    </div>
                    <span style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      fontWeight: 700,
                      color: highlighted === key ? "var(--lime)" : "var(--muted)",
                      width: 24,
                      textAlign: "right",
                      transition: "color 0.15s",
                    }}>{value}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Band pills */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {BANDS.map(b => (
                <span key={b.label} style={{
                  padding: "5px 12px",
                  borderRadius: 99,
                  border: `1px solid ${b.color}33`,
                  background: `${b.color}0e`,
                  color: b.color,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 600,
                }}>
                  {b.label}
                  <span style={{ marginLeft: 5, opacity: 0.5, fontSize: 10 }}>{b.range}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
