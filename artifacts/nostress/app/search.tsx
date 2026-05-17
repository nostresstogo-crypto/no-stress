import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp, useColors } from "@/context/AppContext";
import { EventCard } from "@/components/EventCard";
import { VenueCard } from "@/components/VenueCard";
import { safePush } from "@/lib/navigation";
import { API_BASE } from "@/lib/apiBase";
import { parseDateLocal } from "@/lib/formatDate";
import { ColorPalette } from "@/constants/colors";

type DateRange = "all" | "today" | "week" | "month";
type SortKey = "dateAsc" | "dateDesc";

const DEFAULT_EVENT_FILTERS = {
  dateRange: "all" as DateRange,
  sort: "dateAsc" as SortKey,
};

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: {
      backgroundColor: C.bg,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 12,
    },
    backBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    searchInputWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 12,
      paddingVertical: 9,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: C.text,
      padding: 0,
    },
    filterBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.card,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    filterBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: C.lavender,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    filterBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
    tabRow: {
      flexDirection: "row",
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: "center",
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    tabActive: { borderBottomColor: C.lavender },
    tabText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: C.textMuted,
    },
    tabTextActive: {
      color: C.lavender,
      fontFamily: "Inter_700Bold",
    },
    list: {
      padding: 16,
      paddingBottom: Platform.OS === "web" ? 118 : 100,
    },
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    empty: {
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 80,
      gap: 16,
    },
    emptyText: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: C.textMuted,
      textAlign: "center",
      paddingHorizontal: 32,
    },
    sheetBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: C.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 16,
      maxHeight: "80%",
    },
    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.border,
      alignSelf: "center",
      marginBottom: 16,
    },
    sheetTitle: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      color: C.text,
      marginBottom: 16,
    },
    sectionLabel: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: C.textMuted,
      marginBottom: 10,
      marginTop: 14,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.card,
    },
    chipActive: { backgroundColor: C.lavender, borderColor: C.lavender },
    chipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.text },
    chipTextActive: { color: "#fff", fontFamily: "Inter_600SemiBold" },
    sheetActions: {
      flexDirection: "row",
      gap: 10,
      paddingTop: 16,
      paddingBottom: 24,
      borderTopWidth: 1,
      borderTopColor: C.border,
      marginTop: 18,
    },
    btnSecondary: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      backgroundColor: C.card,
    },
    btnSecondaryText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text },
    btnPrimary: {
      flex: 2,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      backgroundColor: C.lavender,
    },
    btnPrimaryText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  });
}

