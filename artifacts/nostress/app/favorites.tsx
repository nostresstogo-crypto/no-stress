/**
 * Page Favoris — /favorites
 *
 * Centralise tous les favoris de l'utilisateur :
 * - Événements favoris (depuis AppContext.favorites + apiEvents)
 * - Lieux favoris (depuis AppContext.favoriteVenues, données fetchées depuis l'API)
 *
 * Réutilise uniquement les hooks/contextes existants — aucune donnée dupliquée.
 * Accessible depuis le bouton ❤ dans le header de l'accueil.
 */
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import {
  Animated,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import { useApp, useColors } from "@/context/AppContext";
import { EventCard } from "@/components/EventCard";
import { VenueCard } from "@/components/VenueCard";
import { API_BASE } from "@/lib/apiBase";
import { safePush } from "@/lib/navigation";
import {
  Fonts, FontSize, LetterSpacing,
  headingLarge, bodyMedium,
} from "@/constants/typography";

// ─── Types ────────────────────────────────────────────────────────────────────
type FavTab = "events" | "venues";

interface VenueDetail {
  id: string;
  name: string;
  type: string;
  city: string;
  address?: string;
  imageUrl?: string;
  blurhash?: string | null;
  description?: string;
  isVerified?: boolean;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonRow({ C }: { C: ReturnType<typeof useColors> }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const bg = anim.interpolate({ inputRange: [0, 1], outputRange: [C.card, C.card2] });
  return (
    <Animated.View style={{
      height: 80, borderRadius: 14, backgroundColor: bg, marginBottom: 10,
    }} />
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({
  icon, title, subtitle, C,
}: { icon: string; title: string; subtitle: string; C: ReturnType<typeof useColors> }) {
  return (
    <View style={es.wrap}>
      <View style={[es.iconWrap, { backgroundColor: C.card2 }]}>
        <Ionicons name={icon as any} size={32} color={C.textMuted} />
      </View>
      <Text style={[es.title, { color: C.text }]}>{title}</Text>
      <Text style={[es.sub, { color: C.textMuted }]}>{subtitle}</Text>
    </View>
  );
}
const es = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 56, paddingHorizontal: 32, gap: 12 },
  iconWrap: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { fontFamily: Fonts.bold, fontSize: FontSize.lg, textAlign: "center", letterSpacing: LetterSpacing.tight },
  sub: { fontFamily: Fonts.regular, fontSize: FontSize.base, textAlign: "center", lineHeight: FontSize.base * 1.55 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function FavoritesScreen() {
  const C = useColors();
  const { lang, favorites, favoriteVenues, apiEvents, refreshApiEvents, toggleFavorite, toggleFavoriteVenue, isFavoriteVenue } = useApp();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const [activeTab, setActiveTab] = useState<FavTab>("events");
  const [venueDetails, setVenueDetails] = useState<Record<string, VenueDetail>>({});
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Derived favorite events ──────────────────────────────────────────────
  const favoriteEvents = useMemo(() =>
    apiEvents
      .filter((e) => favorites.includes(String(e.id)))
      .map((e) => ({
        id: String(e.id),
        title: e.title || e.titleFr || "",
        titleFr: e.titleFr || e.title || "",
        date: e.date,
        time: e.time || "",
        venue: (e as any).venue || "",
        city: (e as any).city || "",
        category: (e as any).category || "",
        imageUrl: (e as any).imageUrl ?? undefined,
        blurhash: (e as any).blurhash ?? null,
        price: typeof e.price === "number" ? e.price : 0,
        status: (e as any).status || "approved",
      })),
    [apiEvents, favorites]
  );

  // ── Fetch venue details for favorite venues ──────────────────────────────
  const fetchVenueDetails = useCallback(async () => {
    if (favoriteVenues.length === 0) return;
    setLoadingVenues(true);
    const idsToFetch = favoriteVenues.filter((vid) => {
      const numId = vid.startsWith("api_") ? vid.slice(4) : vid;
      return !venueDetails[numId];
    });
    if (idsToFetch.length === 0) { setLoadingVenues(false); return; }

    const results = await Promise.all(
      idsToFetch.map(async (vid) => {
        const numId = vid.startsWith("api_") ? vid.slice(4) : vid;
        try {
          const r = await fetch(`${API_BASE}/venues/${numId}`);
          if (!r.ok) return null;
          const data = await r.json();
          return [numId, {
            id: numId,
            name: data.name || "",
            type: data.type || "",
            city: data.city || "",
            address: data.address,
            imageUrl: data.imageUrl || data.images?.[0] || undefined,
            blurhash: data.blurhash ?? null,
            description: data.description,
            isVerified: !!data.isVerified,
          }] as [string, VenueDetail];
        } catch {
          return null;
        }
      })
    );
    const map: Record<string, VenueDetail> = {};
    for (const r of results) {
      if (r) map[r[0]] = r[1];
    }
    if (Object.keys(map).length > 0) {
      setVenueDetails((prev) => ({ ...prev, ...map }));
    }
    setLoadingVenues(false);
  }, [favoriteVenues, venueDetails]);

  useEffect(() => { fetchVenueDetails(); }, [favoriteVenues.length]);

  useFocusEffect(useCallback(() => {
    refreshApiEvents();
  }, []));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshApiEvents();
    setRefreshing(false);
  }, [refreshApiEvents]);

  // ── Tab segment ──────────────────────────────────────────────────────────
  const evLabel = lang === "fr" ? "Événements" : "Events";
  const vlLabel = lang === "fr" ? "Lieux" : "Venues";
  const evCount = favoriteEvents.length;
  const vlCount = favoriteVenues.length;

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: topInset + 10, backgroundColor: C.bg, borderBottomColor: C.border }]}>
        <View style={s.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[s.backBtn, { backgroundColor: C.card, borderColor: C.border }]}
            hitSlop={8}
            accessibilityLabel={lang === "fr" ? "Retour" : "Back"}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>

          <View style={s.headerCenter}>
            <Text style={[s.headerTitle, { color: C.text }]}>
              {lang === "fr" ? "Mes favoris" : "My favorites"}
            </Text>
            <Text style={[s.headerSub, { color: C.textMuted }]}>
              {evCount + vlCount > 0
                ? (lang === "fr"
                  ? `${evCount + vlCount} élément${evCount + vlCount > 1 ? "s" : ""}`
                  : `${evCount + vlCount} item${evCount + vlCount > 1 ? "s" : ""}`)
                : (lang === "fr" ? "Aucun favori" : "No favorites yet")}
            </Text>
          </View>

          {/* Placeholder for symmetry */}
          <View style={{ width: 40 }} />
        </View>

        {/* Tab segments */}
        <View style={[s.tabs, { backgroundColor: C.card, borderColor: C.border }]}>
          {([
            { key: "events" as FavTab, label: evLabel, count: evCount, icon: "calendar-outline" },
            { key: "venues" as FavTab, label: vlLabel, count: vlCount, icon: "location-outline" },
          ] as const).map(({ key, label, count, icon }) => (
            <TouchableOpacity
              key={key}
              style={[s.tab, activeTab === key && [s.tabActive, { backgroundColor: C.card2 }]]}
              onPress={() => setActiveTab(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === key }}
            >
              <Ionicons
                name={icon}
                size={14}
                color={activeTab === key ? C.lavender : C.textMuted}
              />
              <Text style={[s.tabText, { color: activeTab === key ? C.lavender : C.textMuted },
                activeTab === key && s.tabTextActive]}>
                {label}
              </Text>
              {count > 0 && (
                <View style={[s.tabBadge, { backgroundColor: activeTab === key ? C.lavender : C.border }]}>
                  <Text style={[s.tabBadgeText, { color: activeTab === key ? "#fff" : C.textMuted }]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Content ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingBottom: Platform.OS === "web" ? 118 : 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.lavender} />
        }
      >
        {activeTab === "events" ? (
          evCount === 0 ? (
            <EmptyState
              C={C}
              icon="heart-outline"
              title={lang === "fr" ? "Aucun événement favori" : "No favorite events"}
              subtitle={lang === "fr"
                ? "Appuyez sur ❤ sur un événement pour l'ajouter ici."
                : "Tap ❤ on an event to save it here."}
            />
          ) : (
            <View style={s.list}>
              {favoriteEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  variant="homeCompact"
                  onPress={() => safePush(`/event/${event.id}`)}
                />
              ))}
            </View>
          )
        ) : (
          /* Venues tab */
          loadingVenues && vlCount > 0 ? (
            <View style={s.list}>
              {favoriteVenues.map((_, i) => <SkeletonRow key={i} C={C} />)}
            </View>
          ) : vlCount === 0 ? (
            <EmptyState
              C={C}
              icon="location-outline"
              title={lang === "fr" ? "Aucun lieu favori" : "No favorite venues"}
              subtitle={lang === "fr"
                ? "Retrouvez vos lieux préférés ici après les avoir ajoutés."
                : "Your saved venues will appear here."}
            />
          ) : (
            <View style={s.list}>
              {favoriteVenues.map((vid) => {
                const numId = vid.startsWith("api_") ? vid.slice(4) : vid;
                const navId = vid.startsWith("api_") ? vid : `api_${vid}`;
                const detail = venueDetails[numId];

                if (!detail) {
                  // Not yet loaded — show compact placeholder row
                  return (
                    <TouchableOpacity
                      key={vid}
                      style={[s.venueRow, { backgroundColor: C.card, borderColor: C.border }]}
                      onPress={() => safePush(`/venue/${navId}`)}
                      activeOpacity={0.85}
                    >
                      <View style={[s.venueIconWrap, { backgroundColor: C.card2 }]}>
                        <Ionicons name="business-outline" size={20} color={C.textMuted} />
                      </View>
                      <Text style={[s.venueRowName, { color: C.text }]} numberOfLines={1}>
                        {lang === "fr" ? `Lieu #${numId}` : `Venue #${numId}`}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
                    </TouchableOpacity>
                  );
                }

                return (
                  <VenueCard
                    key={vid}
                    venue={detail}
                    variant="compact"
                    onPress={() => safePush(`/venue/${navId}`)}
                    isFavorite={isFavoriteVenue(vid)}
                    onToggleFavorite={() => toggleFavoriteVenue(vid)}
                  />
                );
              })}
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },

  /* Header */
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center", gap: 2 },
  headerTitle: {
    ...headingLarge,
    fontSize: FontSize.xl,
  },
  headerSub: {
    ...bodyMedium,
    fontSize: FontSize.sm,
  },

  /* Tabs */
  tabs: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {},
  tabText: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.sm,
  },
  tabTextActive: {
    fontFamily: Fonts.semiBold,
  },
  tabBadge: {
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
  },

  /* Content */
  content: { paddingTop: 16 },
  list: { paddingHorizontal: 20, gap: 0 },

  /* Venue compact fallback row */
  venueRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginBottom: 10,
  },
  venueIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  venueRowName: {
    flex: 1,
    fontFamily: Fonts.semiBold,
    fontSize: FontSize.base,
    letterSpacing: LetterSpacing.tight,
  },
});
