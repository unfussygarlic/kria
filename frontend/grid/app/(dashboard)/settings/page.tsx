"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { deactivateAccount, deleteAccountRequest, type DeactivateDuration } from "@/lib/api/account";
import { AlertTriangle, Clock, Trash2, ShieldOff, ChevronRight, X } from "lucide-react";

// ── Duration options ──────────────────────────────────────────────────────────

const DURATION_OPTIONS: { value: DeactivateDuration; label: string; sublabel: string }[] = [
  { value: "7d",         label: "7 days",       sublabel: "Back in one week"     },
  { value: "15d",        label: "15 days",      sublabel: "Back in two weeks"    },
  { value: "30d",        label: "30 days",      sublabel: "Back in a month"      },
  { value: "indefinite", label: "Indefinitely", sublabel: "Until you reactivate" },
];

// ── Modal shell ───────────────────────────────────────────────────────────────

function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.70)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md rounded-2xl p-8 shadow-2xl"
        style={{
          backgroundColor: "var(--card-bg)",
          border: "1px solid var(--border-color)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{ backgroundColor: "var(--hover-bg)", color: "var(--color-text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.10)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--hover-bg)")}
        >
          <X size={14} />
        </button>
        {children}
      </div>
    </div>
  );
}

// ── Deactivate modal ──────────────────────────────────────────────────────────

function DeactivateModal({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<DeactivateDuration>("7d");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    const result = await deactivateAccount(selected);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pr-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "rgba(255,200,61,0.10)", border: "1px solid rgba(255,200,61,0.20)" }}
        >
          <ShieldOff size={18} style={{ color: "#FFC83D" }} />
        </div>
        <div>
          <p className="font-bold text-sm" style={{ color: "var(--color-text)" }}>Deactivate Account</p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Your gigs will be paused and your profile hidden
          </p>
        </div>
      </div>

      <p className="section-title mb-3">How long?</p>

      {/* Duration options */}
      <div className="space-y-2 mb-6">
        {DURATION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSelected(opt.value)}
            className="w-full flex items-center justify-between rounded-xl px-4 py-3 transition-all text-left"
            style={{
              border: `1.5px solid ${selected === opt.value ? "#FFC83D" : "var(--border-color)"}`,
              backgroundColor: selected === opt.value ? "rgba(255,200,61,0.06)" : "transparent",
            }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{opt.label}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>{opt.sublabel}</p>
            </div>
            <div
              className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
              style={{ borderColor: selected === opt.value ? "#FFC83D" : "var(--border-color)" }}
            >
              {selected === opt.value && (
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#FFC83D" }} />
              )}
            </div>
          </button>
        ))}
      </div>

      {error && <p className="text-xs mb-4" style={{ color: "var(--color-error)" }}>{error}</p>}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          style={{ border: "1px solid var(--border-color)", color: "var(--color-text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--hover-bg)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-opacity disabled:opacity-60"
          style={{ backgroundColor: "#FFC83D", color: "#0e0e0e" }}
        >
          {loading ? "Deactivating…" : "Deactivate"}
        </button>
      </div>
    </>
  );
}

// ── Delete modal ──────────────────────────────────────────────────────────────

