import "../global.css";
import { useEffect, useRef } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { useAuthStore } from "@/stores/authStore";
import { T } from "@/constants/colors";
import { registerForPushNotifications } from "@/lib/notifications";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const isLoading = useAuthStore((s) => s.isLoading);
  const session = useAuthStore((s) => s.session);
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

    // Handle tap on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (_response) => {
        // TODO: navigate based on _response.notification.request.content.data.type
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
  );
}
