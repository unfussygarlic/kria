"use client";

export default function Footer() {
  return (
    <footer style={{
      borderTop: "1px solid var(--hairline)",
      padding: "28px 48px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 16,
      maxWidth: 1200,
      margin: "0 auto",
    }}>
      {/* Wordmark */}
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <span style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 700,
          fontSize: 20,
          color: "var(--text)",
          letterSpacing: "-0.02em",
        }}>
          kria<span style={{ color: "var(--lime)" }}>.</span>
        </span>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--muted)",
          letterSpacing: "0.04em",
          marginTop: 2,
        }}>India · 2026</span>
      </div>

      {/* Links */}
      <div style={{ display: "flex", gap: 28 }}>
        {[
          { label: "Privacy", href: "/privacy" },
          { label: "Terms", href: "/terms" },
          { label: "Contact", href: "mailto:support@trykria.com" },
        ].map(({ label, href }) => (
          <a
            key={label}
            href={href}
            style={{
              fontSize: 13,
              color: "var(--muted)",
              textDecoration: "none",
              transition: "color 0.2s",
              fontFamily: "var(--font-sans)",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--muted)"; }}
          >
            {label}
          </a>
        ))}
      </div>

      <span style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--muted)",
      }}>© 2026 kria</span>
    </footer>
  );
}
