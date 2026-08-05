import Link from "next/link";

export default function RunnerNotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0E120D",
        color: "#F4EFE3",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "Inter, system-ui, sans-serif",
        textAlign: "center",
        gap: 12,
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Runner not found</h1>
      <p style={{ color: "rgba(244,239,227,0.55)", maxWidth: 320, margin: 0 }}>
        This profile link may be old or the runner may have deactivated their account.
      </p>
      <Link
        href="/"
        style={{
          marginTop: 12,
          padding: "12px 20px",
          borderRadius: 12,
          background: "#D4FF00",
          color: "#0E120D",
          fontWeight: 800,
          textDecoration: "none",
        }}
      >
        Discover Kria
      </Link>
    </main>
  );
}
