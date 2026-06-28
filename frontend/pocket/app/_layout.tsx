import "../global.css";
import { useEffect, useRef } from "react";
import { router } from "expo-router";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { useAuthStore } from "@/stores/authStore";
import { useMomentumStore } from "@/stores/momentumStore";
import { T } from "@/constants/colors";
import { registerForPushNotifications } from "@/lib/notifications";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const isLoading = useAuthStore((s) => s.isLoading);
  const session = useAuthStore((s) => s.session);
  const fetchSignalMeta = useMomentumStore((s) => s.fetchSignalMeta);
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (!isLoading && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, fontsLoaded]);

  useEffect(() => {
    initialize();
    fetchSignalMeta(); // warm once at startup — no need to re-fetch per screen
  }, []);

  // Register push token when user logs in (session.user.id as dep ensures
  // re-registration on account switch, skips on every token refresh).
  useEffect(() => {
    if (!session?.user.id) return;
    registerForPushNotifications();
  }, [session?.user.id]);

  useEffect(() => {
    // Log foreground notifications (add deep-link navigation here later)
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        // Notification received while app is foregrounded — handled by setNotificationHandler
        void notification;
      }
    );

    // Handle tap on notification — navigate based on payload type
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, string> | undefined;
        const type = data?.type;
        if (type === "application_accepted" || type === "application_rejected" || type === "otp_ready") {
          router.push("/(main)/(tabs)/space");
        } else if (type === "new_applicant") {
          router.push("/(main)/(tabs)/space");
        } else if (data?.gig_id) {
          router.push(`/(main)/gig/${data.gig_id}` as any);
        }
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  if (isLoading || !fontsLoaded) {
    return null; // Splash screen is showing
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: T.bg }}>
        <StatusBar style="light" backgroundColor={T.bg} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: T.bg },
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(main)" />
        </Stack>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
