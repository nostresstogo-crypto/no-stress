import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { safePush } from "@/lib/navigation";

import { useT, useApp, useColors } from "@/context/AppContext";
import { ColorPalette } from "@/constants/colors";
import { parseDateLocal } from "@/lib/formatDate";
import { CategoryPill } from "@/components/CategoryPill";
import { CitySelector } from "@/components/CitySelector";
import { EventCard } from "@/components/EventCard";
import { VenueCard } from "@/components/VenueCard";
import { API_BASE } from "@/lib/apiBase";

type ApiEvent = {
  id: string | number;
  title: string;
  titleFr?: string;
  description?: string | null;
  descriptionFr?: string | null;
  category?: string | null;
  city?: string | null;
  venue?: string | null;
  date: string;
  time?: string | null;
  imageUrl?: string | null;
  price?: number | null;
  status?: string;
};

const { width } = Dimensions.get("window");

type DateRange = "all" | "today" | "week" | "month";
type PriceMode = "all" | "free" | "paid";
type SortKey = "dateAsc" | "dateDesc" | "priceAsc" | "priceDesc";

const DEFAULT_FILTERS = {
  dateRange: "all" as DateRange,
  priceMode: "all" as PriceMode,
  maxPrice: 50000,
  sort: "dateAsc" as SortKey,
};

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: {
      backgroundColor: C.bg, paddingHorizontal: 20,
      paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    headerTop: {
      flexDirection: "row", justifyContent: "space-between",
      alignItems: "flex-end", marginBottom: 14,
    },
    headerGreet: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textMuted },
    headerSub: { fontSize: 28, fontFamily: "Inter_700Bold", color: C.text, letterSpacing: -0.5 },
    searchRow: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: C.card, borderRadius: 12,
      paddingHorizontal: 12, paddingVertical: 10,
      borderWidth: 1, borderColor: C.border, marginBottom: 12, gap: 8,
    },
    searchIcon: {},
    searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: C.text },
    filterBtn: {
      width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: C.border,
      backgroundColor: C.card, alignItems: "center", justifyContent: "center",
      marginBottom: 12, position: "relative",
    },
    filterBadge: {
      position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9,
      backgroundColor: C.lavender, alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
    },
    filterBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
    searchFilterRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
    sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingHorizontal: 20, paddingTop: 16, maxHeight: "85%",
    },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 12 },
    sheetTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 4 },
    sheetSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textMuted, marginBottom: 18 },
    sectionLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.text, marginBottom: 10, marginTop: 14, textTransform: "uppercase", letterSpacing: 0.5 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
      borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
    },
    chipActive: { backgroundColor: C.lavender, borderColor: C.lavender },
    chipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.text },
    chipTextActive: { color: "#fff", fontFamily: "Inter_600SemiBold" },
    priceRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
    priceInput: {
      flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
      fontFamily: "Inter_500Medium", color: C.text, backgroundColor: C.card,
    },
    toggleRow: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.border, marginTop: 14,
    },
    toggleLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: C.text },
    sheetActions: {
      flexDirection: "row", gap: 10, paddingTop: 16, paddingBottom: 24,
      borderTopWidth: 1, borderTopColor: C.border, marginTop: 18,
    },
    btnSecondary: {
      flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1,
      borderColor: C.border, alignItems: "center", backgroundColor: C.card,
    },
    btnSecondaryText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text },
    btnPrimary: {
      flex: 2, paddingVertical: 14, borderRadius: 14,
      alignItems: "center", backgroundColor: C.lavender,
    },
    btnPrimaryText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
    categories: { gap: 8, paddingBottom: 2, paddingRight: 20 },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 16 },
    section: { marginBottom: 24 },
    sectionHeader: {
      flexDirection: "row", justifyContent: "space-between",
      alignItems: "center", marginBottom: 14,
    },
    sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    goldDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.gold },
    sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: C.text },
    countText: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.textMuted },
    horizontalList: { gap: 12, paddingRight: 4 },
    empty: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 16 },
    emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: C.textMuted },
  });
}

