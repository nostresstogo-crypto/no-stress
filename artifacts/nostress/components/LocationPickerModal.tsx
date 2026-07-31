import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";

import type { ColorPalette } from "@/constants/colors";
import type { ConfigCity } from "@/context/AppContext";
import { useApp, useColors } from "@/context/AppContext";

// ─── Constants ────────────────────────────────────────────────────────────────
const RECENT_KEY = "ns_recent_cities";
const MAX_RECENT = 5;

// ─── Haversine distance (km) ──────────────────────────────────────────────────
function distKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  /** City selected manually — pass slug + display name */
  onSelectCity: (slug: string, name: string) => void;
  /** GPS location resolved — pass slug + name (both "" if no city matched) */
  onSelectGPS: (slug: string, name: string) => void;
  currentCity: string;  // current selected slug
  usingGPS: boolean;
  lang: string;
}

// ─── City row ─────────────────────────────────────────────────────────────────
function CityRow({
  city, selected, onPress, C,
}: {
  city: ConfigCity;
  selected: boolean;
  onPress: () => void;
  C: ColorPalette;
}) {
  return (
    <TouchableOpacity
      style={[cr.row, { borderBottomColor: C.border }, selected && { backgroundColor: C.card2 }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={cr.info}>
        <Text style={[cr.name, { color: C.text }]}>{city.name}</Text>
        {city.countryName ? (
          <Text style={[cr.country, { color: C.textMuted }]}>{city.countryName}</Text>
        ) : null}
      </View>
      {selected && <Ionicons name="checkmark" size={17} color={C.lavender} />}
    </TouchableOpacity>
  );
}
const cr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  info: { flex: 1, gap: 1 },
  name: { fontSize: 15, fontFamily: "Inter_500Medium" },
  country: { fontSize: 12, fontFamily: "Inter_400Regular" },
});

