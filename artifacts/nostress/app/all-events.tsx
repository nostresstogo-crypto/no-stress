import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Location from "expo-location";
import { safePush } from "@/lib/navigation";
import { useApp, useColors, useT } from "@/context/AppContext";
import { CATEGORIES, COUNTRIES, MOCK_CITIES } from "@/constants/data";
import { EventCard } from "@/components/EventCard";
import { API_BASE } from "@/lib/apiBase";

const DISTANCE_OPTIONS = [2, 5, 10, 25, 50];

export default function AllEventsScreen() {
  const C = useColors();
  const { lang } = useApp();
  const t = useT();
  const insets = useSafeAreaInsets();
  const isFr = lang === "fr";
  const styles = useMemo(() => makeStyles(C), [C]);

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("");
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (country) n++;
    if (city) n++;
    if (category) n++;
    if (coords && radiusKm) n++;
    return n;
  }, [country, city, category, coords, radiusKm]);

  const resetFilters = useCallback(() => {
    setCountry("");
    setCity("");
    setCategory("");
    setRadiusKm(null);
    setCoords(null);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (city.trim()) params.set("city", city.trim());
    if (country.trim()) params.set("country", country.trim());
    if (category) params.set("category", category);
    if (radiusKm && coords) {
      params.set("lat", String(coords.lat));
      params.set("lng", String(coords.lng));
      params.set("radiusKm", String(radiusKm));
    }
    try {
      const r = await fetch(`${API_BASE}/events?${params.toString()}`);
      const data = await r.json();
      setEvents(Array.isArray(data?.events) ? data.events : []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [city, country, category, radiusKm, coords]);

  useEffect(() => { load(); }, [load]);

  const requestLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      if (!radiusKm) setRadiusKm(5);
    } catch {} finally {
      setLocating(false);
    }
  };

  const mapped = useMemo(() => events.map((e: any) => ({
    id: String(e.id),
    title: e.title || "",
    titleFr: e.titleFr || e.title || "",
    category: e.category || "",
    city: e.city || "",
    venue: e.venue || "",
    date: e.date,
    time: e.time || "",
    description: e.description || "",
    descriptionFr: e.descriptionFr || e.description || "",
    priceFCFA: typeof e.price === "number" ? e.price : 0,
    isFree: !e.price || e.price === 0,
    imageUrl: e.imageUrl || undefined,
    status: "approved" as const,
  })), [events]);

  return (
    <View style={[styles.root, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isFr ? "Tous les événements" : "All events"}
        </Text>
        <TouchableOpacity
          onPress={() => setFiltersOpen((v) => !v)}
          style={[styles.filterToggle, filtersOpen && styles.filterToggleActive]}
          hitSlop={6}
        >
          <Ionicons name="options-outline" size={16} color={filtersOpen ? C.bg : C.text} />
          <Text style={[styles.filterToggleText, filtersOpen && { color: C.bg }]}>
            {filtersOpen ? (isFr ? "Masquer" : "Hide") : (isFr ? "Filtres" : "Filters")}
          </Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterCountBadge}>
              <Text style={styles.filterCountBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
          <Ionicons name={filtersOpen ? "chevron-up" : "chevron-down"} size={14} color={filtersOpen ? C.bg : C.textMuted} />
        </TouchableOpacity>
      </View>

      {!filtersOpen && activeFilterCount > 0 ? (
        <View style={styles.activeSummary}>
          {country ? <Text style={styles.activeSummaryText}>{country}</Text> : null}
          {city ? <Text style={styles.activeSummaryText}>{city}</Text> : null}
          {category ? <Text style={styles.activeSummaryText}>{t(category as any)}</Text> : null}
          {coords && radiusKm ? <Text style={styles.activeSummaryText}>{radiusKm} km</Text> : null}
          <TouchableOpacity onPress={resetFilters} hitSlop={6}>
            <Text style={[styles.activeSummaryText, { color: C.lavender }]}>{isFr ? "Effacer ✕" : "Clear ✕"}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {filtersOpen ? (
      <View style={styles.filterCard}>
        <Text style={styles.filterLabel}>{isFr ? "Pays" : "Country"}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>
          <TouchableOpacity
            onPress={() => { setCountry(""); setCity(""); }}
            style={[styles.chip, country === "" && styles.chipActive]}
          >
            <Text style={[styles.chipText, country === "" && styles.chipTextActive]}>
              {isFr ? "Tous" : "All"}
            </Text>
          </TouchableOpacity>
          {COUNTRIES.map((co) => (
            <TouchableOpacity
              key={co.code}
              onPress={() => {
                const next = country === co.name ? "" : co.name;
                setCountry(next);
                setCity("");
              }}
              style={[styles.chip, country === co.name && styles.chipActive]}
            >
              <Text style={[styles.chipText, country === co.name && styles.chipTextActive]}>
                {co.emoji} {co.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.filterLabel}>{isFr ? "Ville" : "City"}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>
          <TouchableOpacity
            onPress={() => setCity("")}
            style={[styles.chip, city === "" && styles.chipActive]}
          >
            <Text style={[styles.chipText, city === "" && styles.chipTextActive]}>
              {isFr ? "Toutes" : "All"}
            </Text>
          </TouchableOpacity>
          {MOCK_CITIES.filter((ci) => !country || ci.country === country).map((ci) => (
            <TouchableOpacity
              key={ci.id}
              onPress={() => setCity(city === ci.name ? "" : ci.name)}
              style={[styles.chip, city === ci.name && styles.chipActive]}
            >
              <Text style={[styles.chipText, city === ci.name && styles.chipTextActive]}>
                {ci.emoji} {ci.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
          <TouchableOpacity
            onPress={() => setCategory("")}
            style={[styles.chip, category === "" && styles.chipActive]}
          >
            <Text style={[styles.chipText, category === "" && styles.chipTextActive]}>
              {isFr ? "Toutes catégories" : "All categories"}
            </Text>
          </TouchableOpacity>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.key}
              onPress={() => setCategory(category === c.key ? "" : c.key)}
              style={[styles.chip, category === c.key && styles.chipActive]}
            >
              <Text style={[styles.chipText, category === c.key && styles.chipTextActive]}>
                {t(c.key as any)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.distanceRow}>
          <TouchableOpacity onPress={requestLocation} style={styles.locBtn} disabled={locating}>
            {locating ? (
              <ActivityIndicator color={C.lavender} size="small" />
            ) : (
              <Ionicons name={coords ? "locate" : "locate-outline"} size={16} color={C.lavender} />
            )}
            <Text style={styles.locText}>
              {coords
                ? (isFr ? "Position activée" : "Location on")
                : (isFr ? "Filtrer par distance" : "Filter by distance")}
            </Text>
          </TouchableOpacity>
          {coords && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {DISTANCE_OPTIONS.map((km) => (
                <TouchableOpacity
                  key={km}
                  onPress={() => setRadiusKm(radiusKm === km ? null : km)}
                  style={[styles.chip, radiusKm === km && styles.chipActive]}
                >
                  <Text style={[styles.chipText, radiusKm === km && styles.chipTextActive]}>{km} km</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.lavender} />
        </View>
      ) : mapped.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={32} color={C.textMuted} />
          <Text style={[styles.emptyText, { color: C.textMuted }]}>
            {isFr ? "Aucun événement trouvé." : "No events found."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={mapped}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100, gap: 12 }}
          renderItem={({ item }) => (
            <EventCard event={item as any} onPress={() => safePush(`/event/${item.id}`)} />
          )}
        />
      )}
    </View>
  );
}

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border, justifyContent: "space-between",
  },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: C.text, flex: 1, textAlign: "center" },
  filterToggle: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
  },
  filterToggleActive: { backgroundColor: C.lavender, borderColor: C.lavender },
  filterToggleText: { fontSize: 12, color: C.text, fontFamily: "Inter_600SemiBold" },
  filterCountBadge: {
    minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4,
    backgroundColor: C.gold, alignItems: "center", justifyContent: "center",
  },
  filterCountBadgeText: { color: C.bg, fontSize: 9, fontFamily: "Inter_700Bold" },
  activeSummary: {
    flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card,
  },
  activeSummaryText: { fontSize: 12, color: C.textMuted, fontFamily: "Inter_500Medium" },
  filterCard: { padding: 12, gap: 6, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card },
  filterLabel: { fontSize: 11, color: C.textMuted, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 },
  row: { flexDirection: "row", gap: 8 },
  input: {
    backgroundColor: C.bg, color: C.text, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: C.border, fontSize: 14,
  },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
  },
  chipActive: { backgroundColor: C.lavender, borderColor: C.lavender },
  chipText: { fontSize: 12, color: C.text, fontFamily: "Inter_600SemiBold" },
  chipTextActive: { color: "#fff" },
  distanceRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  locBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 18, borderWidth: 1, borderColor: C.lavender, backgroundColor: C.lavender + "10",
  },
  locText: { fontSize: 12, color: C.lavender, fontFamily: "Inter_600SemiBold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 32 },
  emptyText: { fontSize: 14 },
});
