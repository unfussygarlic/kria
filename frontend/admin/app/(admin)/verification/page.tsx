"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { VerificationJob } from "@/types";

const ID_LABELS: Record<string, string> = {
  aadhaar:          "AADHAAR",
  pan:              "PAN",
  passport:         "PASSPORT",
  driving_licence:  "DL",
  voter_id:         "VOTER ID",
};

function useTickingAge(createdAt: string) {
  const [age, setAge] = useState("");
  useEffect(() => {
    const calc = () => {
      const diff = Date.now() - new Date(createdAt).getTime();
      const m = Math.floor(diff / 60000);
      if (m < 60) { setAge(`${m}m`); return; }
      const h = Math.floor(m / 60);
      setAge(`${h}h ${m % 60}m`);
    };
    calc();
    const id = setInterval(calc, 30_000);
    return () => clearInterval(id);
  }, [createdAt]);
  return age;
}

interface JobWithUser extends VerificationJob {
  profiles?: { first_name: string | null; display_name: string | null } | null;
}

function JobCard({ job, onAction }: { job: JobWithUser; onAction: () => void }) {
  const age = useTickingAge(job.created_at);
  const name = job.profiles?.first_name ?? job.profiles?.display_name ?? job.user_id.slice(0, 8);
  const isOld = (Date.now() - new Date(job.created_at).getTime()) > 3_600_000; // > 1h

  const borderStyle =
    job.status === "pending"    ? "3px solid #FFC83D" :
    job.status === "processing" ? "3px solid #8097ff"  :
    job.status === "approved"   ? "3px solid rgba(212,255,0,0.5)" :
                                  "3px solid #ff7351";

  const requeue = async () => {
    await supabase.from("verification_jobs").update({ status: "pending" }).eq("id", job.id);
    onAction();
  };

  const manualApprove = async () => {
    await supabase.from("verification_jobs").update({ status: "approved" }).eq("id", job.id);
    await supabase.from("profiles").update({ is_verified: true }).eq("id", job.user_id);
    onAction();
  };

  return (
    <div
      className="rounded-xl p-4 group"
      style={{
        backgroundColor: "#111111",
        border: "1px solid rgba(255,255,255,0.06)",
        borderLeft: borderStyle,
        ...(job.status === "processing" ? { animation: "blink-border 1.4s ease-in-out infinite" } : {}),
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#9a9a8a" }}
          >
            {name[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="text-xs font-semibold text-white">{name}</p>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: "rgba(128,151,255,0.12)", color: "#8097ff", fontFamily: "var(--font-mono)" }}
            >
              {ID_LABELS[job.id_type] ?? job.id_type.toUpperCase()}
            </span>
          </div>
        </div>
        <span
          className="text-[10px]"
          style={{ color: isOld ? "#FFC83D" : "#555550", fontFamily: "var(--font-mono)" }}
        >
          {age}
        </span>
      </div>

      {job.error_code && (
        <p
          className="text-[10px] px-2 py-1 rounded mb-3"
          style={{ backgroundColor: "rgba(255,115,81,0.10)", color: "#ff7351", fontFamily: "var(--font-mono)" }}
        >
          {job.error_code}
        </p>
      )}

      {/* Hover actions */}
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {(job.status === "pending" || job.status === "failed") && (
          <button
            onClick={requeue}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
            style={{ backgroundColor: "rgba(255,200,61,0.10)", color: "#FFC83D" }}
          >
            <RefreshCw size={10} /> Re-queue
          </button>
        )}
        {job.status === "failed" && (
          <button
            onClick={manualApprove}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
            style={{ backgroundColor: "rgba(212,255,0,0.08)", color: "#D4FF00" }}
          >
            <CheckCircle size={10} /> Approve
          </button>
        )}
      </div>
    </div>
  );
}

export default function VerificationPage() {
  const [jobs, setJobs] = useState<JobWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("verification_jobs")
      .select("*, profiles(first_name, display_name)")
      .order("created_at", { ascending: true });
    setJobs(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const columns: { key: VerificationJob["status"]; label: string; accent: string }[] = [
    { key: "pending",    label: "Pending",    accent: "#FFC83D" },
    { key: "processing", label: "Processing", accent: "#8097ff" },
    { key: "approved",   label: "Approved",   accent: "#D4FF00" },
    { key: "failed",     label: "Failed",     accent: "#ff7351" },
  ];

  const byStatus = (status: VerificationJob["status"]) => jobs.filter(j => j.status === status);

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1" style={{ color: "#555550", fontFamily: "var(--font-mono)" }}>
          Admin · Verification
        </p>
        <h1 className="text-2xl font-bold text-white">Verification Queue</h1>
        <p className="text-sm mt-1" style={{ color: "#555550" }}>
          {jobs.length} total jobs
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#D4FF00", borderTopColor: "transparent" }} />
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 items-start">
          {columns.map(({ key, label, accent }) => {
            const col = byStatus(key);
            return (
              <div key={key}>
                {/* Column header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#9a9a8a" }}>
                      {label}
                    </span>
                  </div>
                  <span
                    className="text-[11px] px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#555550", fontFamily: "var(--font-mono)" }}
                  >
                    {col.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {col.length === 0 ? (
                    <div
                      className="rounded-xl p-6 text-center"
                      style={{ border: "1px dashed rgba(255,255,255,0.06)", color: "#333330" }}
                    >
                      <p className="text-[11px]" style={{ fontFamily: "var(--font-mono)" }}>Empty</p>
                    </div>
                  ) : (
                    col.map(job => (
                      <JobCard key={job.id} job={job} onAction={fetchJobs} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
