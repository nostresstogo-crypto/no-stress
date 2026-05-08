import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { API_BASE } from "@/lib/apiBase";

const PROJECT_ID =
  (Constants.expoConfig?.extra as any)?.eas?.projectId ||
  (Constants.easConfig as any)?.projectId ||
  "b372c0cb-009a-40b0-bd7c-720947a2a462";

let cachedToken: string | null = null;
let inflight: Promise<string | null> | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowAlert: true,
  }),
});

async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Général",
    description:
      "Annonces importantes et mises à jour générales de NoStress (nouveautés, informations sur votre compte).",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#B5A8F0",
  });
  await Notifications.setNotificationChannelAsync("nearby_events", {
    name: "Événements à proximité",
    description:
      "Alertes sur les concerts, soirées et festivals à venir près de votre ville et dans vos catégories favorites.",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#E5C46B",
  });
  await Notifications.setNotificationChannelAsync("bookings", {
    name: "Réservations & billets",
    description:
      "Confirmations de réservation, rappels d'événement et mises à jour sur vos billets achetés.",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#3FBE7A",
  });
}

export async function getExpoPushToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      if (!Device.isDevice) return null;
      await ensureAndroidChannels();

      const existing = await Notifications.getPermissionsAsync();
      let status = existing.status;
      if (status !== "granted") {
        const req = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        status = req.status;
      }
      if (status !== "granted") return null;

      const tokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId: PROJECT_ID,
      });
      cachedToken = tokenResponse.data || null;
      return cachedToken;
    } catch (err) {
      console.warn("[push] getExpoPushToken failed", err);
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

let lastSig = "";

export async function registerPushPreferences(prefs: {
  city?: string | null;
  favoriteCategories?: string[];
  language?: "fr" | "en";
}): Promise<void> {
  try {
    const token = await getExpoPushToken();
    if (!token) return;

    const payload = {
      token,
      platform: Platform.OS,
      city: prefs.city || null,
      favoriteCategories: prefs.favoriteCategories || [],
      language: prefs.language || "fr",
    };

    const sig = JSON.stringify(payload);
    if (sig === lastSig) return;
    lastSig = sig;

    const res = await fetch(`${API_BASE}/push/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn("[push] register failed", res.status);
      lastSig = "";
    }
  } catch (err) {
    console.warn("[push] registerPushPreferences failed", err);
  }
}

export async function unregisterPushToken(): Promise<void> {
  try {
    if (!cachedToken) return;
    await fetch(`${API_BASE}/push/unregister`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: cachedToken }),
    });
    cachedToken = null;
    lastSig = "";
  } catch (err) {
    console.warn("[push] unregister failed", err);
  }
}