export default function HomeScreen() {
  const t = useT();
  const C = useColors();
  const { lang, selectedCity, setSelectedCity, selectedCategory, setSelectedCategory, myEvents, configEventCategories } = useApp();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [venueModal, setVenueModal] = useState<any | null>(null);
  const [apiEvents, setApiEvents] = useState<ApiEvent[]>([]);
  const [apiVenues, setApiVenues] = useState<any[]>([]);

  const loadEvents = useCallback(async () => {
    try {
      const [r, rv] = await Promise.all([
        fetch(`${API_BASE}/events`),
        fetch(`${API_BASE}/venues`),
      ]);
      if (r.ok) {
        const data = await r.json();
        setApiEvents(Array.isArray(data?.events) ? data.events : []);
      }
      if (rv.ok) {
        const data = await rv.json();
        setApiVenues(Array.isArray(data?.venues) ? data.venues : []);
      }
    } catch {}
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);
  useFocusEffect(useCallback(() => {
    setApiEvents([]);
    setApiVenues([]);
    loadEvents();
  }, [loadEvents]));

  const recentVenues = useMemo(() => {
    return [...apiVenues]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5);
  }, [apiVenues]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const styles = useMemo(() => makeStyles(C), [C]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.dateRange !== "all") n++;
    if (filters.priceMode !== "all") n++;
    if (filters.maxPrice !== DEFAULT_FILTERS.maxPrice) n++;
    if (filters.sort !== "dateAsc") n++;
    return n;
  }, [filters]);

  const openFilters = () => {
    setDraftFilters(filters);
    setFilterOpen(true);
  };
  const applyFilters = () => {
    setFilters(draftFilters);
    setFilterOpen(false);
  };
  const resetFilters = () => setDraftFilters(DEFAULT_FILTERS);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const allEvents = useMemo(() => {
    return apiEvents.map((e) => ({
      id: String(e.id),
      title: e.title || e.titleFr || "",
      titleFr: e.titleFr || e.title || "",
      category: e.category || "",
      city: e.city || "",
      venue: e.venue || "",
      venueId: undefined as string | undefined,
      date: e.date,
      time: e.time || "",
      description: e.description || e.descriptionFr || "",
      descriptionFr: e.descriptionFr || e.description || "",
      priceFCFA: typeof e.price === "number" ? e.price : 0,
      isFree: !e.price || e.price === 0,
      imageUrl: e.imageUrl || undefined,
      status: "approved" as const,
    }));
  }, [apiEvents]);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);
    const endOfMonth = new Date(startOfToday.getTime() + 31 * 24 * 60 * 60 * 1000);

    const out = allEvents.filter((e) => {
      const ed = parseDateLocal(e.date);
      if (ed && ed < startOfToday) return false;
      if ((e as any).status === "cancelled") return false;
      const matchCity = !selectedCity || (e.city || "").toLowerCase() === selectedCity.toLowerCase();
      const matchCat = !selectedCategory || e.category === selectedCategory;
      const q = search.trim().toLowerCase();
      const matchSearch = !q ||
        e.title.toLowerCase().includes(q) ||
        (e.titleFr && e.titleFr.toLowerCase().includes(q)) ||
        (e.venue && e.venue.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.descriptionFr && e.descriptionFr.toLowerCase().includes(q));

      let matchDate = true;
      if (filters.dateRange !== "all") {
        const d = parseDateLocal(e.date);
        if (!d) {
          matchDate = false;
        } else if (filters.dateRange === "today") {
          matchDate = d >= startOfToday && d < endOfToday;
        } else if (filters.dateRange === "week") {
          matchDate = d >= startOfToday && d < endOfWeek;
        } else if (filters.dateRange === "month") {
          matchDate = d >= startOfToday && d < endOfMonth;
        }
      }

      const free = e.isFree || (e.priceFCFA ?? 0) === 0;
      let matchPrice = true;
      if (filters.priceMode === "free") matchPrice = free;
      else if (filters.priceMode === "paid") matchPrice = !free;
      if (matchPrice && !free) {
        matchPrice = (e.priceFCFA ?? 0) <= filters.maxPrice;
      }

      return matchCity && matchCat && matchSearch && matchDate && matchPrice;
    });

    out.sort((a, b) => {
      if (filters.sort === "priceAsc") return (a.priceFCFA ?? 0) - (b.priceFCFA ?? 0);
      if (filters.sort === "priceDesc") return (b.priceFCFA ?? 0) - (a.priceFCFA ?? 0);
      const da = new Date(a.date).getTime() || 0;
      const db = new Date(b.date).getTime() || 0;
      return filters.sort === "dateDesc" ? db - da : da - db;
    });
    return out;
  }, [allEvents, selectedCity, selectedCategory, search, filters]);

  // Top section: 5 most-recently-created events (across system, ignoring filters except city/category lightweight context)
  const recentEvents = useMemo(() => {
    const sorted = [...allEvents].sort((a, b) => {
      const ta = new Date((a as any).createdAt || a.date || 0).getTime();
      const tb = new Date((b as any).createdAt || b.date || 0).getTime();
      return tb - ta;
    });
    return sorted.slice(0, 5);
  }, [allEvents]);
  const regularEvents = filteredEvents;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEvents().finally(() => setRefreshing(false));
  }, [loadEvents]);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerGreet}>{t("discover")}</Text>
            <Text style={styles.headerSub}>NoStress</Text>
          </View>
          <CitySelector value={selectedCity} onChange={setSelectedCity} />
        </View>

        {/* Search + Filter */}
        <View style={styles.searchFilterRow}>
          <View style={[styles.searchRow, { flex: 1 }]}>
            <Ionicons name="search" size={18} color={C.textMuted} style={styles.searchIcon} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("searchPlaceholder")}
              placeholderTextColor={C.textMuted}
              style={styles.searchInput}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={openFilters} style={styles.filterBtn} accessibilityLabel={lang === "fr" ? "Filtres" : "Filters"}>
            <Ionicons name="options-outline" size={20} color={C.text} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => safePush("/ai-assistant")}
            style={styles.filterBtn}
            accessibilityLabel="Assistant IA"
          >
            <Ionicons name="sparkles" size={20} color={C.gold} />
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categories}
        >
          <CategoryPill
            categoryKey=""
            selected={selectedCategory === ""}
            onPress={() => setSelectedCategory("")}
          />
          {configEventCategories.map((cat) => (
            <CategoryPill
              key={cat.key}
              categoryKey={cat.key}
              selected={selectedCategory === cat.key}
              onPress={() =>
                setSelectedCategory(selectedCategory === cat.key ? "" : cat.key)
              }
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === "web" ? 118 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.lavender}
          />
        }
      >
        {/* 5 derniers événements créés */}
        {recentEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.goldDot} />
                <Text style={styles.sectionTitle}>
                  {lang === "fr" ? "Derniers événements" : "Latest events"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => safePush("/all-events")} hitSlop={8}>
                <Text style={{ color: C.lavender, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                  {lang === "fr" ? "Voir tout →" : "See all →"}
                </Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              data={recentEvents}
              keyExtractor={(e) => e.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => (
                <EventCard
                  event={item}
                  horizontal
                  onPress={() => safePush(`/event/${item.id}`)}
                />
              )}
            />
          </View>
        )}

        {/* 5 derniers lieux approuvés */}
        {recentVenues.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.goldDot, { backgroundColor: C.gold }]} />
                <Text style={styles.sectionTitle}>
                  {lang === "fr" ? "Derniers lieux" : "Latest venues"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => safePush("/(tabs)/venues")} hitSlop={8}>
                <Text style={{ color: C.lavender, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                  {lang === "fr" ? "Voir tout →" : "See all →"}
                </Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              data={recentVenues}
              keyExtractor={(v) => String(v.id)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => safePush(`/venue/api_${item.id}`)}
                  style={{ width: 220, marginRight: 12, backgroundColor: C.card, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: C.border }}
                  activeOpacity={0.85}
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line jsx-a11y/alt-text
                    <Image source={{ uri: item.imageUrl }} style={{ width: "100%", height: 110 }} />
                  ) : (
                    <View style={{ width: "100%", height: 110, backgroundColor: C.border, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="business" size={28} color={C.textMuted} />
                    </View>
                  )}
                  <View style={{ padding: 10 }}>
                    <Text numberOfLines={1} style={{ color: C.text, fontFamily: "Inter_700Bold", fontSize: 14 }}>{item.name}</Text>
                    <Text numberOfLines={1} style={{ color: C.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
                      {item.type ? `${item.type} · ` : ""}{item.city}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* All Events */}
        {regularEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.goldDot, { backgroundColor: C.lavender }]} />
                <Text style={styles.sectionTitle}>{t("allEvents")}</Text>
              </View>
              <Text style={styles.countText}>{filteredEvents.length}</Text>
            </View>
            {regularEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => safePush(`/event/${event.id}`)}
              />
            ))}
          </View>
        )}

        {/* No results */}
        {filteredEvents.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="search" size={48} color={C.border} />
            <Text style={styles.emptyText}>{t("noEvents")}</Text>
          </View>
        )}

      </ScrollView>

      {/* Filters Modal */}
      <Modal
        visible={filterOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterOpen(false)}
      >
        <TouchableOpacity activeOpacity={1} style={styles.sheetBackdrop} onPress={() => setFilterOpen(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{lang === "fr" ? "Filtres" : "Filters"}</Text>
            <Text style={styles.sheetSubtitle}>
              {lang === "fr" ? "Affinez votre recherche d'événements" : "Refine your event search"}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionLabel}>{lang === "fr" ? "Quand" : "When"}</Text>
              <View style={styles.chipRow}>
                {([
                  { key: "all", labelFr: "Toutes les dates", labelEn: "All dates" },
                  { key: "today", labelFr: "Aujourd'hui", labelEn: "Today" },
                  { key: "week", labelFr: "Cette semaine", labelEn: "This week" },
                  { key: "month", labelFr: "Ce mois-ci", labelEn: "This month" },
                ] as const).map((opt) => {
                  const active = draftFilters.dateRange === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => setDraftFilters({ ...draftFilters, dateRange: opt.key })}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {lang === "fr" ? opt.labelFr : opt.labelEn}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Price filter + price sort hidden by product decision. */}

              <Text style={styles.sectionLabel}>{lang === "fr" ? "Trier par" : "Sort by"}</Text>
              <View style={styles.chipRow}>
                {([
                  { key: "dateAsc", labelFr: "Date ↑", labelEn: "Date ↑" },
                  { key: "dateDesc", labelFr: "Date ↓", labelEn: "Date ↓" },
                ] as const).map((opt) => {
                  const active = draftFilters.sort === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => setDraftFilters({ ...draftFilters, sort: opt.key })}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {lang === "fr" ? opt.labelFr : opt.labelEn}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

            </ScrollView>

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.btnSecondary} onPress={resetFilters}>
                <Text style={styles.btnSecondaryText}>{lang === "fr" ? "Réinitialiser" : "Reset"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={applyFilters}>
                <Text style={styles.btnPrimaryText}>{lang === "fr" ? "Appliquer" : "Apply"}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={!!venueModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setVenueModal(null)}
      >
        {venueModal && (
          <View style={{ flex: 1, backgroundColor: C.bg }}>
            <View style={{ position: "relative" }}>
              {venueModal.imageUrl ? (
                <Image
                  source={{ uri: venueModal.imageUrl }}
                  style={{ width: "100%", height: 220 }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ width: "100%", height: 160, backgroundColor: C.card2, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="business" size={48} color={C.lavender} />
                </View>
              )}
              <TouchableOpacity
                onPress={() => setVenueModal(null)}
                style={{ position: "absolute", top: insets.top + 12, right: 16, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 20, width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: C.text, flex: 1 }}>{venueModal.name}</Text>
                {venueModal.isVerified && <Ionicons name="checkmark-circle" size={20} color={C.lavender} />}
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 }}>
                <View style={{ backgroundColor: C.lavender + "22", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="business-outline" size={12} color={C.lavender} />
                  <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: C.lavender }}>{venueModal.type}</Text>
                </View>
                <View style={{ backgroundColor: C.card2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="location-outline" size={12} color={C.textMuted} />
                  <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: C.textMuted }}>{venueModal.city}</Text>
                </View>
              </View>

              {venueModal.description ? (
                <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: C.textMuted, lineHeight: 22, marginBottom: 20 }}>
                  {venueModal.description}
                </Text>
              ) : null}

              {venueModal.address ? (
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border }}>
                  <Ionicons name="map-outline" size={18} color={C.gold} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: C.textMuted, marginBottom: 2 }}>
                      {lang === "fr" ? "Adresse" : "Address"}
                    </Text>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: C.text }}>
                      {venueModal.address}
                    </Text>
                  </View>
                </View>
              ) : null}

              <TouchableOpacity
                style={{ backgroundColor: C.lavender, borderRadius: 14, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 8 }}
                onPress={() => { setVenueModal(null); safePush("/(tabs)/map"); }}
              >
                <Ionicons name="map" size={18} color={C.bg} />
                <Text style={{ color: C.bg, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>
                  {lang === "fr" ? "Voir sur la carte" : "View on map"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </Modal>

    </View>
  );
}

