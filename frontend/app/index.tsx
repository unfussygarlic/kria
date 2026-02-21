import { Redirect } from "expo-router";
import { useAuthStore } from "@/stores/authStore";

export default function Index() {
  const session = useAuthStore((s) => s.session);
  const isOnboarded = useAuthStore((s) => s.isOnboarded);

  // Not logged in -> Auth
  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  // Logged in but not onboarded -> Onboarding
  if (!isOnboarded) {
    return <Redirect href="/onboarding/profile" />;
  }

  // Logged in and onboarded -> Main app
  return <Redirect href="/(main)/(tabs)/home" />;
}
