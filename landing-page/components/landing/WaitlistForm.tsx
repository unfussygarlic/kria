"use client";

import { useState } from "react";
import { LIME } from "./constants";
import { useT } from "./LanguageContext";

export default function WaitlistForm() {
  const [email,   setEmail]   = useState("");
  const [comment, setComment] = useState("");
  const [status,  setStatus]  = useState<"idle" | "loading" | "done">("idle");
  const [error,   setError]   = useState("");
  const t = useT();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t.form.errorEmail);
      return;
    }
    setError("");
    setStatus("loading");
    await new Promise(r => setTimeout(r, 1200)); // replace with real API
    setStatus("done");
  };

  if (status === "done") {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 16, textAlign: "center",
        padding: "44px 32px", borderRadius: 24,
        border: "1px solid rgba(212,255,0,0.2)",
        background: "rgba(212,255,0,0.04)",
        width: "100%",
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 99,
          background: LIME, display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 32px rgba(212,255,0,0.45)",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <p style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: 0 }}>{t.form.successTitle}</p>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", margin: "8px 0 0" }}>
            {t.form.successSub}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate style={{
      display: "flex", flexDirection: "column", gap: 12,
      width: "100%", maxWidth: 480,
    }}>
      {/* Email */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <input
          type="email"
          placeholder={t.form.emailPlaceholder}
          value={email}
          onChange={e => { setEmail(e.target.value); setError(""); }}
          style={{
            width: "100%", padding: "14px 18px", borderRadius: 14,
            border: `1px solid ${error ? "rgba(255,80,80,0.5)" : "rgba(255,255,255,0.1)"}`,
            background: "rgba(255,255,255,0.04)",
            color: "#fff", fontSize: 15, outline: "none",
            fontFamily: "inherit", boxSizing: "border-box",
            transition: "border-color 0.2s",
          }}
          onFocus={e => { if (!error) e.currentTarget.style.borderColor = "rgba(212,255,0,0.35)"; }}
          onBlur={e => { if (!error) e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
        />
        {error && (
          <p style={{ fontSize: 12, color: "rgba(255,100,100,0.85)", margin: 0, paddingLeft: 4 }}>
            {error}
          </p>
        )}
      </div>

      {/* Comment */}
      <textarea
        placeholder={t.form.commentPlaceholder}
        value={comment}
        onChange={e => setComment(e.target.value)}
        rows={3}
        style={{
          width: "100%", padding: "14px 18px", borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.04)",
          color: "#fff", fontSize: 15,
          resize: "none", outline: "none",
          fontFamily: "inherit", boxSizing: "border-box",
          transition: "border-color 0.2s",
        }}
        onFocus={e => { e.currentTarget.style.borderColor = "rgba(212,255,0,0.35)"; }}
        onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
      />

      <button
        type="submit"
        disabled={status === "loading"}
        style={{
          padding: "15px 28px", borderRadius: 14, border: "none",
          background: status === "loading" ? "rgba(212,255,0,0.55)" : LIME,
          color: "#000", fontSize: 15, fontWeight: 700,
          cursor: status === "loading" ? "default" : "pointer",
          transition: "all 0.2s",
          boxShadow: "0 0 28px rgba(212,255,0,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
        onMouseEnter={e => { if (status !== "loading") (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 44px rgba(212,255,0,0.5)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 28px rgba(212,255,0,0.3)"; }}
      >
        {status === "loading" ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"
              style={{ animation: "spin 0.8s linear infinite" }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
            </svg>
            {t.form.joiningBtn}
          </>
        ) : t.form.submitBtn}
      </button>
    </form>
  );
}
