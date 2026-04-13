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
import { MOCK_EVENTS, MOCK_CITIES } from "@/constants/data";

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
  status: "pending" | "approved" | "rejected";
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
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  colors: ColorPalette;
  locationNotificationsEnabled: boolean;
  setLocationNotificationsEnabled: (enabled: boolean) => void;
  nearbyEventsCount: number;
}

const AppContext = createContext<AppContextValue | null>(null);

const KEYS = {
  lang: "ns_lang",
  user: "ns_user",
  token: "ns_token",
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
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [hasOnboarded, setHasOnboardedState] = useState<boolean>(false);
  const [appReady, setAppReady] = useState<boolean>(false);
  const [myEvents, setMyEvents] = useState<MyEvent[]>([]);
  const [themeMode, setThemeModeState] = useState<ThemeMode>("dark");
  const [locationNotificationsEnabled, setLocationNotificationsEnabledState] = useState<boolean>(true);
  const notifiedCityRef = useRef<string>("");

  const isDark = useMemo(() => {
    if (themeMode === "system") return systemScheme !== "light";
    return themeMode === "dark";
  }, [themeMode, systemScheme]);

  const colors = useMemo(() => getThemeColors(isDark), [isDark]);

  useEffect(() => {
    (async () => {
      const [l, u, t, f, n, o, me, tm, ln, lnc] = await Promise.all([
        AsyncStorage.getItem(KEYS.lang),
        AsyncStorage.getItem(KEYS.user),
        AsyncStorage.getItem(KEYS.token),
        AsyncStorage.getItem(KEYS.favorites),
        AsyncStorage.getItem(KEYS.notifications),
        AsyncStorage.getItem(KEYS.onboarded),
        AsyncStorage.getItem(KEYS.myEvents),
        AsyncStorage.getItem(KEYS.themeMode),
        AsyncStorage.getItem(KEYS.locationNotif),
        AsyncStorage.getItem(KEYS.lastNotifCity),
      ]);
      if (l) setLangState(l as Lang);
      if (u) setUserState(JSON.parse(u));
      if (t) setTokenState(t);
      if (f) setFavorites(JSON.parse(f));
      if (n) setNotifications(JSON.parse(n));
      if (o === "true") setHasOnboardedState(true);
      if (me) setMyEvents(JSON.parse(me));
      if (tm) setThemeModeState(tm as ThemeMode);
      if (ln !== null) setLocationNotificationsEnabledState(ln === "true");
      if (lnc) notifiedCityRef.current = lnc;
      setAppReady(true);
    })();
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
    if (t) await AsyncStorage.setItem(KEYS.token, t);
    else await AsyncStorage.removeItem(KEYS.token);
  }, []);

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
    setUserState(null);
    setTokenState(null);
    await AsyncStorage.multiRemove([KEYS.user, KEYS.token]);
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
          status: "approved",
          createdAt: new Date().toISOString(),
        };
        const next = [newEvent, ...prev];
        AsyncStorage.setItem(KEYS.myEvents, JSON.stringify(next));
        return next;
      });
    },
    []
  );

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
    return MOCK_EVENTS.filter(
      (e) => e.status === "approved" && e.city.toLowerCase() === city.toLowerCase()
    ).length;
  }, [selectedCity, user]);

  useEffect(() => {
    if (!locationNotificationsEnabled || !user || user.role !== "user") return;
    const city = selectedCity;
    if (!city || city === notifiedCityRef.current) return;
    const upcomingInCity = MOCK_EVENTS.filter(
      (e) => e.status === "approved" && e.city.toLowerCase() === city.toLowerCase()
    );
    if (upcomingInCity.length === 0) return;
    notifiedCityRef.current = city;
    AsyncStorage.setItem(KEYS.lastNotifCity, city);
    const cityObj = MOCK_CITIES.find((c) => c.name === city);
    const emoji = cityObj ? cityObj.emoji + " " : "";
    const count = upcomingInCity.length;
    setNotifications((prev) => {
      const next = [
        {
          id: "loc_" + Date.now().toString(),
          title: `${emoji}${count} event${count > 1 ? "s" : ""} near ${city}!`,
          titleFr: `${emoji}${count} événement${count > 1 ? "s" : ""} près de ${city} !`,
          body: upcomingInCity.slice(0, 3).map((e) => e.titleFr).join(", ") + (count > 3 ? `… +${count - 3}` : ""),
          bodyFr: upcomingInCity.slice(0, 3).map((e) => e.titleFr).join(", ") + (count > 3 ? `… +${count - 3}` : ""),
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
      favorites, toggleFavorite, isFavorite,
      notifications, addNotification, markAllRead, removeNotification, unreadCount,
      selectedCity, setSelectedCity,
      selectedCategory, setSelectedCategory,
      logout,
      hasOnboarded, setHasOnboarded,
      appReady,
      myEvents, addMyEvent,
      themeMode, setThemeMode,
      isDark, colors,
      locationNotificationsEnabled, setLocationNotificationsEnabled,
      nearbyEventsCount,
    }),
    [
      lang, setLang,
      user, setUser,
      token, setToken,
      favorites, toggleFavorite, isFavorite,
      notifications, addNotification, markAllRead, removeNotification, unreadCount,
      selectedCity, setSelectedCity,
      selectedCategory, setSelectedCategory,
      logout,
      hasOnboarded, setHasOnboarded,
      appReady,
      myEvents, addMyEvent,
      themeMode, setThemeMode,
      isDark, colors,
      locationNotificationsEnabled, setLocationNotificationsEnabled,
      nearbyEventsCount,
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
