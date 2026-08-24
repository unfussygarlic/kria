"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Briefcase, Calendar, BarChart2, Inbox, Zap,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { KriaLogo } from "@/components/ui/KriaLogo";
import { UrgencyDot } from "@/components/ui/UrgencyDot";
import { useHostQueue } from "@/components/layout/HostQueueProvider";
import type { Profile } from "@/types";

const NAV = [
  { href: "/dashboard",    label: "Dashboard",    Icon: LayoutDashboard },
  { href: "/gigs",         label: "Gigs",         Icon: Briefcase },
  { href: "/events",       label: "Events",       Icon: Calendar },
  { href: "/applications", label: "Applications", Icon: Inbox },
  { href: "/analytics",    label: "Analytics",    Icon: BarChart2 },
  { href: "/subscription", label: "Subscription", Icon: Zap },
];

interface Props {
  profile: Profile | null;
  trialDaysRemaining?: number;
}

export function Sidebar({ profile, trialDaysRemaining }: Props) {
  const pathname = usePathname();
  const { queue } = useHostQueue();

  const showTrialDot =
    trialDaysRemaining !== undefined && trialDaysRemaining >= 0 && trialDaysRemaining <= 14;
  const trialDotColor = trialDaysRemaining !== undefined && trialDaysRemaining <= 7 ? "#ff7351" : "#FFC83D";

  // Per-nav-item counts for the urgency dots. Silent (null render) when 0.
  const countFor = (href: string): number => {
    if (href === "/applications") return queue.totalPendingApplications;
    if (href === "/gigs")         return queue.urgent.length + queue.expired.length;
    if (href === "/dashboard")    return queue.urgent.length + queue.expired.length + queue.totalPendingApplications;
    return 0;
  };

  return (
    <aside
      // 256px width — the 2026 SaaS-dashboard convention (Linear, Vercel,
      // Attio, Notion all land here). Was 220px which felt cramped once
      // the label + urgency-dot combo grew.
      className="w-[256px] flex-shrink-0 h-screen sticky top-0 flex flex-col z-50"
      style={{
        backgroundColor: "var(--sidebar-bg)",
        borderRight: "1px solid var(--border-color)",
      }}
    >
      {/* Logo — slightly more air above/below to sit at the same rhythm
          as the top bar on the content side. */}
      <div className="flex items-center gap-3" style={{ padding: "var(--s-xl) var(--s-lg) var(--s-lg)" }}>
        <KriaLogo size={28} style={{ color: "var(--color-primary)" }} />
        <div>
          <div
            className="text-sm font-bold leading-none"
            style={{ fontFamily: "var(--font-comfortaa)", color: "var(--color-primary)" }}
          >
            kria
          </div>
          <div
            className="text-[9px] font-semibold tracking-[0.3em] uppercase mt-0.5"
            style={{ color: "var(--color-text-muted)" }}
          >
            Grid
          </div>
        </div>
      </div>

      {/* Nav — the primary work surface. Rounded pill hover per Linear/
          Notion pattern instead of the old edge-flush strip. */}
      <nav className="flex-1 flex flex-col gap-1" style={{ padding: `0 var(--s-sm)` }}>
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const isSubscription = href === "/subscription";
          const count = countFor(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 text-xs font-bold uppercase tracking-wider active:scale-[0.98] ${
                active ? "nav-item-active" : "nav-item"
              }`}
              style={{
                padding: `var(--s-sm) var(--s-md)`,
                borderRadius: `var(--r-thumb)`,
              }}
            >
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              {count > 0 && <UrgencyDot count={count} />}
              {isSubscription && showTrialDot && (
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: trialDotColor, boxShadow: `0 0 4px ${trialDotColor}` }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="mt-auto" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <ThemeToggle />
      </div>
    </aside>
  );
}
