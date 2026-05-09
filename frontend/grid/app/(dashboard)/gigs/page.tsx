"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, TrendingUp, CheckCircle, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { GigStatusBadge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/Spinner";
import type { Gig, GigStatus } from "@/types";

const STATUS_FILTERS: { label: string; value: GigStatus | "all" }[] = [
  { label: "All",         value: "all" },
  { label: "Open",        value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed",   value: "completed" },
  { label: "Draft",       value: "draft" },
  { label: "Cancelled",   value: "cancelled" },
];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function formatPay(amount: number, type: string) {
  const f = `₹${amount.toLocaleString("en-IN")}`;
  if (type === "hourly") return `${f}/hr`;
  if (type === "per_day") return `${f}/day`;
  return f;
}

export default function GigsPage() {
  const router = useRouter();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<GigStatus | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("gigs")
        .select("*")
        .eq("poster_id", user.id)
        .order("created_at", { ascending: false });
      setGigs((data ?? []) as Gig[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = gigs.filter((g) => {
    if (filter !== "all" && g.status !== filter) return false;
    if (search && !g.title.toLowerCase().includes(search.toLowerCase()) && !g.city.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <PageLoader />;

  const totalSlots  = gigs.reduce((s, g) => s + g.slots_total, 0);
  const filledSlots = gigs.reduce((s, g) => s + g.slots_filled, 0);
  const completed   = gigs.filter((g) => g.status === "completed").length;
  const completionPct = gigs.length > 0 ? Math.round((completed / gigs.length) * 100) : 0;
  const totalEarningsPosted = gigs.reduce((s, g) => s + g.pay_amount * g.slots_total, 0);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text tracking-tight">My Gigs</h1>
          <p className="text-sm text-text-muted mt-1">{gigs.length} gig{gigs.length !== 1 ? "s" : ""} posted</p>
        </div>
        <button
          onClick={() => router.push("/gigs/new")}
          className="flex items-center gap-2 px-5 py-2 bg-primary text-text-inv text-xs font-bold uppercase tracking-wider rounded hover:brightness-110 active:scale-95 transition-all"
        >
          <Plus size={14} /> Post a Gig
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-6 flex-wrap">
        {STATUS_FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
              filter === value
                ? "bg-primary text-text-inv"
                : "bg-surface-1 border border-white/10 text-text-muted hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="ml-auto relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search gigs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 bg-surface-1 border border-white/10 rounded pl-8 pr-4 text-xs text-text placeholder:text-text-muted outline-none focus:border-primary transition-colors w-52"
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-surface-1 border border-white/10 rounded-xl p-12 text-center">
          <p className="text-sm text-text-muted">
            {gigs.length === 0 ? "No gigs yet. Post your first one!" : "No gigs match this filter."}
          </p>
          {gigs.length === 0 && (
            <button
              onClick={() => router.push("/gigs/new")}
              className="mt-4 px-5 py-2 bg-primary text-text-inv text-xs font-bold uppercase tracking-wider rounded hover:brightness-110 transition-all"
            >
              Post a Gig
            </button>
          )}
        </div>
      ) : (
        <div className="bg-surface-1 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 bg-surface-2">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Gig</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted hidden md:table-cell">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted hidden lg:table-cell">Pay</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Slots</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((gig) => (
                <tr
                  key={gig.id}
                  onClick={() => router.push(`/gigs/${gig.id}`)}
                  className="cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-5">
                    <p className="text-sm font-semibold text-text">{gig.title}</p>
                    <p className="text-[10px] text-text-muted mt-0.5 uppercase tracking-wide">
                      {gig.city} · {gig.category.replace(/_/g, " ")}
                    </p>
                  </td>
                  <td className="px-6 py-5 text-sm text-text-sub hidden md:table-cell">
                    {formatDate(gig.event_date)}
                  </td>
                  <td className="px-6 py-5 text-sm text-text-sub hidden lg:table-cell">
                    {formatPay(gig.pay_amount, gig.pay_type)}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-16 bg-surface-3 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: gig.slots_total ? `${(gig.slots_filled / gig.slots_total) * 100}%` : "0%" }}
                        />
                      </div>
                      <span className="text-xs text-text-sub">{gig.slots_filled}/{gig.slots_total}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <GigStatusBadge status={gig.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer stats */}
      {gigs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-surface-2 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Earnings Posted</span>
              <TrendingUp size={16} className="text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">₹{totalEarningsPosted.toLocaleString("en-IN")}</p>
            <p className="text-[10px] text-text-muted mt-1">Total pay across all slots</p>
          </div>
          <div className="bg-surface-2 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Gig Completion</span>
              <CheckCircle size={16} className="text-secondary" />
            </div>
            <p className="text-2xl font-bold text-secondary">{completionPct}%</p>
            <p className="text-[10px] text-text-muted mt-1">{completed} of {gigs.length} gigs completed</p>
          </div>
          <div className="bg-surface-2 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Slots Filled</span>
              <Zap size={16} className="text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">{filledSlots}/{totalSlots}</p>
            <p className="text-[10px] text-text-muted mt-1">
              {totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0}% fill rate overall
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
