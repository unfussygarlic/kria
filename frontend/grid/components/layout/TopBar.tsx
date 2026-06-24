"use client";

import { Settings, User, LogOut, ChevronDown, HelpCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";

interface Props {
  profile: Profile | null;
}

export function TopBar({ profile }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = (
    profile?.first_name?.[0] ?? profile?.display_name?.[0] ?? "H"
  ).toUpperCase();

  const name = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? " " + profile.last_name : ""}`
    : profile?.display_name ?? "Host";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <header
      className="sticky top-0 z-40 h-16 flex items-center justify-end px-8 backdrop-blur-md"
      style={{
        backgroundColor: "var(--topbar-bg)",
        borderBottom: "1px solid var(--border-color)",
      }}
    >
      {/* Search — commented out until wired up
      <div
        className="flex items-center gap-3 rounded-lg px-4 py-2 w-80 focus-within:ring-1 focus-within:ring-primary transition-all"
        style={{ backgroundColor: "var(--input-bg)", border: "1px solid var(--border-color)" }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted flex-shrink-0">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input type="text" placeholder="Search gigs or locations..." className="bg-transparent text-sm text-text placeholder:text-text-muted outline-none w-full" />
      </div>
      */}

      {/* Right side */}
      <div className="flex items-center gap-5">
        {/* Bell — commented out until notifications are implemented
        <button
          className="text-text-muted hover:text-primary transition-colors p-2 rounded-lg"
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--hover-bg)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <Bell size={18} />
        </button>
        <div className="w-px h-6" style={{ backgroundColor: "var(--border-color)" }} />
        */}

        {/* Profile dropdown trigger */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors"
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--hover-bg)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
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
            <ChevronDown
              size={14}
              className="text-text-muted transition-transform"
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>

          {/* Dropdown */}
          {open && (
            <div
              className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden z-50"
              style={{
                backgroundColor: "var(--sidebar-bg)",
                border: "1px solid var(--border-color)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.20)",
              }}
            >
              <button
                onClick={() => { setOpen(false); router.push("/profile"); }}
                className="flex items-center gap-3 w-full px-4 py-3 text-xs font-bold uppercase tracking-wider nav-item transition-colors"
              >
                <User size={15} />
                Profile
              </button>
              <button
                onClick={() => { setOpen(false); router.push("/settings"); }}
                className="flex items-center gap-3 w-full px-4 py-3 text-xs font-bold uppercase tracking-wider nav-item transition-colors"
              >
                <Settings size={15} />
                Settings
              </button>
              <button
                onClick={() => { setOpen(false); router.push("/support"); }}
                className="flex items-center gap-3 w-full px-4 py-3 text-xs font-bold uppercase tracking-wider nav-item transition-colors"
              >
                <HelpCircle size={15} />
                Help &amp; Support
              </button>
              <div style={{ borderTop: "1px solid var(--border-subtle)" }} />
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 w-full px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors"
                style={{ color: "var(--color-error, #ff7351)" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--hover-bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
