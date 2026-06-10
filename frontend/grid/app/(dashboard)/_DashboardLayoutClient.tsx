"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSubscription, type SubscriptionStatus } from "@/lib/api/subscriptions";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { TrialBanner } from "@/components/layout/TrialBanner";
import { Spinner } from "@/components/ui/Spinner";
import type { Profile } from "@/types";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      const [profileResult, subResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", session.user.id).single(),
        getSubscription(),
      ]);

      if (!mounted) return;

      if (!profileResult.data) {
        router.replace("/onboarding");
        return;
      }

      setProfile(profileResult.data as Profile);
      if (subResult.data) setSubscription(subResult.data);
      setChecking(false);
    };

    init();

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/login");
    });

    return () => {
      mounted = false;
      authSub.unsubscribe();
    };
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    );
  }

  const showBanner =
    subscription &&
    !subscription.is_expired &&
    subscription.days_remaining <= 14;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--content-bg)" }}>
      <Sidebar profile={profile} trialDaysRemaining={subscription?.days_remaining} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar profile={profile} />
        {showBanner && (
          <TrialBanner daysRemaining={subscription!.days_remaining} />
        )}
        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: "var(--content-bg)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
