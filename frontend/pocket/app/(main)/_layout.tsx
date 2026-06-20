import { Platform, StatusBar as RNStatusBar } from "react-native";
import { Stack } from "expo-router";
import { T } from "@/constants/colors";

// Edge-to-edge on Android (SDK 54 / RN 0.79+) makes the status bar translucent.
// Explicitly pass currentHeight so the header never overlaps the notification bar.
const HEADER_STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (RNStatusBar.currentHeight ?? 24) : undefined;

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: T.bg },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="gig/[id]"
        options={{
          presentation: "card",
          headerShown: true,
          headerTitle: "",
          headerBackTitle: "Back",
          headerTintColor: T.primary,
          headerStyle: { backgroundColor: T.bg },
          headerShadowVisible: false,
          headerStatusBarHeight: HEADER_STATUS_BAR_HEIGHT,
        }}
      />
      <Stack.Screen
        name="gig/applicants/[gigId]"
        options={{
          presentation: "card",
          headerShown: true,
          headerTitle: "Applicants",
          headerBackTitle: "Back",
          headerTintColor: T.primary,
          headerStyle: { backgroundColor: T.bg },
          headerShadowVisible: false,
          headerStatusBarHeight: HEADER_STATUS_BAR_HEIGHT,
        }}
      />
      <Stack.Screen
        name="post"
        options={{
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="event/create"
        options={{
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="event/[id]"
        options={{
          presentation: "card",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="event/add-job"
        options={{
          presentation: "card",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="wallet"
        options={{
          presentation: "card",
          headerShown: true,
          headerTitle: "Momentum Wallet",
          headerTintColor: T.primary,
        }}
      />
      <Stack.Screen
        name="chat"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