function DeleteModal({ onClose }: { onClose: () => void }) {
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const confirmed = confirmation === "DELETE";

  const handleDelete = async () => {
    if (!confirmed) return;
    setLoading(true);
    setError("");
    const result = await deleteAccountRequest();
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pr-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "rgba(255,115,81,0.10)", border: "1px solid rgba(255,115,81,0.20)" }}
        >
          <Trash2 size={18} style={{ color: "var(--color-error)" }} />
        </div>
        <div>
          <p className="font-bold text-sm" style={{ color: "var(--color-text)" }}>Delete Account</p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            This action is permanent and cannot be undone
          </p>
        </div>
      </div>

      {/* Warning box */}
      <div
        className="rounded-xl p-4 mb-5 space-y-1.5"
        style={{
          backgroundColor: "rgba(255,115,81,0.06)",
          border: "1px solid rgba(255,115,81,0.18)",
        }}
      >
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-error)" }}>
          What gets deleted
        </p>
        <ul className="space-y-1">
          {[
            "Your profile and all personal information",
            "All gigs you have posted",
            "All applications and assignments",
            "Your ratings and Momentum score",
            "Your badges and achievements",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              <span className="mt-0.5 flex-shrink-0" style={{ color: "var(--color-error)" }}>·</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Confirmation input */}
      <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>
        Type <span className="font-bold" style={{ color: "var(--color-text)" }}>DELETE</span> to confirm:
      </p>
      <input
        type="text"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        placeholder="DELETE"
        className="w-full rounded-xl px-4 py-3 text-sm mb-5 outline-none transition-colors"
        style={{
          backgroundColor: "var(--input-bg)",
          border: `1.5px solid ${confirmed ? "var(--color-error)" : "var(--border-color)"}`,
          color: "var(--color-text)",
        }}
        onFocus={(e) => !confirmed && (e.currentTarget.style.borderColor = "var(--color-primary)")}
        onBlur={(e) => !confirmed && (e.currentTarget.style.borderColor = "var(--border-color)")}
      />

      {error && <p className="text-xs mb-4" style={{ color: "var(--color-error)" }}>{error}</p>}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          style={{ border: "1px solid var(--border-color)", color: "var(--color-text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--hover-bg)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={!confirmed || loading}
          className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-opacity disabled:opacity-30"
          style={{ backgroundColor: "var(--color-error)", color: "#fff" }}
        >
          {loading ? "Deleting…" : "Delete Forever"}
        </button>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      <div>
        <p className="pg-eyebrow">Account</p>
        <h1 className="pg-title">Settings</h1>
        <p className="pg-sub">Manage your account preferences</p>
      </div>

      {/* Account danger zone */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border-color)" }}
      >
        {/* Card header */}
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{ borderBottom: "1px solid var(--border-color)", backgroundColor: "var(--card-bg)" }}
        >
          <AlertTriangle size={12} className="text-text-muted" />
          <span className="section-title">Account</span>
        </div>

        {/* Deactivate row */}
        <button
          onClick={() => setShowDeactivate(true)}
          className="w-full flex items-center justify-between px-6 py-5 transition-colors text-left"
          style={{ backgroundColor: "var(--card-bg)" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--hover-bg)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--card-bg)")}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "rgba(255,200,61,0.10)", border: "1px solid rgba(255,200,61,0.18)" }}
            >
              <Clock size={15} style={{ color: "#FFC83D" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Deactivate Account</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                Temporarily hide your profile and pause gigs
              </p>
            </div>
          </div>
          <ChevronRight size={15} style={{ color: "var(--color-text-muted)" }} />
        </button>

        {/* Divider */}
        <div style={{ borderTop: "1px solid var(--border-subtle)" }} />

        {/* Delete row */}
        <button
          onClick={() => setShowDelete(true)}
          className="w-full flex items-center justify-between px-6 py-5 transition-colors text-left"
          style={{ backgroundColor: "var(--card-bg)" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,115,81,0.04)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--card-bg)")}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "rgba(255,115,81,0.10)", border: "1px solid rgba(255,115,81,0.18)" }}
            >
              <Trash2 size={15} style={{ color: "var(--color-error)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-error)" }}>Delete Account</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                Permanently remove your account and all data
              </p>
            </div>
          </div>
          <ChevronRight size={15} style={{ color: "var(--color-text-muted)" }} />
        </button>
      </div>

      <Modal open={showDeactivate} onClose={() => setShowDeactivate(false)}>
        <DeactivateModal onClose={() => setShowDeactivate(false)} />
      </Modal>

      <Modal open={showDelete} onClose={() => setShowDelete(false)}>
        <DeleteModal onClose={() => setShowDelete(false)} />
      </Modal>
    </div>
  );
}
