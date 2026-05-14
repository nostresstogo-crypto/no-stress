import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import { safePush } from "@/lib/navigation";

import { useT, useApp, useColors } from "@/context/AppContext";
import { VenueCard } from "@/components/VenueCard";
import { API_BASE } from "@/lib/apiBase";

const DISTANCE_OPTIONS = [2, 5, 10, 25, 50];

export default function VenuesScreen() {
  const t = useT();
  const C = useColors();
  const { lang, configVenueTypes, configCountries, configCities } = useApp();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(C), [C]);
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const [apiVenues, setApiVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [radiusKm, setRadiusKm] = useState<number | null>(5);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (country) n++;
    if (city) n++;
    if (selectedType) n++;
    if (coords && radiusKm) n++;
    return n;
  }, [country, city, selectedType, coords, radiusKm]);

  const resetFilters = useCallback(() => {
    setCountry("");
    setCity("");
    setSelectedType("");
    setRadiusKm(5);
    setCoords(null);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (city.trim()) params.set("city", city.trim());
    if (country.trim()) params.set("country", country.trim());
    if (selectedType) params.set("type", selectedType);
    if (radiusKm && coords) {
      params.set("lat", String(coords.lat));
      params.set("lng", String(coords.lng));
      params.set("radiusKm", String(radiusKm));
    }
    try {
      const r = await fetch(`${API_BASE}/venues?${params.toString()}`);
      if (!r.ok) { setApiVenues([]); return; }
      const data = await r.json();
      setApiVenues(Array.isArray(data?.venues) ? data.venues : []);
    } catch {
      setApiVenues([]);
    } finally {
      setLoading(false);
    }
  }, [city, country, selectedType, radiusKm, coords]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  // Recharge les lieux à chaque fois que l'écran reprend le focus
  // (changement d'onglet, retour depuis une page détail, etc.)
  useFocusEffect(useCallback(() => { onRefresh(); }, []));

  const requestLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setLocating(false); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      if (!radiusKm) setRadiusKm(5);
    } catch {} finally {
      setLocating(false);
    }
  };

  const venues = useMemo(() => apiVenues.map((v: any) => ({
    id: `api_${v.id}`,
    name: v.name || "",
    type: v.type || "",
    city: v.city || "",
    address: v.address || "",
    description: v.description || "",
    imageUrl: v.imageUrl || (Array.isArray(v.images) && v.images[0]) || undefined,
    images: Array.isArray(v.images) ? v.images : [],
  })), [apiVenues]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle}>{t("venues")}</Text>
          <TouchableOpacity
            onPress={() => setFiltersOpen((v) => !v)}
            style={[styles.filterToggle, filtersOpen && styles.filterToggleActive]}
            accessibilityLabel={t("language") === "Langue" ? "Filtres" : "Filters"}
          >
            <Ionicons name="options-outline" size={18} color={filtersOpen ? C.bg : C.text} />
            <Text style={[styles.filterToggleText, filtersOpen && { color: C.bg }]}>
              {filtersOpen ? "Masquer" : "Filtres"}
            </Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterCountBadge}>
                <Text style={styles.filterCountBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
            <Ionicons
              name={filtersOpen ? "chevron-up" : "chevron-down"}
              size={16}
              color={filtersOpen ? C.bg : C.textMuted}
            />
          </TouchableOpacity>
        </View>

        {!filtersOpen && activeFilterCount > 0 && (
          <View style={styles.activeSummary}>
            {country ? <Text style={styles.activeSummaryText}>{country}</Text> : null}
            {city ? <Text style={styles.activeSummaryText}>{city}</Text> : null}
            {selectedType ? <Text style={styles.activeSummaryText}>{selectedType}</Text> : null}
            {coords && radiusKm ? <Text style={styles.activeSummaryText}>{radiusKm} km</Text> : null}
            <TouchableOpacity onPress={resetFilters} hitSlop={6}>
              <Text style={[styles.activeSummaryText, { color: C.lavender }]}>Effacer ✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {filtersOpen ? (
          <>
        <Text style={styles.filterLabel}>Pays</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
          <TouchableOpacity
            onPress={() => { setCountry(""); setCity(""); }}
            style={[styles.chip, country === "" && styles.chipActive]}
          >
            <Text style={[styles.chipText, country === "" && styles.chipTextActive]}>Tous</Text>
          </TouchableOpacity>
          {configCountries.map((co) => (
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

        <Text style={styles.filterLabel}>Ville</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
          <TouchableOpacity
            onPress={() => setCity("")}
            style={[styles.chip, city === "" && styles.chipActive]}
          >
            <Text style={[styles.chipText, city === "" && styles.chipTextActive]}>Toutes</Text>
          </TouchableOpacity>
          {configCities.filter((ci) => !country || ci.countryName === country).map((ci) => (
            <TouchableOpacity
              key={ci.slug}
              onPress={() => setCity(city === ci.name ? "" : ci.name)}
              style={[styles.chip, city === ci.name && styles.chipActive]}
            >
              <Text style={[styles.chipText, city === ci.name && styles.chipTextActive]}>
                {ci.emoji} {ci.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <TouchableOpacity
            style={[styles.chip, selectedType === "" && styles.chipActive]}
            onPress={() => setSelectedType("")}
          >
            <Text style={[styles.chipText, selectedType === "" && styles.chipTextActive]}>
              {t("allTypes")}
            </Text>
          </TouchableOpacity>
          {configVenueTypes.map((vt) => {
            const label = lang === "fr" ? vt.labelFr : vt.labelEn;
            return (
              <TouchableOpacity
                key={vt.key}
                style={[styles.chip, selectedType === vt.key && styles.chipActive]}
                onPress={() => setSelectedType(selectedType === vt.key ? "" : vt.key)}
              >
                <Text style={[styles.chipText, selectedType === vt.key && styles.chipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.distanceRow}>
          <TouchableOpacity onPress={requestLocation} style={styles.locBtn} disabled={locating}>
            <Ionicons name={coords ? "locate" : "locate-outline"} size={16} color={coords ? C.lavender : C.textMuted} />
            <Text style={[styles.locBtnText, { color: coords ? C.lavender : C.textMuted }]}>
              {locating ? "…" : coords ? "GPS actif" : "Activer GPS"}
            </Text>
          </TouchableOpacity>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {DISTANCE_OPTIONS.map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => setRadiusKm(radiusKm === d ? null : d)}
                style={[styles.distChip, radiusKm === d && styles.chipActive]}
                disabled={!coords}
              >
                <Text style={[styles.chipText, radiusKm === d && styles.chipTextActive, !coords && { opacity: 0.4 }]}>
                  {d} km
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
          </>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.empty}><ActivityIndicator color={C.lavender} /></View>
      ) : (
        <FlatList
          data={venues}
          keyExtractor={(v) => v.id}
          contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 118 : 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.lavender} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="business-outline" size={48} color={C.border} />
              <Text style={styles.emptyText}>{t("noVenues")}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <VenueCard venue={item} onPress={() => safePush(`/venue/${item.id}` as any)} />
          )}
        />
      )}
    </View>
  );
}

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    backgroundColor: C.bg,
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 10,
  },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 4, flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  filterToggle: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
  },
  filterToggleActive: { backgroundColor: C.lavender, borderColor: C.lavender },
  filterToggleText: { fontSize: 13, color: C.text, fontFamily: "Inter_600SemiBold" },
  filterCountBadge: {
    minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5,
    backgroundColor: C.gold, alignItems: "center", justifyContent: "center",
  },
  filterCountBadgeText: { color: C.bg, fontSize: 10, fontFamily: "Inter_700Bold" },
  activeSummary: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", paddingTop: 4 },
  activeSummaryText: { fontSize: 12, color: C.textMuted, fontFamily: "Inter_500Medium" },
  filterLabel: { fontSize: 11, color: C.textMuted, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 6 },
  row: { flexDirection: "row", gap: 8 },
  inputWrap: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.card, borderRadius: 10, paddingHorizontal: 10, height: 38,
    borderWidth: 1, borderColor: C.border,
  },
  input: { flex: 1, color: C.text, fontFamily: "Inter_400Regular", fontSize: 14, paddingVertical: 0 },
  filters: { gap: 8, paddingRight: 20 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
  },
  chipActive: { backgroundColor: C.lavender, borderColor: C.lavender },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.text },
  chipTextActive: { color: C.bg, fontFamily: "Inter_600SemiBold" },
  distanceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  locBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6 },
  locBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  distChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
  },
  list: { padding: 20 },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 16 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: C.textMuted },
});
