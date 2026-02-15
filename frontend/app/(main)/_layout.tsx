import { Stack } from "expo-router";
import { Colors } from "@/constants/colors";

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="gig/[id]"
        options={{
          presentation: "card",
          headerShown: true,
          headerTitle: "Gig Details",
          headerTintColor: Colors.primary.DEFAULT,
        }}
      />
      <Stack.Screen
        name="gig/applicants/[gigId]"
        options={{
          presentation: "card",
          headerShown: true,
          headerTitle: "Applicants",
          headerTintColor: Colors.primary.DEFAULT,
        }}
      />
      <Stack.Screen
        name="post"
        options={{
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="wallet"
        options={{
          presentation: "card",
          headerShown: true,
          headerTitle: "Momentum Wallet",
          headerTintColor: Colors.primary.DEFAULT,
        }}
      />
    </Stack>
  );
}
