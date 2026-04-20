import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";
import { Lang } from "@/constants/i18n";
import { getThemeColors, ColorPalette } from "@/constants/colors";
import { MOCK_CITIES } from "@/constants/data";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

export interface ApiEvent {
  id: string | number;
  title?: string;
  titleFr?: string;
  category?: string;
  city?: string;
  venue?: string;
  date: string;
  time?: string;
  description?: string;
  descriptionFr?: string;
  price?: number;
  imageUrl?: string;
  status?: string;
}

type UserRole = "user" | "structure" | "admin";
type ThemeMode = "dark" | "light" | "system";

export interface MyEvent {
  id: string;
  titleFr: string;
  titleEn: string;
  category: string;
  city: string;
  venue: string;
  date: string;
  time: string;
  descriptionFr: string;
  descriptionEn: string;
  priceFCFA: number;
  isFree: boolean;
  isSponsored: boolean;
  imageUrl: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  favorites: string[];
  partnerStatus?: "pending" | "approved" | "rejected";
  partnerRejectionReason?: string;
  emailVerified?: boolean;
}

interface Notification {
  id: string;
  title: string;
  titleFr: string;
  body: string;
  bodyFr: string;
  read: boolean;
  createdAt: string;
}

interface AppContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  refreshToken: string | null;
  setRefreshToken: (token: string | null) => void;
  setSession: (token: string | null, refreshToken: string | null) => void;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  favorites: string[];
  toggleFavorite: (eventId: string) => void;
  isFavorite: (eventId: string) => boolean;
  notifications: Notification[];
  addNotification: (n: Omit<Notification, "id" | "read" | "createdAt">) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
  unreadCount: number;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  logout: () => void;
  hasOnboarded: boolean;
  setHasOnboarded: () => void;
  appReady: boolean;
  myEvents: MyEvent[];
  addMyEvent: (event: Omit<MyEvent, "id" | "status" | "createdAt">) => void;
  updateMyEvent: (id: string, patch: Partial<MyEvent>) => void;
  removeMyEvent: (id: string) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  colors: ColorPalette;
  locationNotificationsEnabled: boolean;
  setLocationNotificationsEnabled: (enabled: boolean) => void;
  nearbyEventsCount: number;
  apiEvents: ApiEvent[];
  refreshApiEvents: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const KEYS = {
  lang: "ns_lang",
  user: "ns_user",
  token: "ns_token",
  refreshToken: "ns_refresh_token",
  favorites: "ns_favorites",
  notifications: "ns_notifications",
  onboarded: "ns_onboarded",
  myEvents: "ns_my_events",
  themeMode: "ns_theme_mode",
  locationNotif: "ns_location_notif",
  lastNotifCity: "ns_last_notif_city",
};

