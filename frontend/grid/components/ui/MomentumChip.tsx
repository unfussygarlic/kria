const BANDS = [
  { min: 900, label: "Legend",   varName: "band-legend"   },
  { min: 700, label: "Elite",    varName: "band-elite"    },
  { min: 500, label: "Trusted",  varName: "band-trusted"  },
  { min: 300, label: "Reliable", varName: "band-reliable" },
  { min: 100, label: "Building", varName: "band-building" },
  { min: 0,   label: "Newcomer", varName: "band-newcomer" },
] as const;

export function getBand(score: number | null) {
  const s = score ?? 0;
  return BANDS.find((b) => s >= b.min) ?? BANDS[BANDS.length - 1];
}

export function MomentumChip({ score }: { score: number | null }) {
  const band = getBand(score);
  const color = `var(--${band.varName})`;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      }}
    >
      {score !== null ? score : "—"} · {band.label}
    </span>
  );
}
