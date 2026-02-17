import { Stack } from "expo-router";
import { T } from "@/constants/colors";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: T.bg },
      }}
    >
      <Stack.Screen name="profile" />
    </Stack>
  );
}
