import { Stack } from "expo-router";
import { T } from "@/constants/colors";

export default function PostLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: T.surface },
        headerTintColor: T.primary,
        contentStyle: { backgroundColor: T.bg },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerTitle: "Post a Gig",
        }}
      />
    </Stack>
  );
}
