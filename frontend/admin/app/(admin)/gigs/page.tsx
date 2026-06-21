"use client";

export default function Page() {
  return (
    <div className="min-h-screen p-8 flex flex-col items-center justify-center gap-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: "rgba(212,255,0,0.08)", border: "1px solid rgba(212,255,0,0.15)" }}
      >
        <span style={{ color: "#D4FF00", fontSize: 20 }}>🚧</span>
      </div>
      <p className="text-sm font-bold uppercase tracking-widest" style={{ color: "#555550", fontFamily: "var(--font-mono)" }}>
        Coming in Phase 2
      </p>
    </div>
  );
}
