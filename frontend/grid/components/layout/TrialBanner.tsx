"use client";

import Link from "next/link";

interface Props {
  daysRemaining: number;
}

export function TrialBanner({ daysRemaining }: Props) {
  const urgent = daysRemaining <= 7;

  return (
    <div
      className="w-full px-6 py-2.5 flex items-center justify-between text-xs font-semibold"
      style={{
        backgroundColor: urgent ? "rgba(255,115,81,0.12)" : "rgba(255,200,61,0.10)",
        borderBottom: `1px solid ${urgent ? "rgba(255,115,81,0.25)" : "rgba(255,200,61,0.20)"}`,
        color: urgent ? "#ff7351" : "#FFC83D",
      }}
    >
      <span>
        {daysRemaining === 0
          ? "Your trial expires today."
          : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left in your free trial.`}
      </span>
      <Link
        href="/subscription"
        className="font-bold uppercase tracking-wider text-[10px] opacity-80 hover:opacity-100 transition-opacity"
      >
        View plans →
      </Link>
    </div>
  );
}
