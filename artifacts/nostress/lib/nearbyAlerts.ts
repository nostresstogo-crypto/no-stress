import { AppState, type AppStateStatus } from "react-native";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ApiEvent } from "@/context/AppContext";

const NEARBY_RADIUS_M = 1000;
const ALERTED_STORAGE_KEY = "ns_nearby_alerted";
const ALERTED_TTL_MS = 6 * 60 * 60 * 1000; // un évent peut re-notifier après 6h

type AlertedMap = Record<string, number>;

let watchSub: Location.LocationSubscription | null = null;
let appStateSub: { remove: () => void } | null = null;
let lastEvents: ApiEvent[] = [];
let lastLang: "fr" | "en" = "fr";
let alerted: AlertedMap = {};
let alertedLoaded = false;

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function isUpcoming(e: ApiEvent): boolean {
  if (!e.date) return false;
  // Garde aujourd'hui et après
  const today = new Date().toISOString().slice(0, 10);
  return e.date >= today;
}

async function loadAlerted(): Promise<void> {
  if (alertedLoaded) return;
  try {
    const raw = await AsyncStorage.getItem(ALERTED_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as AlertedMap) : {};
    const now = Date.now();
    alerted = Object.fromEntries(
      Object.entries(parsed).filter(([, ts]) => now - ts < ALERTED_TTL_MS),
    );
  } catch {
    alerted = {};
  }
  alertedLoaded = true;
}

async function persistAlerted(): Promise<void> {
  try {
    await AsyncStorage.setItem(ALERTED_STORAGE_KEY, JSON.stringify(alerted));
  } catch {}
}

async function checkAndNotify(coords: { latitude: number; longitude: number }) {
  await loadAlerted();
  const now = Date.now();
  for (const ev of lastEvents) {
    if ((ev.status ?? "approved") !== "approved") continue;
    if (!isUpcoming(ev)) continue;
    const lat = (ev as any).latitude;
    const lng = (ev as any).longitude;
    if (typeof lat !== "number" || typeof lng !== "number") continue;
    const id = String(ev.id);
    const last = alerted[id];
    if (last && now - last < ALERTED_TTL_MS) continue;

    const dist = haversineMeters(coords.latitude, coords.longitude, lat, lng);
    if (dist > NEARBY_RADIUS_M) continue;

    const title =
      lastLang === "fr"
        ? `Événement à ${Math.round(dist)} m de vous`
        : `Event ${Math.round(dist)} m from you`;
    const body =
      lastLang === "fr"
        ? `${ev.titleFr || ev.title || "Événement"}${ev.time ? ` — ${ev.time}` : ""}${ev.venue ? ` · ${ev.venue}` : ""}`
        : `${ev.title || ev.titleFr || "Event"}${ev.time ? ` — ${ev.time}` : ""}${ev.venue ? ` · ${ev.venue}` : ""}`;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: "default",
          data: { type: "nearby_event", eventId: id },
        },
        trigger: null, // immédiat
      });
      alerted[id] = now;
    } catch (err) {
      console.warn("[nearbyAlerts] schedule failed", err);
    }
  }
  await persistAlerted();
}

async function startWatch() {
  if (watchSub) return;
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") {
      const req = await Location.requestForegroundPermissionsAsync();
      if (req.status !== "granted") return;
    }
    watchSub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30_000,
        distanceInterval: 100,
      },
      (loc) => {
        void checkAndNotify({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      },
    );
    // Vérification immédiate sur la dernière position connue
    try {
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        void checkAndNotify({
          latitude: last.coords.latitude,
          longitude: last.coords.longitude,
        });
      }
    } catch {}
  } catch (err) {
    console.warn("[nearbyAlerts] startWatch failed", err);
  }
}

function stopWatch() {
  if (watchSub) {
    watchSub.remove();
    watchSub = null;
  }
}

function onAppStateChange(state: AppStateStatus) {
  if (state === "active") {
    void startWatch();
  } else {
    stopWatch();
  }
}

/**
 * À appeler quand l'utilisateur a la fonctionnalité activée et est en role "user".
 * Met à jour la liste d'évènements à surveiller. Démarre le watcher si besoin.
 */
export function updateNearbyAlertsContext(events: ApiEvent[], language: "fr" | "en") {
  lastEvents = events;
  lastLang = language;
}

export async function startNearbyAlerts(events: ApiEvent[], language: "fr" | "en") {
  updateNearbyAlertsContext(events, language);
  if (!appStateSub) {
    appStateSub = AppState.addEventListener("change", onAppStateChange);
  }
  if (AppState.currentState === "active") {
    await startWatch();
  }
}

export function stopNearbyAlerts() {
  stopWatch();
  if (appStateSub) {
    appStateSub.remove();
    appStateSub = null;
  }
}
