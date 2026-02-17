import { Stack } from "expo-router";
import { T } from "@/constants/colors";

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
          headerTitle: "Gig Details",
          headerTintColor: T.primary,
        }}
      />
      <Stack.Screen
        name="gig/applicants/[gigId]"
        options={{
          presentation: "card",
          headerShown: true,
          headerTitle: "Applicants",
          headerTintColor: T.primary,
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
    </Stack>
  );
}
