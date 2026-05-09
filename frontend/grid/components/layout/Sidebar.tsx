"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Briefcase, Calendar, User, LogOut, BarChart2, Inbox,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { Profile } from "@/types";

const NAV = [
  { href: "/dashboard",    label: "Dashboard",    Icon: LayoutDashboard },
  { href: "/gigs",         label: "Gigs",         Icon: Briefcase },
  { href: "/applications", label: "Applications", Icon: Inbox },
  { href: "/events",       label: "Events",       Icon: Calendar },
  { href: "/analytics",    label: "Analytics",    Icon: BarChart2 },
  { href: "/profile",      label: "Profile",      Icon: User },
];

interface Props {
  profile: Profile | null;
}

export function Sidebar({ profile }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <aside
      className="w-[220px] flex-shrink-0 h-screen sticky top-0 flex flex-col z-50"
      style={{
        backgroundColor: "var(--sidebar-bg)",
        borderRight: "1px solid var(--border-color)",
      }}
    >
      {/* Logo */}
      <div className="px-8 pt-8 pb-10">
        <div className="text-primary text-2xl" style={{ fontFamily: "var(--font-comfortaa)", fontWeight: 700 }}>kria</div>
        <div className="text-[10px] font-semibold tracking-[0.3em] uppercase text-text-muted mt-0.5">Grid</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-6 py-4 text-xs font-bold uppercase tracking-wider active:scale-[0.98] ${
                active ? "nav-item-active" : "nav-item"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div
        className="mt-auto"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <ThemeToggle />
        <div className="px-6 pb-8">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 py-4 text-xs font-bold uppercase tracking-wider transition-all duration-150 w-full nav-item hover:text-error"
            style={{ color: "var(--nav-inactive-text)" }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
