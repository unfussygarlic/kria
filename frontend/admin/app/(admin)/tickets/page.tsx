"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { apiPatch } from "@/lib/api/client";
import type { SupportTicket } from "@/types";

const CATEGORY_COLORS: Record<string, string> = {
  "account":   "#60a5fa",
  "gigs":      "#8097ff",
  "checkin":   "#D4FF00",
  "payments":  "#FFC83D",
  "runners":   "#ff7351",
  "technical": "#a78bfa",
  "other":     "#777575",
};

const CATEGORY_LABELS: Record<string, string> = {
  "account":   "Account & Profile",
  "gigs":      "Gigs & Applications",
  "checkin":   "Check-in & OTP",
  "payments":  "Payments & Billing",
  "runners":   "Runners & Ratings",
  "technical": "Technical Issue",
  "other":     "Other",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatusChip({ status }: { status: SupportTicket["status"] }) {
  const cfg = {
    open:        { color: "#D4FF00", bg: "rgba(212,255,0,0.10)",  label: "Open" },
    in_progress: { color: "#FFC83D", bg: "rgba(255,200,61,0.12)", label: "In Progress" },
    resolved:    { color: "#555550", bg: "rgba(255,255,255,0.06)", label: "Resolved" },
  }[status];
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

export default function TicketsPage() {
  const [tickets, setTickets]     = useState<SupportTicket[]>([]);
  const [selected, setSelected]   = useState<SupportTicket | null>(null);
  const [note, setNote]           = useState("");
  const [resolving, setResolving] = useState(false);
  const [filter, setFilter]       = useState<"all" | "open" | "in_progress" | "resolved">("open");

  const fetchTickets = useCallback(async () => {
    const { data } = await supabase
      .from("support_queries")
      .select("*")
      .order("created_at", { ascending: false });
    setTickets(data ?? []);
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  useEffect(() => {
    if (selected) setNote(selected.admin_note ?? "");
  }, [selected]);

  const handleResolve = async () => {
    if (!selected) return;
    setResolving(true);
    // Use FastAPI endpoint so the resolution email is sent to the user
    await apiPatch(`/admin/support/tickets/${selected.id}`, {
      status: "resolved",
      admin_note: note.trim() || null,
    });
    setResolving(false);
    await fetchTickets();
    setSelected(t => t ? { ...t, status: "resolved", admin_note: note.trim() || null } : null);
  };

  const handleInProgress = async () => {
    if (!selected) return;
    await apiPatch(`/admin/support/tickets/${selected.id}`, { status: "in_progress" });
    await fetchTickets();
    setSelected(t => t ? { ...t, status: "in_progress" } : null);
  };

  const visible = tickets.filter(t => filter === "all" || t.status === filter);
  const counts  = {
    open:        tickets.filter(t => t.status === "open").length,
    in_progress: tickets.filter(t => t.status === "in_progress").length,
    resolved:    tickets.filter(t => t.status === "resolved").length,
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Page header */}
      <div className="px-8 pt-8 pb-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1" style={{ color: "#555550", fontFamily: "var(--font-mono)" }}>
          Admin · Support
        </p>
        <h1 className="text-2xl font-bold text-white">Support Tickets</h1>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mt-5">
          {([
            { key: "open",        label: "Open",        count: counts.open        },
            { key: "in_progress", label: "In Progress", count: counts.in_progress },
            { key: "resolved",    label: "Resolved",    count: counts.resolved    },
            { key: "all",         label: "All",         count: tickets.length     },
          ] as const).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
              style={{
                backgroundColor: filter === key ? "rgba(212,255,0,0.08)" : "transparent",
                color: filter === key ? "#D4FF00" : "#555550",
                border: filter === key ? "1px solid rgba(212,255,0,0.15)" : "1px solid transparent",
              }}
            >
              {label}
              <span
                className="px-1.5 py-0.5 rounded text-[10px]"
                style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "#9a9a8a", fontFamily: "var(--font-mono)" }}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Split panel */}
      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 160px)" }}>
        {/* Left: ticket list */}
        <div
          className="w-[380px] flex-shrink-0 overflow-y-auto"
          style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
        >
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2" style={{ color: "#333330" }}>
              <CheckCircle size={28} />
              <p className="text-xs" style={{ fontFamily: "var(--font-mono)" }}>No tickets here</p>
            </div>
          ) : (
            visible.map(ticket => {
              const dot = CATEGORY_COLORS[ticket.category] ?? "#777575";
              const isSelected = selected?.id === ticket.id;
              return (
                <div
                  key={ticket.id}
                  onClick={() => setSelected(ticket)}
                  className="px-5 py-4 cursor-pointer transition-colors"
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    backgroundColor: isSelected ? "rgba(212,255,0,0.04)" : "transparent",
                    borderLeft: isSelected ? "2px solid #D4FF00" : "2px solid transparent",
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)"; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: dot }}
                      />
                      <p className="text-xs font-semibold text-white truncate">{ticket.subject}</p>
                    </div>
                    <StatusChip status={ticket.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px]"
                      style={{ color: dot, fontFamily: "var(--font-mono)" }}
                    >
                      {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                    </span>
                    <span
                      className="text-[10px]"
                      style={{ color: "#555550", fontFamily: "var(--font-mono)" }}
                    >
                      {timeAgo(ticket.created_at)}
                    </span>
                  </div>
                  <p className="text-[11px] mt-1 truncate" style={{ color: "#555550", fontFamily: "var(--font-mono)" }}>
                    {ticket.email}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Right: detail panel */}
        <div className="flex-1 overflow-y-auto">
          {!selected ? (
            <div
              className="h-full flex flex-col items-center justify-center gap-3"
              style={{
                backgroundImage: "radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            >
              <AlertCircle size={32} style={{ color: "#222220" }} />
              <p className="text-sm font-bold uppercase tracking-widest" style={{ color: "#222220", fontFamily: "var(--font-mono)" }}>
                Select a Ticket
              </p>
            </div>
          ) : (
            <div className="p-8 max-w-2xl">
              {/* Ticket header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[selected.category] ?? "#777575" }}
                    />
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: CATEGORY_COLORS[selected.category] ?? "#777575", fontFamily: "var(--font-mono)" }}
                    >
                      {CATEGORY_LABELS[selected.category] ?? selected.category}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{selected.subject}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs" style={{ color: "#555550", fontFamily: "var(--font-mono)" }}>
                      {selected.email}
                    </span>
                    <span style={{ color: "#333330" }}>·</span>
                    <span className="text-xs" style={{ color: "#555550", fontFamily: "var(--font-mono)" }}>
                      {new Date(selected.created_at).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
                <StatusChip status={selected.status} />
              </div>

              {/* Message */}
              <div
                className="rounded-xl p-5 mb-6 text-sm leading-relaxed"
                style={{
                  backgroundColor: "#111111",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "#e2e4cf",
                  whiteSpace: "pre-wrap",
                }}
              >
                {selected.message}
              </div>

              {/* Admin reply note */}
              {selected.status !== "resolved" && (
                <div className="mb-5">
                  <label className="text-[10px] font-bold uppercase tracking-widest block mb-2" style={{ color: "#555550" }}>
                    Reply Note (sent to user on resolve)
                  </label>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    rows={4}
                    placeholder="Optional note for the user…"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none transition-all"
                    style={{
                      backgroundColor: "#161616",
                      border: "1px solid rgba(255,255,255,0.07)",
                      color: "#e2e4cf",
                      fontFamily: "var(--font-mono)",
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = "rgba(212,255,0,0.35)")}
                    onBlur={e  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
                  />
                </div>
              )}

              {/* Resolved note (read-only) */}
              {selected.status === "resolved" && selected.admin_note && (
                <div
                  className="rounded-xl p-4 mb-6 text-sm"
                  style={{ backgroundColor: "rgba(212,255,0,0.04)", border: "1px solid rgba(212,255,0,0.12)", color: "#9a9a8a" }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#D4FF00" }}>
                    Resolution Note
                  </p>
                  {selected.admin_note}
                </div>
              )}

              {/* Actions */}
              {selected.status !== "resolved" && (
                <div className="flex gap-3">
                  {selected.status === "open" && (
                    <button
                      onClick={handleInProgress}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                      style={{
                        backgroundColor: "rgba(255,200,61,0.08)",
                        border: "1px solid rgba(255,200,61,0.20)",
                        color: "#FFC83D",
                      }}
                    >
                      <Clock size={13} />
                      Mark In Progress
                    </button>
                  )}
                  <button
                    onClick={handleResolve}
                    disabled={resolving}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                    style={{ backgroundColor: "#D4FF00", color: "#080808" }}
                  >
                    <CheckCircle size={13} />
                    {resolving ? "Resolving…" : "Mark Resolved"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