export function AppProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [lang, setLangState] = useState<Lang>("fr");
  const [user, setUserState] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [refreshToken, setRefreshTokenState] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const refreshRef = useRef<string | null>(null);
  const refreshInflight = useRef<Promise<string | null> | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [hasOnboarded, setHasOnboardedState] = useState<boolean>(false);
  const [appReady, setAppReady] = useState<boolean>(false);
  const [myEvents, setMyEvents] = useState<MyEvent[]>([]);
  const [themeMode, setThemeModeState] = useState<ThemeMode>("dark");
  const [locationNotificationsEnabled, setLocationNotificationsEnabledState] = useState<boolean>(true);
  const [apiEvents, setApiEvents] = useState<ApiEvent[]>([]);
  const notifiedCityRef = useRef<string>("");

  const refreshApiEvents = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/events`);
      if (!r.ok) return;
      const data = await r.json();
      setApiEvents(Array.isArray(data?.events) ? data.events : []);
    } catch {}
  }, []);

  useEffect(() => { refreshApiEvents(); }, [refreshApiEvents]);

  const isDark = useMemo(() => {
    if (themeMode === "system") return systemScheme !== "light";
    return themeMode === "dark";
  }, [themeMode, systemScheme]);

  const colors = useMemo(() => getThemeColors(isDark), [isDark]);

  useEffect(() => {
    let cancelled = false;
    const safeGet = (k: string) => AsyncStorage.getItem(k).catch(() => null);
    const safeParse = <T,>(s: string | null): T | null => {
      if (!s) return null;
      try { return JSON.parse(s) as T; } catch { return null; }
    };
    (async () => {
      try {
        const [l, u, t, f, n, o, me, tm, ln, lnc, rt] = await Promise.all([
          safeGet(KEYS.lang),
          safeGet(KEYS.user),
          safeGet(KEYS.token),
          safeGet(KEYS.favorites),
          safeGet(KEYS.notifications),
          safeGet(KEYS.onboarded),
          safeGet(KEYS.myEvents),
          safeGet(KEYS.themeMode),
          safeGet(KEYS.locationNotif),
          safeGet(KEYS.lastNotifCity),
          safeGet(KEYS.refreshToken),
        ]);
        if (cancelled) return;
        if (l) {
          const validLang = (l === "fr" || l === "en") ? (l as Lang) : "fr";
          setLangState(validLang);
          if (validLang !== l) {
            AsyncStorage.setItem(KEYS.lang, validLang).catch(() => {});
          }
        }
        const userObj = safeParse<User>(u);
        if (userObj) setUserState(userObj);
        if (t) { setTokenState(t); tokenRef.current = t; }
        if (rt) { setRefreshTokenState(rt); refreshRef.current = rt; }
        const fav = safeParse<string[]>(f);
        if (fav && Array.isArray(fav)) setFavorites(fav);
        const notifs = safeParse<Notification[]>(n);
        if (notifs) setNotifications(notifs);
        if (o === "true") setHasOnboardedState(true);
        const meArr = safeParse<MyEvent[]>(me);
        if (meArr) setMyEvents(meArr);
        if (tm === "system" || tm === "dark" || tm === "light") setThemeModeState(tm as ThemeMode);
        if (ln !== null) setLocationNotificationsEnabledState(ln === "true");
        if (lnc) notifiedCityRef.current = lnc;
      } catch (err) {
        console.error("[AppContext] hydrate failed:", err);
      } finally {
        if (!cancelled) setAppReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setLang = useCallback(async (l: Lang) => {
    setLangState(l);
    await AsyncStorage.setItem(KEYS.lang, l);
  }, []);

  const setUser = useCallback(async (u: User | null) => {
    setUserState(u);
    if (u) await AsyncStorage.setItem(KEYS.user, JSON.stringify(u));
    else await AsyncStorage.removeItem(KEYS.user);
  }, []);

  const setToken = useCallback(async (t: string | null) => {
    setTokenState(t);
    tokenRef.current = t;
    if (t) await AsyncStorage.setItem(KEYS.token, t);
    else await AsyncStorage.removeItem(KEYS.token);
  }, []);

  const setRefreshToken = useCallback(async (rt: string | null) => {
    setRefreshTokenState(rt);
    refreshRef.current = rt;
    if (rt) await AsyncStorage.setItem(KEYS.refreshToken, rt);
    else await AsyncStorage.removeItem(KEYS.refreshToken);
  }, []);

  const setSession = useCallback(async (t: string | null, rt: string | null) => {
    setTokenState(t);
    setRefreshTokenState(rt);
    tokenRef.current = t;
    refreshRef.current = rt;
    const ops: Promise<any>[] = [];
    ops.push(t ? AsyncStorage.setItem(KEYS.token, t) : AsyncStorage.removeItem(KEYS.token));
    ops.push(rt ? AsyncStorage.setItem(KEYS.refreshToken, rt) : AsyncStorage.removeItem(KEYS.refreshToken));
    await Promise.all(ops);
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (refreshInflight.current) return refreshInflight.current;
    const rt = refreshRef.current;
    if (!rt) return null;
    refreshInflight.current = (async () => {
      try {
        const r = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: rt }),
        });
        if (!r.ok) {
          await setSession(null, null);
          setUserState(null);
          await AsyncStorage.removeItem(KEYS.user);
          return null;
        }
        const data = await r.json();
        await setSession(data.token, data.refreshToken);
        return data.token as string;
      } catch {
        return null;
      } finally {
        refreshInflight.current = null;
      }
    })();
    return refreshInflight.current;
  }, [setSession]);

  const authFetch = useCallback(async (url: string, init: RequestInit = {}): Promise<Response> => {
    const buildHeaders = (t: string | null): HeadersInit => {
      const h: Record<string, string> = { ...(init.headers as any) };
      if (t) h["Authorization"] = `Bearer ${t}`;
      return h;
    };
    let res = await fetch(url, { ...init, headers: buildHeaders(tokenRef.current) });
    if (res.status !== 401 || !refreshRef.current) return res;
    const newToken = await refreshAccessToken();
    if (!newToken) return res;
    res = await fetch(url, { ...init, headers: buildHeaders(newToken) });
    return res;
  }, [refreshAccessToken]);

  const toggleFavorite = useCallback(async (eventId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId];
      AsyncStorage.setItem(KEYS.favorites, JSON.stringify(next));
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (eventId: string) => favorites.includes(eventId),
    [favorites]
  );

  const addNotification = useCallback(
    (n: Omit<Notification, "id" | "read" | "createdAt">) => {
      setNotifications((prev) => {
        const next = [
          { ...n, id: Date.now().toString(), read: false, createdAt: new Date().toISOString() },
          ...prev,
        ];
        AsyncStorage.setItem(KEYS.notifications, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      AsyncStorage.setItem(KEYS.notifications, JSON.stringify(next));
      return next;
    });
  }, []);

  const logout = useCallback(async () => {
    const rt = refreshRef.current;
    if (rt) {
      fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      }).catch(() => {});
    }
    setUserState(null);
    setTokenState(null);
    setRefreshTokenState(null);
    tokenRef.current = null;
    refreshRef.current = null;
    await AsyncStorage.multiRemove([KEYS.user, KEYS.token, KEYS.refreshToken]);
  }, []);

  const setHasOnboarded = useCallback(async () => {
    setHasOnboardedState(true);
    await AsyncStorage.setItem(KEYS.onboarded, "true");
  }, []);

  const addMyEvent = useCallback(
    (eventData: Omit<MyEvent, "id" | "status" | "createdAt">) => {
      setMyEvents((prev) => {
        const newEvent: MyEvent = {
          ...eventData,
          id: "ev_" + Date.now(),
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        const next = [newEvent, ...prev];
        AsyncStorage.setItem(KEYS.myEvents, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const updateMyEvent = useCallback((id: string, patch: Partial<MyEvent>) => {
    setMyEvents((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...patch } : e));
      AsyncStorage.setItem(KEYS.myEvents, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeMyEvent = useCallback((id: string) => {
    setMyEvents((prev) => {
      const next = prev.filter((e) => e.id !== id);
      AsyncStorage.setItem(KEYS.myEvents, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id);
      AsyncStorage.setItem(KEYS.notifications, JSON.stringify(next));
      return next;
    });
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(KEYS.themeMode, mode);
  }, []);

  const setLocationNotificationsEnabled = useCallback(async (enabled: boolean) => {
    setLocationNotificationsEnabledState(enabled);
    await AsyncStorage.setItem(KEYS.locationNotif, enabled ? "true" : "false");
  }, []);

  const nearbyEventsCount = useMemo(() => {
    const city = selectedCity || (user?.role === "user" ? "" : "");
    if (!city) return 0;
    return apiEvents.filter(
      (e) => (e.status ?? "approved") === "approved" && (e.city || "").toLowerCase() === city.toLowerCase()
    ).length;
  }, [selectedCity, user, apiEvents]);

  useEffect(() => {
    if (!locationNotificationsEnabled || !user || user.role !== "user") return;
    const city = selectedCity;
    if (!city || city === notifiedCityRef.current) return;
    const upcomingInCity = apiEvents.filter(
      (e) => (e.status ?? "approved") === "approved" && (e.city || "").toLowerCase() === city.toLowerCase()
    );
    if (upcomingInCity.length === 0) return;
    notifiedCityRef.current = city;
    AsyncStorage.setItem(KEYS.lastNotifCity, city);
    const cityObj = MOCK_CITIES.find((c) => c.name === city);
    const emoji = cityObj ? cityObj.emoji + " " : "";
    const count = upcomingInCity.length;
    const titles = upcomingInCity.slice(0, 3).map((e) => e.titleFr || e.title || "").filter(Boolean);
    setNotifications((prev) => {
      const next = [
        {
          id: "loc_" + Date.now().toString(),
          title: `${emoji}${count} event${count > 1 ? "s" : ""} near ${city}!`,
          titleFr: `${emoji}${count} événement${count > 1 ? "s" : ""} près de ${city} !`,
          body: titles.join(", ") + (count > 3 ? `… +${count - 3}` : ""),
          bodyFr: titles.join(", ") + (count > 3 ? `… +${count - 3}` : ""),
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ];
      AsyncStorage.setItem(KEYS.notifications, JSON.stringify(next));
      return next;
    });
  }, [locationNotificationsEnabled, selectedCity, user]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const value = useMemo<AppContextValue>(
    () => ({
      lang, setLang,
      user, setUser,
      token, setToken,
      refreshToken, setRefreshToken, setSession, authFetch,
      favorites, toggleFavorite, isFavorite,
      notifications, addNotification, markAllRead, removeNotification, unreadCount,
      selectedCity, setSelectedCity,
      selectedCategory, setSelectedCategory,
      logout,
      hasOnboarded, setHasOnboarded,
      appReady,
      myEvents, addMyEvent, updateMyEvent, removeMyEvent,
      themeMode, setThemeMode,
      isDark, colors,
      locationNotificationsEnabled, setLocationNotificationsEnabled,
      nearbyEventsCount,
      apiEvents, refreshApiEvents,
    }),
    [
      lang, setLang,
      user, setUser,
      token, setToken,
      refreshToken, setRefreshToken, setSession, authFetch,
      favorites, toggleFavorite, isFavorite,
      notifications, addNotification, markAllRead, removeNotification, unreadCount,
      selectedCity, setSelectedCity,
      selectedCategory, setSelectedCategory,
      logout,
      hasOnboarded, setHasOnboarded,
      appReady,
      myEvents, addMyEvent, updateMyEvent, removeMyEvent,
      themeMode, setThemeMode,
      isDark, colors,
      locationNotificationsEnabled, setLocationNotificationsEnabled,
      nearbyEventsCount,
      apiEvents, refreshApiEvents,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function useColors(): ColorPalette {
  const { colors } = useApp();
  return colors;
}

export function useT() {
  const { lang } = useApp();
  const { translations } = require("@/constants/i18n");
  return (key: keyof typeof translations.fr) => translations[lang][key] || translations.fr[key];
}
