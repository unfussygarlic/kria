import { Stack } from "expo-router";
import { Colors } from "@/constants/colors";

export default function PostLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.primary.DEFAULT,
        contentStyle: { backgroundColor: Colors.background },
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
