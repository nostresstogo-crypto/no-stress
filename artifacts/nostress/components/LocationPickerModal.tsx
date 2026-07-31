/**
 * LocationPickerModal
 *
 * Bottom-sheet de sélection de localisation.
 *
 * Recherche
 * ─────────
 * • 1-2 chars : filtrage local sur configCities (instantané, hors-ligne)
 * • ≥ 3 chars : Nominatim (OpenStreetMap) — mondial, gratuit, 0 clé API
 *   → debounce 400 ms, AbortController, loading + erreur réseau
 *   → chaque résultat est comparé à configCities (nom normalisé + proximité < 50 km)
 *     → si match  → slug propre (filtrage événements fonctionne)
 *     → si pas    → nom brut comme slug (fallback display dans index.tsx)
 *
 * Keyboard
 * ────────
 * iOS  : KeyboardAvoidingView behavior="padding"
 * Android : Keyboard listener → maxHeight dynamique du sheet
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
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
const RECENT_KEY   = "ns_recent_cities";
const MAX_RECENT   = 5;
const MIN_QUERY    = 3;   // Nominatim only when ≥ MIN_QUERY chars
const DEBOUNCE_MS  = 400;

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlaceResult {
  placeId: string;
  /** Short city / town / village / state name */
  name: string;
  state?: string;
  country?: string;
  countryCode?: string;
  lat: number;
  lon: number;
  /** Slug of the matched ConfigCity, if any */
  slug?: string;
  /** True when this result matches a known ConfigCity */
  isConfigCity: boolean;
}

// ─── Haversine ────────────────────────────────────────────────────────────────
function distKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Accent-insensitive normaliser ───────────────────────────────────────────
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// ─── Match a Nominatim result to a ConfigCity ─────────────────────────────────
function findConfigCity(
  name: string,
  lat: number,
  lon: number,
  cities: ConfigCity[],
): ConfigCity | null {
  const nl = normalize(name);
  // Exact / substring name match (accent-insensitive)
  for (const c of cities) {
    const cl = normalize(c.name);
    if (cl === nl || cl.startsWith(nl) || nl.startsWith(cl)) return c;
  }
  // Proximity match (≤ 50 km)
  for (const c of cities) {
    if (c.latitude != null && c.longitude != null) {
      if (distKm(lat, lon, c.latitude, c.longitude) <= 50) return c;
    }
  }
  return null;
}

