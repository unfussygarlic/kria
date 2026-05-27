"use client";

const TICKER_ITEMS: [string, string][] = [
  ["Anika P.", "just hit 900 — Legend band"],
  ["Olive & Oak", "posted 3 shifts · Indiranagar"],
  ["Today", "142 gigs live across 8 cities"],
  ["Verba Studios", "filled a 10-hour shoot in 9 minutes"],
  ["₹18.4L", "paid out to Runners this week"],
  ["Rohan M.", "completed his 64th gig in Koramangala"],
  ["Bandra Books", "is hiring for the weekend pop-up"],
  ["94%", "of accepted gigs got a check-in this month"],
];

function TickerRow() {
  return (
    <>
      {TICKER_ITEMS.map(([bold, rest], i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ color: "var(--lime)", fontWeight: 700 }}>{bold}</span>
          <span style={{ color: "var(--muted)" }}>{rest}</span>
          <span style={{ color: "var(--gold)", margin: "0 6px" }}>·</span>
        </span>
      ))}
    </>
  );
}

export default function SectionTicker() {
  return (
    <div style={{
      background: "var(--ink-2)",
      borderTop: "1px solid var(--hairline)",
      borderBottom: "1px solid var(--hairline)",
      overflow: "hidden",
      position: "relative",
      height: 38,
      display: "flex",
      alignItems: "center",
    }}>
      {/* Fade edges */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 80, zIndex: 2,
        background: "linear-gradient(to right, var(--ink-2), transparent)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0, width: 80, zIndex: 2,
        background: "linear-gradient(to left, var(--ink-2), transparent)",
        pointerEvents: "none",
      }} />

      {/* Scrolling track */}
      <div style={{
        display: "flex",
        alignItems: "center",
        animation: "tickerScroll 42s linear infinite",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        whiteSpace: "nowrap",
        willChange: "transform",
      }}>
        <TickerRow />
        <TickerRow />
      </div>
    </div>
  );
}