// ─── Main component ───────────────────────────────────────────────────────────
export function LocationPickerModal({
  visible,
  onClose,
  onSelectCity,
  onSelectGPS,
  currentCity,
  usingGPS,
  lang,
}: LocationPickerModalProps) {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { configCities } = useApp();
  const insets = useSafeAreaInsets();

  const [query, setQuery]             = useState("");
  const [debouncedQ, setDebouncedQ]   = useState("");
  const [gpsLoading, setGpsLoading]   = useState(false);
  const [gpsError, setGpsError]       = useState<string | null>(null);
  const [recentCities, setRecentCities] = useState<ConfigCity[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset + load recents on open
  useEffect(() => {
    if (!visible) return;
    setQuery("");
    setDebouncedQ("");
    setGpsError(null);
    AsyncStorage.getItem(RECENT_KEY)
      .then((v) => {
        if (!v) return;
        const slugs: string[] = JSON.parse(v);
        const found = slugs
          .map((slug) => configCities.find((c) => c.slug === slug))
          .filter(Boolean) as ConfigCity[];
        setRecentCities(found);
      })
      .catch(() => {});
  }, [visible, configCities]);

  // Debounce query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(query), 280);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Filtered results
  const results = useMemo(() => {
    const q = debouncedQ.trim().toLowerCase();
    if (!q) return [];
    return configCities
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.countryName ?? "").toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [configCities, debouncedQ]);

  const saveRecent = async (slug: string) => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_KEY);
      const slugs: string[] = stored ? JSON.parse(stored) : [];
      const updated = [slug, ...slugs.filter((s) => s !== slug)].slice(0, MAX_RECENT);
      await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    } catch {}
  };

  const handleSelectCity = useCallback(
    (city: ConfigCity) => {
      saveRecent(city.slug);
      onSelectCity(city.slug, city.name);
    },
    [onSelectCity],
  );

  const handleGPS = useCallback(async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGpsError(
          lang === "fr"
            ? "Permission de localisation refusée. Activez-la dans les réglages de l'app."
            : "Location permission denied. Enable it in your app settings.",
        );
        return;
      }
      const loc = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 10_000),
        ),
      ]).catch(() => null);

      if (!loc || typeof loc !== "object" || !("coords" in loc)) {
        setGpsError(
          lang === "fr"
            ? "Impossible d'obtenir votre position. Réessayez ou utilisez la recherche."
            : "Unable to get your position. Retry or use manual search.",
        );
        return;
      }
      const { latitude, longitude } = (loc as Location.LocationObject).coords;
      // Find nearest city within 150 km
      let nearest: ConfigCity | null = null;
      let nearestDist = Infinity;
      for (const c of configCities) {
        if (c.latitude == null || c.longitude == null) continue;
        const d = distKm(latitude, longitude, c.latitude, c.longitude);
        if (d < nearestDist) { nearestDist = d; nearest = c; }
      }
      if (nearest && nearestDist <= 150) {
        saveRecent(nearest.slug);
        onSelectGPS(nearest.slug, nearest.name);
      } else {
        // GPS active but no matching city — show "Ma position" with no city filter
        onSelectGPS("", "");
      }
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("disabled") || msg.includes("OFF")) {
        setGpsError(
          lang === "fr"
            ? "Localisation désactivée. Activez-la dans les réglages."
            : "Location is disabled. Enable it in Settings.",
        );
      } else {
        setGpsError(
          lang === "fr"
            ? "Erreur GPS. Utilisez la recherche manuelle."
            : "GPS error. Please use manual search.",
        );
      }
    } finally {
      setGpsLoading(false);
    }
  }, [lang, configCities, onSelectGPS]);

  const hasQuery   = debouncedQ.trim().length > 0;
  const showRecent = !hasQuery && recentCities.length > 0;
  const showEmpty  = hasQuery && results.length === 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Sheet */}
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: C.border }]} />

        {/* Title row */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: C.text }]}>
            {lang === "fr" ? "Choisir une localisation" : "Choose a location"}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityRole="button">
            <Ionicons name="close" size={22} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        {/* GPS button */}
        <TouchableOpacity
          style={[
            styles.gpsBtn,
            {
              backgroundColor: C.lavender + "12",
              borderColor: usingGPS && !gpsError ? C.lavender : C.lavender + "44",
            },
          ]}
          onPress={handleGPS}
          disabled={gpsLoading}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={lang === "fr" ? "Utiliser ma position" : "Use my location"}
        >
          {gpsLoading ? (
            <ActivityIndicator size="small" color={C.lavender} style={{ width: 20 }} />
          ) : (
            <Ionicons name="navigate" size={18} color={C.lavender} />
          )}
          <Text style={[styles.gpsBtnText, { color: C.lavender }]}>
            {gpsLoading
              ? (lang === "fr" ? "Localisation en cours…" : "Getting location…")
              : usingGPS
                ? (lang === "fr" ? "Ma position (active)" : "My location (active)")
                : (lang === "fr" ? "Utiliser ma position" : "Use my location")}
          </Text>
          {usingGPS && !gpsLoading && (
            <Ionicons name="checkmark-circle" size={16} color={C.lavender} />
          )}
        </TouchableOpacity>

        {gpsError ? (
          <Text style={[styles.gpsError, { color: C.error }]}>{gpsError}</Text>
        ) : null}

        {/* Separator */}
        <View style={styles.sepRow}>
          <View style={[styles.sepLine, { backgroundColor: C.border }]} />
          <Text style={[styles.sepText, { color: C.textMuted }]}>
            {lang === "fr" ? "ou" : "or"}
          </Text>
          <View style={[styles.sepLine, { backgroundColor: C.border }]} />
        </View>

        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: C.card2, borderColor: C.border }]}>
          <Ionicons name="search-outline" size={16} color={C.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: C.text }]}
            placeholder={
              lang === "fr"
                ? "Rechercher une ville ou un pays"
                : "Search a city or country"
            }
            placeholderTextColor={C.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel={
              lang === "fr" ? "Rechercher une ville" : "Search for a city"
            }
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={15} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Results ── */}
        <View style={styles.resultArea}>
          {/* Recent cities */}
          {showRecent && (
            <>
              <Text style={[styles.sectionLabel, { color: C.textMuted }]}>
                {lang === "fr" ? "Récents" : "Recent"}
              </Text>
              {recentCities.map((city) => (
                <CityRow
                  key={city.slug}
                  city={city}
                  selected={city.slug === currentCity && !usingGPS}
                  onPress={() => handleSelectCity(city)}
                  C={C}
                />
              ))}
            </>
          )}

          {/* Search results */}
          {hasQuery && (
            <>
              {showEmpty ? (
                <View style={styles.emptyWrap}>
                  <Text style={[styles.emptyText, { color: C.textMuted }]}>
                    {lang === "fr" ? "Aucune ville trouvée" : "No city found"}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={results}
                  keyExtractor={(c) => c.slug}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <CityRow
                      city={item}
                      selected={item.slug === currentCity && !usingGPS}
                      onPress={() => handleSelectCity(item)}
                      C={C}
                    />
                  )}
                />
              )}
            </>
          )}

          {/* All cities option (no query) */}
          {!hasQuery && (
            <TouchableOpacity
              style={[styles.allBtn, { borderBottomColor: C.border }]}
              onPress={() => onSelectCity("", "")}
              activeOpacity={0.7}
            >
              <Ionicons name="globe-outline" size={15} color={C.textMuted} />
              <Text style={[styles.allBtnText, { color: C.text }]}>
                {lang === "fr" ? "Toutes les villes" : "All cities"}
              </Text>
              {!currentCity && !usingGPS && (
                <Ionicons name="checkmark" size={16} color={C.lavender} />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Cancel */}
        <TouchableOpacity
          style={[styles.cancelBtn, { borderColor: C.border }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={lang === "fr" ? "Annuler" : "Cancel"}
        >
          <Text style={[styles.cancelText, { color: C.textMuted }]}>
            {lang === "fr" ? "Annuler" : "Cancel"}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const makeStyles = (C: ColorPalette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
    },
    sheet: {
      backgroundColor: C.bg,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      paddingTop: 12,
      maxHeight: "82%",
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 16,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      marginBottom: 18,
    },
    title: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
    },
    gpsBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginHorizontal: 20,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
    },
    gpsBtnText: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
    },
    gpsError: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      marginHorizontal: 20,
      marginTop: 8,
      lineHeight: 17,
    },
    sepRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginHorizontal: 20,
      marginVertical: 16,
    },
    sepLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
    },
    sepText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
    },
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 20,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === "ios" ? 11 : 9,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      padding: 0,
    },
    resultArea: {
      flex: 1,
    },
    sectionLabel: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginHorizontal: 20,
      marginTop: 8,
      marginBottom: 4,
    },
    emptyWrap: {
      alignItems: "center",
      paddingVertical: 28,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
    },
    allBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    allBtnText: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_500Medium",
    },
    cancelBtn: {
      marginHorizontal: 20,
      marginTop: 14,
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
    },
    cancelText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
    },
  });
