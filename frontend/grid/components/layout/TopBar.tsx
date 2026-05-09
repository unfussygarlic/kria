"use client";

import { Bell, Settings, Search } from "lucide-react";
import type { Profile } from "@/types";

interface Props {
  profile: Profile | null;
}

export function TopBar({ profile }: Props) {
  const initials = (
    profile?.first_name?.[0] ?? profile?.display_name?.[0] ?? "H"
  ).toUpperCase();

  const name = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? " " + profile.last_name : ""}`
    : profile?.display_name ?? "Host";

  return (
    <header
      className="sticky top-0 z-40 h-16 flex items-center justify-between px-8 backdrop-blur-md"
      style={{
        backgroundColor: "var(--topbar-bg)",
        borderBottom: "1px solid var(--border-color)",
      }}
    >
      {/* Search */}
      <div
        className="flex items-center gap-3 rounded-lg px-4 py-2 w-80 focus-within:ring-1 focus-within:ring-primary transition-all"
        style={{
          backgroundColor: "var(--input-bg)",
          border: "1px solid var(--border-color)",
        }}
      >
        <Search size={15} className="text-text-muted flex-shrink-0" />
        <input
          type="text"
          placeholder="Search gigs or locations..."
          className="bg-transparent text-sm text-text placeholder:text-text-muted outline-none w-full"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-4">
          <button
            className="text-text-muted hover:text-primary transition-colors p-2 rounded-lg"
            style={{ "--tw-bg-opacity": 1 } as React.CSSProperties}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--hover-bg)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <Bell size={18} />
          </button>
          <button
            className="text-text-muted hover:text-primary transition-colors p-2 rounded-lg"
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--hover-bg)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-6" style={{ backgroundColor: "var(--border-color)" }} />

        {/* Profile */}
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="text-right">
            <p className="text-xs font-bold text-text leading-none">{name}</p>
            <p className="text-[10px] text-text-muted mt-0.5">Host</p>
          </div>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "var(--lime)", border: "2px solid var(--lime)" }}
          >
            <span className="text-xs font-bold" style={{ color: "var(--lime-on)" }}>
              {initials}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
