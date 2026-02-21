import { Stack } from "expo-router";
import { T } from "@/constants/colors";

export default function ChatLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: T.bg },
      }}
    />
  );
}
