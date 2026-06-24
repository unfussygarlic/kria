"use client";

import Link from "next/link";
import { ReactNode } from "react";

const LIME = "#D4FF00";
const MUTED = "rgba(244,239,227,0.48)";
const HAIRLINE = "rgba(244,239,227,0.10)";
const TEXT = "#F4EFE3";

interface Section {
  heading: string;
  children: ReactNode;
}

export function LegalSection({ heading, children }: Section) {
  return (
    <section style={{ marginBottom: 48 }}>
      <h2 style={{
        fontSize: 15,
        fontWeight: 700,
        color: LIME,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        marginBottom: 16,
        fontFamily: "var(--font-sans)",
      }}>
        {heading}
      </h2>
      <div style={{
        fontSize: 15,
        lineHeight: 1.8,
        color: "rgba(244,239,227,0.80)",
        fontFamily: "var(--font-sans)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}>
        {children}
      </div>
    </section>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

export function UL({ items }: { items: string[] }) {
  return (
    <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, i) => (
        <li key={i} style={{ listStyleType: "disc" }}>{item}</li>
      ))}
    </ul>
  );
}

interface LegalPageProps {
  title: string;
  subtitle: string;
  effectiveDate: string;
  otherHref: string;
  otherLabel: string;
  children: ReactNode;
}

export default function LegalPage({ title, subtitle, effectiveDate, otherHref, otherLabel, children }: LegalPageProps) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--ink)", display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <nav style={{
        borderBottom: `1px solid ${HAIRLINE}`,
        padding: "0 32px",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        background: "rgba(14,18,13,0.92)",
        backdropFilter: "blur(12px)",
        zIndex: 10,
      }}>
        <Link href="/" style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 700,
          fontSize: 20,
          color: TEXT,
          textDecoration: "none",
          letterSpacing: "-0.02em",
        }}>
          kria<span style={{ color: LIME }}>.</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link href={otherHref} style={{ fontSize: 13, color: MUTED, textDecoration: "none", fontFamily: "var(--font-sans)" }}>
            {otherLabel}
          </Link>
          <Link href="/" style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#0B0F0A",
            background: LIME,
            padding: "6px 14px",
            borderRadius: 8,
            textDecoration: "none",
            fontFamily: "var(--font-sans)",
          }}>
            Back to kria
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{
        borderBottom: `1px solid ${HAIRLINE}`,
        padding: "64px 32px 48px",
        maxWidth: 760,
        margin: "0 auto",
        width: "100%",
      }}>
        <p style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: LIME,
          marginBottom: 12,
          fontFamily: "var(--font-mono)",
        }}>
          {subtitle}
        </p>
        <h1 style={{
          fontSize: 40,
          fontWeight: 700,
          color: TEXT,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          marginBottom: 16,
          fontFamily: "var(--font-sans)",
        }}>
          {title}
        </h1>
        <p style={{ fontSize: 14, color: MUTED, fontFamily: "var(--font-mono)" }}>
          Effective date: {effectiveDate} · Applies to Kria (Android app) and trykria.com
        </p>
      </div>

      {/* Body */}
      <main style={{ flex: 1, maxWidth: 760, margin: "0 auto", width: "100%", padding: "56px 32px 80px" }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${HAIRLINE}`,
        padding: "28px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 16,
        maxWidth: 760,
        margin: "0 auto",
        width: "100%",
      }}>
        <span style={{ fontSize: 12, color: MUTED, fontFamily: "var(--font-mono)" }}>
          © 2026 kria · India
        </span>
        <div style={{ display: "flex", gap: 24 }}>
          <Link href="/privacy" style={{ fontSize: 13, color: MUTED, textDecoration: "none", fontFamily: "var(--font-sans)" }}>Privacy Policy</Link>
          <Link href="/terms" style={{ fontSize: 13, color: MUTED, textDecoration: "none", fontFamily: "var(--font-sans)" }}>Terms of Service</Link>
          <a href="mailto:support@trykria.com" style={{ fontSize: 13, color: MUTED, textDecoration: "none", fontFamily: "var(--font-sans)" }}>Contact</a>
        </div>
      </footer>
    </div>
  );
}