// ─── Nominatim API call ───────────────────────────────────────────────────────
async function fetchPlaces(
  query: string,
  lang: string,
  configCities: ConfigCity[],
  signal: AbortSignal,
): Promise<PlaceResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "10");
  url.searchParams.set("accept-language", lang === "fr" ? "fr,en" : "en,fr");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "NoStressApp/1.0 (https://nostress.tg)",
      "Accept-Language": lang === "fr" ? "fr,en" : "en,fr",
    },
    signal,
  });

  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);

  const data: any[] = await res.json();

  const seen = new Set<string>();
  const results: PlaceResult[] = [];

  for (const item of data) {
    const addr = item.address ?? {};
    const name =
      addr.city ??
      addr.town ??
      addr.village ??
      addr.municipality ??
      addr.county ??
      addr.state ??
      item.name ??
      "";
    if (!name) continue;

    // Deduplicate by normalised name + country
    const key = `${normalize(name)}|${addr.country_code ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    const matched = findConfigCity(name, lat, lon, configCities);

    results.push({
      placeId: String(item.place_id),
      name,
      state: addr.state !== name ? addr.state : undefined,
      country: addr.country,
      countryCode: addr.country_code,
      lat,
      lon,
      slug: matched?.slug,
      isConfigCity: !!matched,
    });
  }

  return results;
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCity: (slug: string, name: string) => void;
  onSelectGPS: (slug: string, name: string) => void;
  currentCity: string;
  usingGPS: boolean;
  lang: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ConfigCityRow({
  city, selected, onPress, C,
}: { city: ConfigCity; selected: boolean; onPress: () => void; C: ColorPalette }) {
  return (
    <TouchableOpacity
      style={[cr.row, { borderBottomColor: C.border }, selected && { backgroundColor: C.card2 }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Ionicons
        name="location-outline"
        size={16}
        color={selected ? C.lavender : C.textMuted}
        style={{ marginRight: 10, flexShrink: 0 }}
      />
      <View style={cr.info}>
        <Text style={[cr.name, { color: C.text }]}>{city.name}</Text>
        {city.countryName ? (
          <Text style={[cr.sub, { color: C.textMuted }]}>{city.countryName}</Text>
        ) : null}
      </View>
      {selected && <Ionicons name="checkmark" size={16} color={C.lavender} />}
    </TouchableOpacity>
  );
}

function PlaceRow({
  result, onPress, C,
}: { result: PlaceResult; onPress: () => void; C: ColorPalette }) {
  const subtitle = [result.state, result.country].filter(Boolean).join(", ");
  return (
    <TouchableOpacity
      style={[cr.row, { borderBottomColor: C.border }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <Ionicons
        name={result.isConfigCity ? "location" : "location-outline"}
        size={16}
        color={result.isConfigCity ? C.lavender : C.textMuted}
        style={{ marginRight: 10, flexShrink: 0 }}
      />
      <View style={cr.info}>
        <Text style={[cr.name, { color: C.text }]}>{result.name}</Text>
        {subtitle ? (
          <Text style={[cr.sub, { color: C.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {result.isConfigCity && (
        <Ionicons name="checkmark-circle" size={14} color={C.lavender} />
      )}
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
  info: { flex: 1 },
  name: { fontSize: 15, fontFamily: "Inter_500Medium" },
  sub:  { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
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
  const C      = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { configCities } = useApp();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  // ── Search state ─────────────────────────────────────────────────────────
  const [query, setQuery]                   = useState("");
  const [debouncedQ, setDebouncedQ]         = useState("");
  const [nominatimResults, setNominatimResults] = useState<PlaceResult[]>([]);
  const [searchLoading, setSearchLoading]   = useState(false);
  const [searchError, setSearchError]       = useState<string | null>(null);

  // ── GPS state ─────────────────────────────────────────────────────────────
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError]     = useState<string | null>(null);

  // ── Recent cities ─────────────────────────────────────────────────────────
  const [recentCities, setRecentCities] = useState<ConfigCity[]>([]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef    = useRef<AbortController | null>(null);
  const inputRef    = useRef<TextInput>(null);

  // ── Keyboard height tracking ──────────────────────────────────────────────
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow  = Keyboard.addListener(showEvt, (e) => setKeyboardHeight(e.endCoordinates.height));
    const onHide  = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => { onShow.remove(); onHide.remove(); };
  }, []);

  // ── Reset on open/close ───────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      abortRef.current?.abort();
      return;
    }
    setQuery("");
    setDebouncedQ("");
    setGpsError(null);
    setNominatimResults([]);
    setSearchLoading(false);
    setSearchError(null);
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

  // ── Debounce ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(query), DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // ── Local filter (1-2 chars, instant) ────────────────────────────────────
  const localResults = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const nq = normalize(q);
    return configCities
      .filter(
        (c) =>
          normalize(c.name).includes(nq) ||
          normalize(c.countryName ?? "").includes(nq),
      )
      .slice(0, 12);
  }, [configCities, query]);

  // ── Nominatim search (≥ MIN_QUERY chars) ─────────────────────────────────
  useEffect(() => {
    const q = debouncedQ.trim();
    if (q.length < MIN_QUERY) {
      setNominatimResults([]);
      setSearchLoading(false);
      setSearchError(null);
      abortRef.current?.abort();
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setSearchLoading(true);
    setSearchError(null);

    fetchPlaces(q, lang, configCities, abortRef.current.signal)
      .then((results) => {
        setNominatimResults(results);
        setSearchLoading(false);
      })
      .catch((err) => {
        if ((err as any)?.name === "AbortError") return;
        console.warn("[LocationPickerModal] Nominatim error:", err?.message ?? err);
        setSearchError(
          lang === "fr"
            ? "Erreur réseau. Vérifiez votre connexion."
            : "Network error. Check your connection.",
        );
        setSearchLoading(false);
      });

    return () => { abortRef.current?.abort(); };
  }, [debouncedQ, lang, configCities]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const saveRecent = async (slug: string) => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_KEY);
      const slugs: string[] = stored ? JSON.parse(stored) : [];
      const updated = [slug, ...slugs.filter((s) => s !== slug)].slice(0, MAX_RECENT);
      await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    } catch {}
  };

  const handleSelectConfigCity = useCallback(
    (city: ConfigCity) => {
      Keyboard.dismiss();
      saveRecent(city.slug);
      onSelectCity(city.slug, city.name);
    },
    [onSelectCity],
  );

  const handleSelectPlace = useCallback(
    (result: PlaceResult) => {
      Keyboard.dismiss();
      if (result.slug) {
        // Matched a known ConfigCity → use proper slug
        saveRecent(result.slug);
        onSelectCity(result.slug, result.name);
      } else {
        // Unknown location → name used as slug (parent fallback displays it)
        onSelectCity(result.name, result.name);
      }
    },
    [onSelectCity],
  );

  // ── GPS ───────────────────────────────────────────────────────────────────
  const handleGPS = useCallback(async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGpsError(
          lang === "fr"
            ? "Permission refusée. Activez la localisation dans les réglages."
            : "Permission denied. Enable location in Settings.",
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
            ? "Position indisponible. Réessayez ou utilisez la recherche."
            : "Position unavailable. Retry or use search.",
        );
        return;
      }
      const { latitude, longitude } = (loc as Location.LocationObject).coords;
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
        onSelectGPS("", "");
      }
    } catch (e: any) {
      const msg = e?.message ?? "";
      setGpsError(
        msg.includes("disabled") || msg.includes("OFF")
          ? (lang === "fr" ? "Localisation désactivée dans les réglages." : "Location disabled in Settings.")
          : (lang === "fr" ? "Erreur GPS. Utilisez la recherche." : "GPS error. Use manual search."),
      );
    } finally {
      setGpsLoading(false);
    }
  }, [lang, configCities, onSelectGPS]);

  // ── Layout ────────────────────────────────────────────────────────────────
  const hasQuery     = query.trim().length > 0;
  const useNominatim = debouncedQ.trim().length >= MIN_QUERY;

  // Android: shrink sheet when keyboard is up
  const sheetMaxHeight =
    Platform.OS === "android" && keyboardHeight > 0
      ? windowHeight - keyboardHeight - insets.top - 20
      : windowHeight * 0.85;
  const paddingBottom =
    keyboardHeight > 0 && Platform.OS === "android" ? 8 : Math.max(insets.bottom, 16);

  // ── Render results section ────────────────────────────────────────────────
  const renderResults = () => {
    // ── Searching via Nominatim ──
    if (useNominatim) {
      if (searchLoading) {
        return (
          <View style={styles.feedbackWrap}>
            <ActivityIndicator color={C.lavender} style={{ marginBottom: 8 }} />
            <Text style={[styles.feedbackText, { color: C.textMuted }]}>
              {lang === "fr" ? "Recherche en cours…" : "Searching…"}
            </Text>
          </View>
        );
      }
      if (searchError) {
        return (
          <View style={styles.feedbackWrap}>
            <Ionicons name="wifi-outline" size={28} color={C.error} style={{ marginBottom: 8 }} />
            <Text style={[styles.feedbackText, { color: C.error }]}>{searchError}</Text>
            <TouchableOpacity
              onPress={() => setDebouncedQ(query)} // re-trigger
              style={[styles.retryBtn, { borderColor: C.border }]}
            >
              <Text style={[styles.retryText, { color: C.lavender }]}>
                {lang === "fr" ? "Réessayer" : "Retry"}
              </Text>
            </TouchableOpacity>
          </View>
        );
      }
      if (nominatimResults.length === 0) {
        return (
          <View style={styles.feedbackWrap}>
            <Ionicons name="search-outline" size={28} color={C.border} style={{ marginBottom: 8 }} />
            <Text style={[styles.feedbackText, { color: C.textMuted }]}>
              {lang === "fr" ? "Aucun résultat trouvé" : "No results found"}
            </Text>
          </View>
        );
      }
      return (
        <FlatList
          data={nominatimResults}
          keyExtractor={(r) => r.placeId}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          renderItem={({ item }) => (
            <PlaceRow result={item} onPress={() => handleSelectPlace(item)} C={C} />
          )}
        />
      );
    }

    // ── Local search (1-2 chars) ──
    if (hasQuery && !useNominatim) {
      if (localResults.length === 0) {
        return (
          <View style={styles.feedbackWrap}>
            <Text style={[styles.feedbackText, { color: C.textMuted }]}>
              {lang === "fr"
                ? `Continuez à taper pour rechercher "${query.trim()}"…`
                : `Keep typing to search for "${query.trim()}"…`}
            </Text>
          </View>
        );
      }
      return localResults.map((city) => (
        <ConfigCityRow
          key={city.slug}
          city={city}
          selected={city.slug === currentCity && !usingGPS}
          onPress={() => handleSelectConfigCity(city)}
          C={C}
        />
      ));
    }

    // ── No query: recent + "all cities" ──
    return (
      <>
        {recentCities.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: C.textMuted }]}>
              {lang === "fr" ? "Récents" : "Recent"}
            </Text>
            {recentCities.map((city) => (
              <ConfigCityRow
                key={city.slug}
                city={city}
                selected={city.slug === currentCity && !usingGPS}
                onPress={() => handleSelectConfigCity(city)}
                C={C}
              />
            ))}
          </>
        )}
        <TouchableOpacity
          style={[styles.allBtn, { borderBottomColor: C.border }]}
          onPress={() => onSelectCity("", "")}
          activeOpacity={0.7}
        >
          <Ionicons name="globe-outline" size={15} color={C.textMuted} style={{ marginRight: 10 }} />
          <Text style={[styles.allBtnText, { color: C.text }]}>
            {lang === "fr" ? "Toutes les villes" : "All cities"}
          </Text>
          {!currentCity && !usingGPS && (
            <Ionicons name="checkmark" size={16} color={C.lavender} />
          )}
        </TouchableOpacity>
      </>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        {/* Backdrop */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        {/* iOS: KAV pushes sheet above keyboard */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.kavOuter}
        >
          <View style={[styles.sheet, { paddingBottom, maxHeight: sheetMaxHeight }]}>
            {/* Drag handle */}
            <View style={[styles.handle, { backgroundColor: C.border }]} />

            {/* Title */}
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: C.text }]}>
                {lang === "fr" ? "Choisir une localisation" : "Choose a location"}
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityRole="button">
                <Ionicons name="close" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {/* GPS button — hidden when keyboard is open */}
            {keyboardHeight === 0 && (
              <>
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
              </>
            )}

            {/* Search input */}
            <View style={[styles.searchWrap, { backgroundColor: C.card2, borderColor: C.border }]}>
              <Ionicons name="search-outline" size={16} color={C.textMuted} />
              <TextInput
                ref={inputRef}
                style={[styles.searchInput, { color: C.text }]}
                placeholder={
                  lang === "fr"
                    ? "Lomé, Abidjan, Paris, Togo…"
                    : "Lomé, Abidjan, Paris, Togo…"
                }
                placeholderTextColor={C.textMuted}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                clearButtonMode="while-editing"
                accessibilityLabel={lang === "fr" ? "Rechercher une ville" : "Search for a city"}
              />
              {query.length > 0 && Platform.OS === "android" && (
                <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={15} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Min chars hint */}
            {hasQuery && query.trim().length < MIN_QUERY && (
              <Text style={[styles.hintText, { color: C.textMuted }]}>
                {lang === "fr"
                  ? `Encore ${MIN_QUERY - query.trim().length} caractère(s) pour lancer la recherche`
                  : `${MIN_QUERY - query.trim().length} more character(s) to search`}
              </Text>
            )}

            {/* Results area — takes remaining space */}
            <View style={styles.resultArea}>{renderResults()}</View>

            {/* Cancel — hidden when keyboard is open */}
            {keyboardHeight === 0 && (
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
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const makeStyles = (C: ColorPalette) =>
  StyleSheet.create({
    modalRoot: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "flex-end",
    },
    kavOuter: {},
    sheet: {
      backgroundColor: C.bg,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      paddingTop: 12,
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
    title: { fontSize: 18, fontFamily: "Inter_700Bold" },
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
    gpsBtnText: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
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
    sepLine:  { flex: 1, height: StyleSheet.hairlineWidth },
    sepText:  { fontSize: 12, fontFamily: "Inter_400Regular" },
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 20,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === "ios" ? 11 : 9,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 4,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      padding: 0,
    },
    hintText: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      marginHorizontal: 20,
      marginTop: 4,
      marginBottom: 4,
    },
    resultArea: { flex: 1 },
    sectionLabel: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginHorizontal: 20,
      marginTop: 10,
      marginBottom: 4,
    },
    allBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    allBtnText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
    feedbackWrap: {
      alignItems: "center",
      paddingVertical: 32,
      paddingHorizontal: 24,
    },
    feedbackText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
    retryBtn: {
      marginTop: 14,
      paddingHorizontal: 20,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
    },
    retryText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    cancelBtn: {
      marginHorizontal: 20,
      marginTop: 12,
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
    },
    cancelText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  });
