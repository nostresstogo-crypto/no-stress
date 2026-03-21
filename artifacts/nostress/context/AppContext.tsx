import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Lang } from "@/constants/i18n";

type UserRole = "user" | "structure" | "admin";

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  favorites: string[];
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
  unreadCount: number;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const KEYS = {
  lang: "ns_lang",
  user: "ns_user",
  token: "ns_token",
  favorites: "ns_favorites",
  notifications: "ns_notifications",
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");
  const [user, setUserState] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  useEffect(() => {
    (async () => {
      const [l, u, t, f, n] = await Promise.all([
        AsyncStorage.getItem(KEYS.lang),
        AsyncStorage.getItem(KEYS.user),
        AsyncStorage.getItem(KEYS.token),
        AsyncStorage.getItem(KEYS.favorites),
        AsyncStorage.getItem(KEYS.notifications),
      ]);
      if (l) setLangState(l as Lang);
      if (u) setUserState(JSON.parse(u));
      if (t) setTokenState(t);
      if (f) setFavorites(JSON.parse(f));
      if (n) setNotifications(JSON.parse(n));
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

  const toggleFavorite = useCallback(
    async (eventId: string) => {
      setFavorites((prev) => {
        const next = prev.includes(eventId)
          ? prev.filter((id) => id !== eventId)
          : [...prev, eventId];
        AsyncStorage.setItem(KEYS.favorites, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const isFavorite = useCallback(
    (eventId: string) => favorites.includes(eventId),
    [favorites]
  );

  const addNotification = useCallback(
    (n: Omit<Notification, "id" | "read" | "createdAt">) => {
      setNotifications((prev) => {
        const next = [
          {
            ...n,
            id: Date.now().toString(),
            read: false,
            createdAt: new Date().toISOString(),
          },
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

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const value = useMemo<AppContextValue>(
    () => ({
      lang,
      setLang,
      user,
      setUser,
      token,
      setToken,
      favorites,
      toggleFavorite,
      isFavorite,
      notifications,
      addNotification,
      markAllRead,
      unreadCount,
      selectedCity,
      setSelectedCity,
      selectedCategory,
      setSelectedCategory,
      logout,
    }),
    [
      lang,
      setLang,
      user,
      setUser,
      token,
      setToken,
      favorites,
      toggleFavorite,
      isFavorite,
      notifications,
      addNotification,
      markAllRead,
      unreadCount,
      selectedCity,
      setSelectedCity,
      selectedCategory,
      setSelectedCategory,
      logout,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function useT() {
  const { lang } = useApp();
  const { translations } = require("@/constants/i18n");
  return (key: keyof typeof translations.fr) => translations[lang][key] || translations.fr[key];
}