export default function SearchScreen() {
  const C = useColors();
  const { lang, configVenueTypes } = useApp();
  const insets = useSafeAreaInsets();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const isFr = lang === "fr";
  const styles = useMemo(() => makeStyles(C), [C]);
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const initialQ = String(q || "");
  const [search, setSearch] = useState(initialQ);
  const [hasDirtied, setHasDirtied] = useState(initialQ.length > 0);
  const [activeTab, setActiveTab] = useState<"events" | "venues">("events");
  const [filterOpen, setFilterOpen] = useState(false);

  const [eventFilters, setEventFilters] = useState(DEFAULT_EVENT_FILTERS);
  const [draftEventFilters, setDraftEventFilters] = useState(DEFAULT_EVENT_FILTERS);
  const [venueType, setVenueType] = useState("");
  const [draftVenueType, setDraftVenueType] = useState("");

  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [allVenues, setAllVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const inputRef = useRef<TextInput>(null);

  // Load all data once
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/events`).then((r) => r.json()).catch(() => ({})),
      fetch(`${API_BASE}/venues`).then((r) => r.json()).catch(() => ({})),
    ]).then(([evData, vData]) => {
      setAllEvents(Array.isArray(evData?.events) ? evData.events : []);
      setAllVenues(Array.isArray(vData?.venues) ? vData.venues : []);
    }).finally(() => setLoading(false));
  }, []);

  // Auto-focus on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  // Navigate back to home when search is cleared (only after user has typed)
  useEffect(() => {
    if (hasDirtied && search.trim() === "") {
      router.replace("/" as any);
    }
  }, [search, hasDirtied]);

  const handleSearchChange = useCallback((text: string) => {
    if (!hasDirtied && text.length > 0) setHasDirtied(true);
    setSearch(text);
  }, [hasDirtied]);

  const goBack = useCallback(() => {
    Keyboard.dismiss();
    router.replace("/" as any);
  }, []);

  // Filter events
  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 86_400_000);
    const endOfWeek = new Date(startOfToday.getTime() + 7 * 86_400_000);
    const endOfMonth = new Date(startOfToday.getTime() + 31 * 86_400_000);

    const filtered = allEvents.filter((e) => {
      const matchSearch =
        (e.title || "").toLowerCase().includes(q) ||
        (e.titleFr || "").toLowerCase().includes(q) ||
        (e.venue || "").toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q) ||
        (e.descriptionFr || "").toLowerCase().includes(q) ||
        (e.city || "").toLowerCase().includes(q) ||
        (e.category || "").toLowerCase().includes(q);
      if (!matchSearch) return false;

      if (eventFilters.dateRange !== "all") {
        const d = parseDateLocal(e.date);
        if (!d) return false;
        if (eventFilters.dateRange === "today") return d >= startOfToday && d < endOfToday;
        if (eventFilters.dateRange === "week") return d >= startOfToday && d < endOfWeek;
        if (eventFilters.dateRange === "month") return d >= startOfToday && d < endOfMonth;
      }
      return true;
    });

    filtered.sort((a, b) => {
      const da = new Date(a.date || 0).getTime();
      const db = new Date(b.date || 0).getTime();
      return eventFilters.sort === "dateDesc" ? db - da : da - db;
    });

    return filtered.map((e) => ({
      id: String(e.id),
      title: e.title || e.titleFr || "",
      titleFr: e.titleFr || e.title || "",
      category: e.category || "",
      city: e.city || "",
      venue: e.venue || "",
      date: e.date,
      time: e.time || "",
      description: e.description || e.descriptionFr || "",
      descriptionFr: e.descriptionFr || e.description || "",
      priceFCFA: typeof e.price === "number" ? e.price : 0,
      isFree: !e.price || e.price === 0,
      imageUrl: e.imageUrl || undefined,
      status: "approved" as const,
    }));
  }, [allEvents, search, eventFilters]);

  // Filter venues
  const filteredVenues = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];

    return allVenues.filter((v) => {
      const matchSearch =
        (v.name || "").toLowerCase().includes(q) ||
        (v.city || "").toLowerCase().includes(q) ||
        (v.type || "").toLowerCase().includes(q) ||
        (v.description || "").toLowerCase().includes(q) ||
        (v.address || "").toLowerCase().includes(q);
      const matchType = !venueType || v.type === venueType;
      return matchSearch && matchType;
    });
  }, [allVenues, search, venueType]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (activeTab === "events") {
      if (eventFilters.dateRange !== "all") n++;
      if (eventFilters.sort !== "dateAsc") n++;
    } else {
      if (venueType) n++;
    }
    return n;
  }, [activeTab, eventFilters, venueType]);

  const openFilters = () => {
    setDraftEventFilters(eventFilters);
    setDraftVenueType(venueType);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setEventFilters(draftEventFilters);
    setVenueType(draftVenueType);
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setDraftEventFilters(DEFAULT_EVENT_FILTERS);
    setDraftVenueType("");
  };

  return (
    <View style={styles.root}>
      {/* Sticky Header */}
      <View style={[styles.header, { paddingTop: topInset + 10 }]}>
        <View style={styles.searchRow}>
          {/* Back button */}
          <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>

          {/* Search input */}
          <View style={styles.searchInputWrap}>
            <Ionicons name="search" size={16} color={C.textMuted} />
            <TextInput
              ref={inputRef}
              value={search}
              onChangeText={handleSearchChange}
              placeholder={isFr ? "Événements, lieux, villes..." : "Events, venues, cities..."}
              placeholderTextColor={C.textMuted}
              style={styles.searchInput}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {search.length > 0 && Platform.OS !== "ios" && (
              <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter button */}
          <TouchableOpacity onPress={openFilters} style={styles.filterBtn} hitSlop={8}>
            <Ionicons name="options-outline" size={20} color={C.text} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Tab bar */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "events" && styles.tabActive]}
            onPress={() => setActiveTab("events")}
          >
            <Text style={[styles.tabText, activeTab === "events" && styles.tabTextActive]}>
              {isFr ? "Événements" : "Events"}
              {!loading && search.trim().length > 0 && ` (${filteredEvents.length})`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "venues" && styles.tabActive]}
            onPress={() => setActiveTab("venues")}
          >
            <Text style={[styles.tabText, activeTab === "venues" && styles.tabTextActive]}>
              {isFr ? "Lieux" : "Venues"}
              {!loading && search.trim().length > 0 && ` (${filteredVenues.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.lavender} size="large" />
        </View>
      ) : activeTab === "events" ? (
        <FlatList
          data={filteredEvents}
          keyExtractor={(e) => e.id}
          contentContainerStyle={[styles.list, filteredEvents.length === 0 && { flex: 1 }]}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              onPress={() => safePush(`/event/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={52} color={C.border} />
              <Text style={styles.emptyText}>
                {search.trim()
                  ? (isFr ? "Aucun événement trouvé\npour « " + search.trim() + " »" : "No events found\nfor \"" + search.trim() + "\"")
                  : (isFr ? "Commencez à taper pour\nchercher des événements" : "Start typing to\nsearch events")}
              </Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      ) : (
        <FlatList
          data={filteredVenues.map((v: any) => ({
            id: `api_${v.id}`,
            name: v.name || "",
            type: v.type || "",
            city: v.city || "",
            address: v.address || "",
            imageUrl: v.imageUrl || (Array.isArray(v.images) && v.images[0]) || undefined,
            isVerified: v.isVerified,
          }))}
          keyExtractor={(v) => v.id}
          contentContainerStyle={[styles.list, filteredVenues.length === 0 && { flex: 1 }]}
          renderItem={({ item }) => (
            <VenueCard
              venue={item}
              onPress={() => safePush(`/venue/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="business-outline" size={52} color={C.border} />
              <Text style={styles.emptyText}>
                {search.trim()
                  ? (isFr ? "Aucun lieu trouvé\npour « " + search.trim() + " »" : "No venues found\nfor \"" + search.trim() + "\"")
                  : (isFr ? "Commencez à taper pour\nchercher des lieux" : "Start typing to\nsearch venues")}
              </Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}

      {/* Filter Bottom Sheet */}
      <Modal
        visible={filterOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.sheetBackdrop}
          onPress={() => setFilterOpen(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {isFr ? "Filtres" : "Filters"}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {activeTab === "events" ? (
                <>
                  <Text style={styles.sectionLabel}>{isFr ? "Quand" : "When"}</Text>
                  <View style={styles.chipRow}>
                    {([
                      { key: "all", fr: "Toutes les dates", en: "All dates" },
                      { key: "today", fr: "Aujourd'hui", en: "Today" },
                      { key: "week", fr: "Cette semaine", en: "This week" },
                      { key: "month", fr: "Ce mois-ci", en: "This month" },
                    ] as const).map((opt) => {
                      const active = draftEventFilters.dateRange === opt.key;
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          onPress={() => setDraftEventFilters({ ...draftEventFilters, dateRange: opt.key })}
                          style={[styles.chip, active && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {isFr ? opt.fr : opt.en}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.sectionLabel}>{isFr ? "Trier par" : "Sort by"}</Text>
                  <View style={styles.chipRow}>
                    {([
                      { key: "dateAsc", fr: "Date ↑", en: "Date ↑" },
                      { key: "dateDesc", fr: "Date ↓", en: "Date ↓" },
                    ] as const).map((opt) => {
                      const active = draftEventFilters.sort === opt.key;
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          onPress={() => setDraftEventFilters({ ...draftEventFilters, sort: opt.key })}
                          style={[styles.chip, active && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {isFr ? opt.fr : opt.en}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.sectionLabel}>{isFr ? "Type de lieu" : "Venue type"}</Text>
                  <View style={styles.chipRow}>
                    <TouchableOpacity
                      onPress={() => setDraftVenueType("")}
                      style={[styles.chip, !draftVenueType && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, !draftVenueType && styles.chipTextActive]}>
                        {isFr ? "Tous" : "All"}
                      </Text>
                    </TouchableOpacity>
                    {configVenueTypes.map((vt) => {
                      const active = draftVenueType === vt.key;
                      return (
                        <TouchableOpacity
                          key={vt.key}
                          onPress={() => setDraftVenueType(vt.key)}
                          style={[styles.chip, active && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {isFr ? vt.labelFr : vt.labelEn}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.btnSecondary} onPress={resetFilters}>
                <Text style={styles.btnSecondaryText}>{isFr ? "Réinitialiser" : "Reset"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={applyFilters}>
                <Text style={styles.btnPrimaryText}>{isFr ? "Appliquer" : "Apply"}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
