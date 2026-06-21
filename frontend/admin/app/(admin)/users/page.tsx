"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, ShieldCheck, ChevronRight, X, UserX, UserCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getBand, type AdminProfile } from "@/types";

type RoleFilter = "all" | "runner" | "host";

function BandBar({ score }: { score: number | null }) {
  const { color } = getBand(score);
  const pct = score !== null ? Math.min((score / 1000) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px]" style={{ color, fontFamily: "var(--font-mono)" }}>
        {score ?? "—"}
      </span>
    </div>
  );
}

function UserDrawer({ user, onClose }: { user: AdminProfile; onClose: () => void }) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.display_name || "—";
  const { color, label } = getBand(user.worker_score);

  const toggleSuspend = async () => {
    await supabase.from("profiles").update({ is_active: !user.is_active }).eq("id", user.id);
    onClose();
  };

  return (
    <div
      className="drawer-panel fixed top-0 right-0 h-full overflow-y-auto z-50"
      style={{
        width: "420px",
        backgroundColor: "#111111",
        borderLeft: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "-16px 0 48px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header */}
      <div
        className="sticky top-0 flex items-center justify-between px-6 py-4"
        style={{ backgroundColor: "#111111", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40`, color }}
          >
            {(user.first_name?.[0] ?? user.display_name?.[0] ?? "?").toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">{name}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "#555550", fontFamily: "var(--font-mono)" }}>
              {user.email ?? user.phone ?? user.id.slice(0, 8)}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Momentum band */}
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: "#161616", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#555550" }}>
            Momentum
          </p>
          <div className="flex items-end gap-3">
            <p className="text-4xl font-bold" style={{ fontFamily: "var(--font-mono)", color }}>
              {user.worker_score ?? 0}
            </p>
            <span
              className="text-xs font-bold px-2 py-1 rounded-md mb-1"
              style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}30` }}
            >
              {label}
            </span>
          </div>
          <div className="mt-3 h-1.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(((user.worker_score ?? 0) / 1000) * 100, 100)}%`, backgroundColor: color }}
            />
          </div>
        </div>

        {/* Profile details */}
        <div className="space-y-3">
          {[
            { label: "Role",       value: user.default_role ?? "—" },
            { label: "City",       value: user.city ?? "—" },
            { label: "State",      value: user.state ?? "—" },
            { label: "Verified",   value: user.is_verified ? "Yes" : "No" },
            { label: "Status",     value: user.is_active === false ? "Suspended" : "Active" },
            { label: "Gigs Done",  value: String(user.total_gigs_completed ?? 0) },
            { label: "Gigs Posted",value: String(user.total_gigs_posted ?? 0) },
            { label: "Joined",     value: new Date(user.created_at).toLocaleDateString("en-IN") },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-xs" style={{ color: "#555550" }}>{label}</span>
              <span
                className="text-xs font-medium"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: value === "Suspended" ? "#ff7351"
                       : value === "Yes"       ? "#D4FF00"
                       : "#9a9a8a",
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div
          className="pt-4 space-y-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <button
            onClick={toggleSuspend}
            className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
            style={{
              backgroundColor: user.is_active === false ? "rgba(212,255,0,0.07)" : "rgba(255,115,81,0.07)",
              border: `1px solid ${user.is_active === false ? "rgba(212,255,0,0.15)" : "rgba(255,115,81,0.15)"}`,
              color: user.is_active === false ? "#D4FF00" : "#ff7351",
            }}
          >
            {user.is_active === false ? <UserCheck size={14} /> : <UserX size={14} />}
            {user.is_active === false ? "Reactivate Account" : "Suspend Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers]             = useState<AdminProfile[]>([]);
  const [filtered, setFiltered]       = useState<AdminProfile[]>([]);
  const [search, setSearch]           = useState("");
  const [roleFilter, setRoleFilter]   = useState<RoleFilter>("all");
  const [selected, setSelected]       = useState<AdminProfile | null>(null);
  const [loading, setLoading]         = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select(`
        id, first_name, last_name, display_name, email, phone,
        city, state, default_role, is_verified, is_active, is_admin,
        created_at, total_gigs_completed, total_gigs_posted
      `)
      .order("created_at", { ascending: false });

    const profileIds = (data ?? []).map(p => p.id);
    const { data: momentumData } = profileIds.length > 0
      ? await supabase.from("momentum_profiles").select("user_id, worker_score, poster_score").in("user_id", profileIds)
      : { data: [] };

    const scoreMap: Record<string, { worker_score: number; poster_score: number }> = {};
    for (const m of momentumData ?? []) {
      scoreMap[m.user_id] = { worker_score: m.worker_score, poster_score: m.poster_score };
    }

    const enriched: AdminProfile[] = (data ?? []).map(p => ({
      ...p,
      worker_score: scoreMap[p.id]?.worker_score ?? null,
      poster_score: scoreMap[p.id]?.poster_score ?? null,
    }));

    setUsers(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(users.filter(u => {
      const name = `${u.first_name ?? ""} ${u.last_name ?? ""} ${u.display_name ?? ""}`.toLowerCase();
      const contact = `${u.email ?? ""} ${u.phone ?? ""}`.toLowerCase();
      const matchSearch = !q || name.includes(q) || contact.includes(q) || (u.city ?? "").toLowerCase().includes(q);
      const matchRole = roleFilter === "all" || u.default_role === roleFilter;
      return matchSearch && matchRole;
    }));
  }, [users, search, roleFilter]);

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1" style={{ color: "#555550", fontFamily: "var(--font-mono)" }}>
          Admin · Users
        </p>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-sm mt-1" style={{ color: "#555550" }}>
          {users.length.toLocaleString()} total
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="flex items-center gap-2 flex-1 max-w-xs px-3 py-2.5 rounded-xl"
          style={{ backgroundColor: "#111111", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <Search size={14} style={{ color: "#555550" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, city…"
            className="bg-transparent text-sm outline-none w-full"
            style={{ color: "#e2e4cf", fontFamily: "var(--font-mono)" }}
          />
        </div>

        <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
          {(["all", "runner", "host"] as RoleFilter[]).map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors"
              style={{
                backgroundColor: roleFilter === r ? "rgba(212,255,0,0.08)" : "transparent",
                color: roleFilter === r ? "#D4FF00" : "#555550",
                borderRight: r !== "host" ? "1px solid rgba(255,255,255,0.07)" : undefined,
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* Table head */}
        <div
          className="grid text-[10px] font-bold uppercase tracking-[0.15em] px-4 py-3"
          style={{
            gridTemplateColumns: "4px 1fr 80px 80px 96px 80px 40px",
            gap: "16px",
            backgroundColor: "#0d0d0d",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            color: "#555550",
          }}
        >
          <div />
          <div>Name</div>
          <div>Role</div>
          <div>City</div>
          <div>Momentum</div>
          <div>Joined</div>
          <div />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20" style={{ color: "#555550" }}>
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#D4FF00", borderTopColor: "transparent" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20" style={{ color: "#555550", fontFamily: "var(--font-mono)" }}>
            No users found
          </div>
        ) : (
          <div>
            {filtered.map(user => {
              const { band, color } = getBand(user.worker_score);
              const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.display_name || "Unknown";
              const joined = new Date(user.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });

              return (
                <div
                  key={user.id}
                  onClick={() => setSelected(user)}
                  className="grid items-center px-4 py-3.5 cursor-pointer transition-colors group"
                  style={{
                    gridTemplateColumns: "4px 1fr 80px 80px 96px 80px 40px",
                    gap: "16px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    borderLeft: `3px solid ${color}`,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <div /> {/* band border handled by parent */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">{name}</p>
                      {user.is_verified && <ShieldCheck size={12} style={{ color: "#D4FF00", flexShrink: 0 }} />}
                      {user.is_active === false && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(255,115,81,0.15)", color: "#ff7351" }}>
                          suspended
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] truncate mt-0.5" style={{ color: "#555550", fontFamily: "var(--font-mono)" }}>
                      {user.email ?? user.phone ?? user.id.slice(0, 12)}
                    </p>
                  </div>
                  <div>
                    <span
                      className="text-[11px] font-bold px-2 py-1 rounded-md"
                      style={{
                        backgroundColor: user.default_role === "runner" ? "rgba(128,151,255,0.12)" : "rgba(212,255,0,0.10)",
                        color: user.default_role === "runner" ? "#8097ff" : "#D4FF00",
                      }}
                    >
                      {user.default_role ?? "—"}
                    </span>
                  </div>
                  <div className="text-sm truncate" style={{ color: "#9a9a8a" }}>{user.city ?? "—"}</div>
                  <BandBar score={user.worker_score} />
                  <div className="text-[11px]" style={{ color: "#555550", fontFamily: "var(--font-mono)" }}>
                    {joined}
                  </div>
                  <div className="flex justify-center">
                    <ChevronRight size={14} style={{ color: "#333330" }} className="group-hover:text-text-muted transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User detail drawer */}
      {selected && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onClick={() => setSelected(null)}
          />
          <UserDrawer user={selected} onClose={() => setSelected(null)} />
        </>
      )}
    </div>
  );
}
