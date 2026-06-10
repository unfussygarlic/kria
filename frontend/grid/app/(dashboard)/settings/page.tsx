"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { deactivateAccount, deleteAccountRequest, type DeactivateDuration } from "@/lib/api/account";
import { AlertTriangle, Clock, Trash2, ShieldOff, ChevronRight } from "lucide-react";

// ── Duration options ──────────────────────────────────────────────────────────

const DURATION_OPTIONS: { value: DeactivateDuration; label: string; sublabel: string }[] = [
  { value: "7d",         label: "7 days",      sublabel: "Back in one week"     },
  { value: "15d",        label: "15 days",     sublabel: "Back in two weeks"    },
  { value: "30d",        label: "30 days",     sublabel: "Back in a month"      },
  { value: "indefinite", label: "Indefinitely", sublabel: "Until you reactivate" },
];

// ── Shared card ───────────────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-6 space-y-4"
      style={{ backgroundColor: "var(--surface-1)", border: "1px solid var(--border-color)" }}
    >
      {children}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

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
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border-color)" }}
      >
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
    if (result.error) {
      setError(result.error);
      return;
    }
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "rgba(251,191,36,0.12)" }}>
          <ShieldOff size={20} style={{ color: "#f59e0b" }} />
        </div>
        <div>
          <p className="font-bold text-text text-sm">Deactivate Account</p>
          <p className="text-[11px] text-text-muted mt-0.5">Your gigs will be paused and your profile hidden</p>
        </div>
      </div>

      <p className="text-xs text-text-muted mb-4">How long do you want to deactivate?</p>

      <div className="space-y-2 mb-5">
        {DURATION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSelected(opt.value)}
            className="w-full flex items-center justify-between rounded-xl px-4 py-3 transition-all text-left"
            style={{
              border: `1.5px solid ${selected === opt.value ? "var(--primary)" : "var(--border-color)"}`,
              backgroundColor: selected === opt.value ? "rgba(212,255,0,0.06)" : "transparent",
            }}
          >
            <div>
              <p className="text-sm font-semibold text-text">{opt.label}</p>
              <p className="text-[11px] text-text-muted mt-0.5">{opt.sublabel}</p>
            </div>
            <div
              className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
              style={{ borderColor: selected === opt.value ? "var(--primary)" : "var(--border-color)" }}
            >
              {selected === opt.value && (
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--primary)" }} />
              )}
            </div>
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs mb-3" style={{ color: "var(--error)" }}>{error}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          style={{ border: "1px solid var(--border-color)", color: "var(--text-muted)" }}
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-opacity"
          style={{ backgroundColor: "#f59e0b", color: "#000", opacity: loading ? 0.6 : 1 }}
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
    if (result.error) {
      setError(result.error);
      return;
    }
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "rgba(239,68,68,0.12)" }}>
          <Trash2 size={20} style={{ color: "var(--error)" }} />
        </div>
        <div>
          <p className="font-bold text-text text-sm">Delete Account</p>
          <p className="text-[11px] text-text-muted mt-0.5">This cannot be undone</p>
        </div>
      </div>

      <div
        className="rounded-xl p-4 mb-5 space-y-1.5"
        style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}
      >
        <p className="text-xs font-semibold" style={{ color: "var(--error)" }}>What gets deleted:</p>
        <ul className="text-[11px] text-text-muted space-y-1 list-disc list-inside">
          <li>Your profile and all personal information</li>
          <li>All gigs you have posted</li>
          <li>All applications and assignments</li>
          <li>Your ratings and Momentum score</li>
          <li>Your badges and achievements</li>
        </ul>
      </div>

      <p className="text-xs text-text-muted mb-2">
        Type <span className="font-bold text-text">DELETE</span> to confirm:
      </p>
      <input
        type="text"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        placeholder="DELETE"
        className="w-full rounded-lg px-4 py-2.5 text-sm mb-4 outline-none transition-colors"
        style={{
          backgroundColor: "var(--input-bg)",
          border: `1.5px solid ${confirmed ? "var(--error)" : "var(--border-color)"}`,
          color: "var(--text)",
        }}
      />

      {error && (
        <p className="text-xs mb-3" style={{ color: "var(--error)" }}>{error}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
          style={{ border: "1px solid var(--border-color)", color: "var(--text-muted)" }}
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={!confirmed || loading}
          className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-opacity"
          style={{
            backgroundColor: "var(--error)",
            color: "#fff",
            opacity: !confirmed || loading ? 0.4 : 1,
          }}
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

      {/* Account section */}
      <SectionCard>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-muted pb-1"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <AlertTriangle size={12} />
          Account
        </div>

        {/* Deactivate row */}
        <button
          onClick={() => setShowDeactivate(true)}
          className="w-full flex items-center justify-between group py-2 transition-opacity hover:opacity-80"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(251,191,36,0.1)" }}>
              <Clock size={16} style={{ color: "#f59e0b" }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-text">Deactivate Account</p>
              <p className="text-[11px] text-text-muted mt-0.5">Temporarily hide your profile and pause gigs</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-text-muted" />
        </button>

        {/* Divider */}
        <div style={{ borderTop: "1px solid var(--border-subtle)" }} />

        {/* Delete row */}
        <button
          onClick={() => setShowDelete(true)}
          className="w-full flex items-center justify-between group py-2 transition-opacity hover:opacity-80"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(239,68,68,0.1)" }}>
              <Trash2 size={16} style={{ color: "var(--error)" }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold" style={{ color: "var(--error)" }}>Delete Account</p>
              <p className="text-[11px] text-text-muted mt-0.5">Permanently remove your account and all data</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-text-muted" />
        </button>
      </SectionCard>

      <Modal open={showDeactivate} onClose={() => setShowDeactivate(false)}>
        <DeactivateModal onClose={() => setShowDeactivate(false)} />
      </Modal>

      <Modal open={showDelete} onClose={() => setShowDelete(false)}>
        <DeleteModal onClose={() => setShowDelete(false)} />
      </Modal>
    </div>
  );
}
