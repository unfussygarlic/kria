"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Briefcase, Calendar, User, LogOut, BarChart2, Inbox, Settings, Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { KriaLogo } from "@/components/ui/KriaLogo";
import type { Profile } from "@/types";

const NAV = [
  { href: "/dashboard",    label: "Dashboard",    Icon: LayoutDashboard },
  { href: "/gigs",         label: "Gigs",         Icon: Briefcase },
  { href: "/applications", label: "Applications", Icon: Inbox },
  { href: "/events",       label: "Events",       Icon: Calendar },
  { href: "/analytics",    label: "Analytics",    Icon: BarChart2 },
  { href: "/profile",      label: "Profile",      Icon: User },
  { href: "/settings",     label: "Settings",     Icon: Settings },
  { href: "/subscription", label: "Subscription", Icon: Zap },
];

interface Props {
  profile: Profile | null;
  trialDaysRemaining?: number;
}

export function Sidebar({ profile, trialDaysRemaining }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const showTrialDot =
    trialDaysRemaining !== undefined && trialDaysRemaining >= 0 && trialDaysRemaining <= 14;
  const trialDotColor = trialDaysRemaining !== undefined && trialDaysRemaining <= 7 ? "#ff7351" : "#FFC83D";

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
      <div className="px-6 pt-7 pb-8 flex items-center gap-3">
        <KriaLogo size={28} style={{ color: "var(--color-primary)" }} />
        <div>
          <div className="text-sm font-bold leading-none" style={{ fontFamily: "var(--font-comfortaa)", color: "var(--color-primary)" }}>kria</div>
          <div className="text-[9px] font-semibold tracking-[0.3em] uppercase mt-0.5" style={{ color: "var(--color-text-muted)" }}>Grid</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const isSubscription = href === "/subscription";
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
              {isSubscription && showTrialDot && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: trialDotColor, boxShadow: `0 0 4px ${trialDotColor}` }}
                />
              )}
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
