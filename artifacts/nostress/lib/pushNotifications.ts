import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { router } from "expo-router";

import { API_BASE } from "@/lib/apiBase";

const PROJECT_ID =
  (Constants.expoConfig?.extra as any)?.eas?.projectId ||
  (Constants.easConfig as any)?.projectId ||
  "b372c0cb-009a-40b0-bd7c-720947a2a462";

// Expo Go doesn't support push notifications since SDK 53.
// We skip all notification setup when running inside Expo Go.
const isExpoGo = Constants.appOwnership === "expo";

let Notifications: typeof import("expo-notifications") | null = null;

if (!isExpoGo) {
  try {
    // Dynamic-style guard: only executed in dev builds and production
    Notifications = require("expo-notifications");
    Notifications!.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowAlert: true,
      }),
    });
  } catch {
    Notifications = null;
  }
}

let cachedToken: string | null = null;
let inflight: Promise<string | null> | null = null;

async function ensureAndroidChannels(): Promise<void> {
  if (!Notifications || Platform.OS !== "android") return;
  try {
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
      name: "Réservations & événements",
      description:
        "Confirmations de réservation, rappels d'événement et mises à jour sur vos activités.",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#3FBE7A",
    });
  } catch (err) {
    console.warn("[push] ensureAndroidChannels failed", err);
  }
}

export async function getExpoPushToken(): Promise<string | null> {
  if (isExpoGo || !Notifications) return null;
  if (cachedToken) return cachedToken;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      if (!Device.isDevice) return null;
      await ensureAndroidChannels();

      const existing = await Notifications!.getPermissionsAsync();
      let status = existing.status;
      if (status !== "granted") {
        const req = await Notifications!.requestPermissionsAsync({
          ios: { allowAlert: true, allowBadge: true, allowSound: true },
        });
        status = req.status;
      }
      if (status !== "granted") return null;

      const tokenResponse = await Notifications!.getExpoPushTokenAsync({
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
  authToken?: string | null;
}): Promise<void> {
  if (isExpoGo || !Notifications) return;
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

    const sig = JSON.stringify({ ...payload, auth: prefs.authToken || "" });
    if (sig === lastSig) return;
    lastSig = sig;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (prefs.authToken) headers["Authorization"] = `Bearer ${prefs.authToken}`;

    const res = await fetch(`${API_BASE}/push/register`, {
      method: "POST",
      headers,
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

function routeFromNotificationData(data: any): string | null {
  if (!data || typeof data !== "object") return null;
  const type = typeof data.type === "string" ? data.type : "";
  const eventId = data.eventId != null ? String(data.eventId) : null;
  const venueId = data.venueId != null ? String(data.venueId) : null;

  if (
    eventId &&
    (type === "nearby_event" ||
      type === "event_approved" ||
      type === "event_updated" ||
      type === "event_rejected" ||
      type === "venue_new_event")
  ) {
    return `/event/${eventId}`;
  }

  if (
    venueId &&
    (type === "venue_updated" ||
      type === "venue_approved" ||
      type === "venue_rejected")
  ) {
    return `/venue/${venueId}`;
  }

  if (eventId) return `/event/${eventId}`;
  if (venueId) return `/venue/${venueId}`;
  return null;
}

function navigateFromNotification(response: any) {
  if (!response) return;
  const data = response.notification?.request?.content?.data;
  const path = routeFromNotificationData(data);
  if (!path) return;
  try {
    router.push(path as any);
  } catch (err) {
    console.warn("[push] navigation failed", err);
  }
}

export function setupNotificationResponseHandling(): () => void {
  if (isExpoGo || !Notifications) return () => {};

  try {
    const sub = Notifications!.addNotificationResponseReceivedListener((response) => {
      navigateFromNotification(response);
    });

    Notifications!.getLastNotificationResponseAsync()
      .then((last) => {
        if (last) setTimeout(() => navigateFromNotification(last), 400);
      })
      .catch(() => {});

    return () => { sub.remove(); };
  } catch {
    return () => {};
  }
}

export async function unregisterPushToken(): Promise<void> {
  if (isExpoGo || !Notifications) return;
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
