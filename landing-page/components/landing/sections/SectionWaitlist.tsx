"use client";

import WaitlistForm from "../WaitlistForm";

export default function SectionWaitlist() {
  return (
    <section id="waitlist" style={{
      padding: "100px 20px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Glow */}
      <div style={{
        position: "absolute",
        width: 600, height: 600,
        left: "50%", top: "30%",
        transform: "translate(-50%,-50%)",
        background: "radial-gradient(circle, rgba(212,255,0,0.08) 0%, transparent 65%)",
        filter: "blur(80px)",
        pointerEvents: "none",
      }} />

      <div style={{
        position: "relative", zIndex: 1,
        maxWidth: 540, margin: "0 auto",
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 32, textAlign: "center",
      }}>
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
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: 99, background: "var(--gold)",
            display: "inline-block",
          }} />
          Stay in the loop
        </div>

        {/* Headline */}
        <h2 style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 700,
          fontSize: "clamp(36px, 5.5vw, 72px)",
          lineHeight: 1.0,
          letterSpacing: "-0.03em",
          color: "var(--text)",
          margin: 0,
        }}>
          You&apos;re{" "}
          <em style={{
            fontStyle: "italic",
            color: "var(--lime)",
          }}>early.</em>
        </h2>

        <p style={{
          fontSize: 17,
          lineHeight: 1.65,
          color: "var(--muted-2)",
          margin: 0,
          maxWidth: 460,
        }}>
          Hosts can try Grid right now at{" "}
          <a href="https://grid.trykria.com" target="_blank" rel="noopener noreferrer"
            style={{ color: "var(--lime)", textDecoration: "none" }}>
            grid.trykria.com
          </a>. Runners — we&apos;re rolling out city by city. Drop your email and we&apos;ll reach out when we launch near you.
        </p>

        <WaitlistForm />

        <p style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--muted)",
          margin: 0,
        }}>
          No spam. No pitch decks. Just a heads-up when we&apos;re live.
        </p>
      </div>
    </section>
  );
}
