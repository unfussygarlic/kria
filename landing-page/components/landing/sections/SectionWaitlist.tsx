"use client";

import WaitlistForm from "../WaitlistForm";
import { LIME } from "../constants";
import { useFadeIn } from "../utils";

export default function SectionWaitlist() {
  const { ref, visible } = useFadeIn(0.1);

  return (
    <section id="waitlist" ref={ref} style={{
      padding: "140px 24px",
      position: "relative", overflow: "hidden",
      opacity: visible ? 1 : 0,
      transform: visible ? "none" : "translateY(28px)",
      transition: "opacity 0.7s ease, transform 0.7s ease",
    }}>

      {/* Glow */}
      <div style={{
        position: "absolute", width: 600, height: 600,
        left: "50%", top: "30%", transform: "translate(-50%,-50%)",
        background: "radial-gradient(circle,rgba(212,255,0,0.1) 0%,transparent 65%)",
        filter: "blur(80px)", pointerEvents: "none",
        animation: "breathe 9s ease-in-out infinite",
      }} />

      <div style={{
        position: "relative", zIndex: 1,
        maxWidth: 520, margin: "0 auto",
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 32, textAlign: "center",
      }}>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{
            fontSize: "clamp(40px, 5.5vw, 72px)", fontWeight: 900,
            letterSpacing: "-0.04em", lineHeight: 1.0, margin: 0, color: "#fff",
          }}>
            You&apos;re{" "}
            <span style={{
              background: `linear-gradient(90deg,${LIME},#b8e000)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              early.
            </span>
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.42)", margin: 0, lineHeight: 1.6 }}>
            kria is rolling out city by city. Drop your email and we&apos;ll reach out when we launch near you.
          </p>
        </div>

        <WaitlistForm />

        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.18)", margin: 0 }}>
          No spam. No pitch decks. Just a heads-up when we&apos;re live.
        </p>
      </div>
    </section>
  );
}
