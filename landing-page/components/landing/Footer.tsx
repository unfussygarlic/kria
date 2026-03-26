import KriaWordmark from "./KriaWordmark";

export default function Footer() {
  return (
    <footer style={{
      borderTop: "1px solid rgba(255,255,255,0.05)",
      padding: "28px 48px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 16,
    }}>
      <KriaWordmark size={20} />
      <div style={{ display: "flex", gap: 32 }}>
        {["Privacy", "Terms", "Contact"].map(item => (
          <a key={item} href="#" style={{
            fontSize: 13, color: "rgba(255,255,255,0.25)", textDecoration: "none", transition: "color 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.25)"; }}>
            {item}
          </a>
        ))}
      </div>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>© 2026 kria</span>
    </footer>
  );
}
