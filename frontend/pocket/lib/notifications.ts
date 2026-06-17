/**
 * Push notification registration for Expo / EAS.
 *
 * Call registerForPushNotifications() once after auth — it requests permission,
 * gets the Expo push token, and sends it to the backend.
 */

import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/config";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("[Push] Skipped — not a physical device");
    return null;
  }

  try {
    // Android: create the channel BEFORE requesting permission so the OS can
    // display channel info in the permission dialog (Android 13+).
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Kria",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#D4FF00",
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[Push] Permission denied — status:", finalStatus);
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "f2fb8e91-fb84-44c4-8f99-dd04d012c7a1",
    });
    const token = tokenData.data;
    console.log("[Push] Token obtained:", token);

    await sendTokenToBackend(token);
    return token;
  } catch (err) {
    console.error("[Push] Registration failed:", err);
    return null;
  }
}

async function sendTokenToBackend(token: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    console.warn("[Push] No session — token not saved to backend");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/v1/profiles/me/push-token`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      console.warn("[Push] Backend rejected token — status:", res.status);
    } else {
      console.log("[Push] Token saved to backend");
    }
  } catch (err) {
    console.error("[Push] Failed to save token to backend:", err);
  }
}
