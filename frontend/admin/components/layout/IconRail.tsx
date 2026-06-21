"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Ticket, ShieldCheck, Briefcase,
  Zap, CreditCard, Activity, LogOut, Terminal,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const NAV = [
  { href: "/overview",      Icon: LayoutDashboard, label: "Overview"           },
  { href: "/users",         Icon: Users,           label: "Users"              },
  { href: "/tickets",       Icon: Ticket,          label: "Support Tickets"    },
  { href: "/verification",  Icon: ShieldCheck,     label: "Verification Queue" },
  { href: "/gigs",          Icon: Briefcase,       label: "Gigs"               },
  { href: "/momentum",      Icon: Zap,             label: "Momentum"           },
  { href: "/subscriptions", Icon: CreditCard,      label: "Subscriptions"      },
  { href: "/health",        Icon: Activity,        label: "System Health"      },
];

export function IconRail() {
  const pathname = usePathname();
  const router   = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col z-50"
      style={{
        width: "48px",
        backgroundColor: "#0d0d0d",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Logo mark */}
      <div
        className="flex items-center justify-center h-14 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center"
          style={{ backgroundColor: "rgba(212,255,0,0.10)" }}
        >
          <Terminal size={14} style={{ color: "#D4FF00" }} />
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col py-2">
        {NAV.map(({ href, Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <div key={href} className="relative group">
              <Link
                href={href}
                className={`nav-rail-item ${active ? "active" : ""}`}
              >
                <Icon size={17} strokeWidth={1.75} />
              </Link>
              {/* Tooltip */}
              <div
                className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
                style={{
                  backgroundColor: "#1c1c1c",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "#e2e4cf",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                }}
              >
                {label}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom: Sign out + avatar */}
      <div
        className="flex flex-col items-center gap-1 pb-4 pt-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="relative group">
          <button
            onClick={handleSignOut}
            className="nav-rail-item hover:text-red-400"
          >
            <LogOut size={15} strokeWidth={1.75} />
          </button>
          <div
            className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
            style={{
              backgroundColor: "#1c1c1c",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "#ff7351",
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            }}
          >
            Sign Out
          </div>
        </div>

        {/* Admin avatar */}
        <div className="flex flex-col items-center gap-0.5 mt-1">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: "#D4FF00", color: "#080808", fontFamily: "var(--font-mono)" }}
          >
            V
          </div>
          <span
            className="text-[8px] tracking-[0.2em] uppercase"
            style={{ color: "#333330", fontFamily: "var(--font-mono)" }}
          >
            admin
          </span>
        </div>
      </div>
    </aside>
  );
}
