import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { API_BASE } from "./apiBase";

const IS_NATIVE = Platform.OS === "ios" || Platform.OS === "android";

if (IS_NATIVE) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (err) {
    console.warn("[push] setNotificationHandler failed:", err);
  }
}

let cachedToken: string | null = null;

export async function getExpoPushToken(): Promise<string | null> {
  try {
    if (cachedToken) return cachedToken;
    if (!Device.isDevice) return null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FFD700",
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return null;

    const projectId =
      (Constants.expoConfig?.extra as any)?.eas?.projectId ||
      (Constants as any).easConfig?.projectId;

    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    cachedToken = tokenResp.data;
    return cachedToken;
  } catch (err) {
    console.warn("[push] getExpoPushToken failed:", err);
    return null;
  }
}

export async function registerPushPreferences(prefs: {
  city?: string | null;
  favoriteCategories?: string[];
  language?: "fr" | "en";
}): Promise<void> {
  try {
    const token = await getExpoPushToken();
    if (!token) return;
    await fetch(`${API_BASE}/push/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        city: prefs.city || null,
        favoriteCategories: prefs.favoriteCategories || [],
        language: prefs.language || "fr",
      }),
    });
  } catch (err) {
    console.warn("[push] registerPushPreferences failed:", err);
  }
}
