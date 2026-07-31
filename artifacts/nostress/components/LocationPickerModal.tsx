/**
 * LocationPickerModal — v3
 *
 * Corrections v3 :
 * ─ Layout     : `sheet` avec hauteur EXPLICITE → flex:1 fonctionne pour la zone résultats
 * ─ MIN_QUERY  : 2 (était 3 — spec : à partir de 2 caractères)
 * ─ Logs       : toute la chaîne (query → URL → status → count → résultats)
 * ─ APIs       : Nominatim (primaire) + photon.komoot.io (fallback automatique)
 * ─ ScrollView : remplace FlatList pour éviter les conflits de hauteur imbriquée
 * ─ Keyboard   : iOS KAV + Android maxHeight dynamique
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
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
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
const RECENT_KEY  = "ns_recent_cities";
const MAX_RECENT  = 5;
const MIN_QUERY   = 2;   // déclencher la recherche dès 2 caractères
const DEBOUNCE_MS = 350;

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlaceResult {
  placeId: string;
  name: string;
  state?: string;
  country?: string;
  countryCode?: string;
  lat: number;
  lon: number;
  slug?: string;
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

// ─── Normalisation accent-insensible ─────────────────────────────────────────
function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ─── Match Nominatim / photon → ConfigCity ────────────────────────────────────
function findConfigCity(
  name: string,
  lat: number,
  lon: number,
  cities: ConfigCity[],
): ConfigCity | null {
  const nl = normalize(name);
  for (const c of cities) {
    const cl = normalize(c.name);
    if (cl === nl || cl.startsWith(nl) || nl.startsWith(cl)) return c;
  }
  for (const c of cities) {
    if (c.latitude != null && c.longitude != null) {
      if (distKm(lat, lon, c.latitude, c.longitude) <= 50) return c;
    }
  }
  return null;
}

// ─── Nominatim ────────────────────────────────────────────────────────────────
async function fetchNominatim(
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
      "User-Agent": "NoStressApp/1.0 (https://nostress.tg; contact@nostress.tg)",
    },
    signal,
  });

  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);

  const data: any[] = await res.json();

  return parseNominatimResults(data, configCities);
}

function parseNominatimResults(data: any[], configCities: ConfigCity[]): PlaceResult[] {
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

    const key = `${normalize(name)}|${addr.country_code ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    const matched = findConfigCity(name, lat, lon, configCities);

    results.push({
      placeId: `nom_${item.place_id}`,
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

// ─── Photon (fallback) ───────────────────────────────────────────────────────
async function fetchPhoton(
  query: string,
  lang: string,
  configCities: ConfigCity[],
  signal: AbortSignal,
): Promise<PlaceResult[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "10");
  url.searchParams.set("lang", lang === "fr" ? "fr" : "en");

  const res = await fetch(url.toString(), { signal });

  if (!res.ok) throw new Error(`Photon HTTP ${res.status}`);

  const data = await res.json();
  const features: any[] = data.features ?? [];

  const seen = new Set<string>();
  const results: PlaceResult[] = [];

  for (const f of features) {
    const p = f.properties ?? {};
    const name = p.name ?? p.city ?? p.state ?? p.country ?? "";
    if (!name) continue;

    const [lon, lat] = f.geometry?.coordinates ?? [0, 0];
    const country    = p.country ?? "";
    const cc         = p.countrycode ?? "";

    const key = `${normalize(name)}|${cc}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const matched = findConfigCity(name, lat, lon, configCities);

    results.push({
      placeId: `pho_${Math.random().toString(36).slice(2)}`,
      name,
      state: p.state !== name ? p.state : undefined,
      country,
      countryCode: cc,
      lat,
      lon,
      slug: matched?.slug,
      isConfigCity: !!matched,
    });
  }

  return results;
}

// ─── Unified search (Nominatim → photon fallback) ────────────────────────────
async function fetchPlaces(
  query: string,
  lang: string,
  configCities: ConfigCity[],
  signal: AbortSignal,
): Promise<PlaceResult[]> {
  try {
    const results = await fetchNominatim(query, lang, configCities, signal);
    if (results.length > 0) return results;
  } catch (err: any) {
    if (err?.name === "AbortError") throw err;
    console.warn("[Search] Nominatim failed:", err?.message, "— trying Photon fallback");
  }

  const fallback = await fetchPhoton(query, lang, configCities, signal);
  return fallback;
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

// ─── ConfigCityRow ────────────────────────────────────────────────────────────
function ConfigCityRow({
  city, selected, onPress, C,
}: { city: ConfigCity; selected: boolean; onPress: () => void; C: ColorPalette }) {
  return (
    <TouchableOpacity
      style={[cr.row, { borderBottomColor: C.border }, selected && { backgroundColor: C.card2 }]}
      onPress={onPress}
      activeOpacity={0.7}
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

// ─── PlaceRow ─────────────────────────────────────────────────────────────────
function PlaceRow({
  result, onPress, C,
}: { result: PlaceResult; onPress: () => void; C: ColorPalette }) {
  const subtitle = [result.state, result.country].filter(Boolean).join(", ");
  return (
    <TouchableOpacity
      style={[cr.row, { borderBottomColor: C.border }]}
      onPress={onPress}
      activeOpacity={0.7}
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
          <Text style={[cr.sub, { color: C.textMuted }]} numberOfLines={1}>{subtitle}</Text>
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
  const [query, setQuery]                       = useState("");
  const [nominatimResults, setNominatimResults] = useState<PlaceResult[]>([]);
  const [searchLoading, setSearchLoading]       = useState(false);
  const [searchError, setSearchError]           = useState<string | null>(null);

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
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }
    setQuery("");
    setNominatimResults([]);
    setSearchLoading(false);
    setSearchError(null);
    setGpsError(null);
    AsyncStorage.getItem(RECENT_KEY)
      .then((v) => {
        if (!v) return;
        const slugs: string[] = JSON.parse(v);
        setRecentCities(
          slugs
            .map((s) => configCities.find((c) => c.slug === s))
            .filter(Boolean) as ConfigCity[],
        );
      })
      .catch(() => {});
  }, [visible, configCities]);

  // ── Search trigger on query change ───────────────────────────────────────
  // (single useEffect, no intermediate debouncedQ state)
  useEffect(() => {
    const q = query.trim();

    // Abort any in-flight request
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.length < MIN_QUERY) {
      // Clear network results immediately; local results still shown
      abortRef.current?.abort();
      setNominatimResults([]);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }

    // Show loading immediately (before debounce) so UX feels responsive
    setSearchLoading(true);
    setSearchError(null);

    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      fetchPlaces(q, lang, configCities, abortRef.current.signal)
        .then((results) => {
          setNominatimResults(results);
          setSearchLoading(false);
        })
        .catch((err: any) => {
          if (err?.name === "AbortError") {
            return;
          }
          console.error("[Search] ❌ error:", err?.message ?? String(err));
          setSearchError(
            lang === "fr"
              ? "Erreur réseau. Vérifiez votre connexion."
              : "Network error. Check your connection.",
          );
          setNominatimResults([]);
          setSearchLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, lang, configCities]);

  // ── Local filter (instant, works offline) ────────────────────────────────
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
        saveRecent(result.slug);
        onSelectCity(result.slug, result.name);
      } else {
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

  // ── Layout heights ────────────────────────────────────────────────────────
  //
  // CORRECTION CRITIQUE : le `sheet` reçoit une hauteur EXPLICITE.
  // Sans hauteur explicite, `flex:1` dans la zone résultats donne 0px.
  //
  const kbOpen = keyboardHeight > 0;

  // Hauteur disponible au-dessus du clavier (toutes plateformes).
  // On soustrait insets.top pour ne jamais dépasser la barre d'état iOS.
  const availableHeight = kbOpen
    ? windowHeight - keyboardHeight - insets.top - 16
    : windowHeight - insets.top - 16;

  const sheetHeight = Math.min(windowHeight * 0.85, availableHeight);

  const paddingBottom = kbOpen ? 8 : Math.max(insets.bottom, 16);

  // ── Render results ────────────────────────────────────────────────────────
  const hasQuery    = query.trim().length > 0;
  const hasEnough   = query.trim().length >= MIN_QUERY;

  const renderResults = () => {
    if (hasEnough) {
      // Network search mode
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
              onPress={() => {
                // force re-trigger by resetting loading state
                setSearchError(null);
                setSearchLoading(true);
                const q = query.trim();
                abortRef.current?.abort();
                abortRef.current = new AbortController();
                fetchPlaces(q, lang, configCities, abortRef.current.signal)
                  .then((r) => { setNominatimResults(r); setSearchLoading(false); })
                  .catch((e: any) => {
                    if (e?.name === "AbortError") return;
                    setSearchError(lang === "fr" ? "Erreur réseau." : "Network error.");
                    setSearchLoading(false);
                  });
              }}
              style={[styles.retryBtn, { borderColor: C.border }]}
            >
              <Text style={[styles.retryText, { color: C.lavender }]}>
                {lang === "fr" ? "Réessayer" : "Retry"}
              </Text>
            </TouchableOpacity>
          </View>
        );
      }

      // Show both local + network results (local at top for known cities)
      const showLocal = localResults.length > 0 &&
        !nominatimResults.some((r) => r.isConfigCity);

      if (nominatimResults.length === 0 && localResults.length === 0) {
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
        <>
          {showLocal && localResults.map((city) => (
            <ConfigCityRow
              key={city.slug}
              city={city}
              selected={city.slug === currentCity && !usingGPS}
              onPress={() => handleSelectConfigCity(city)}
              C={C}
            />
          ))}
          {nominatimResults.map((result) => (
            <PlaceRow
              key={result.placeId}
              result={result}
              onPress={() => handleSelectPlace(result)}
              C={C}
            />
          ))}
        </>
      );
    }

    // Short query: local filter only
    if (hasQuery) {
      if (localResults.length === 0) {
        return (
          <View style={styles.feedbackWrap}>
            <Text style={[styles.feedbackText, { color: C.textMuted }]}>
              {lang === "fr"
                ? `Encore ${MIN_QUERY - query.trim().length} caractère(s)…`
                : `${MIN_QUERY - query.trim().length} more character(s)…`}
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

    // No query: recent + all cities
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

        {/*
          iOS : KAV behavior="padding" + keyboardVerticalOffset={insets.top}
                → le sheet remonte exactement jusqu'à la safe area, jamais derrière.
          Android : behavior={undefined}, sheetHeight réduit dynamiquement.
        */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={insets.top}
          style={styles.kavOuter}
        >
          {/*
            CORRECTION CLEF : height EXPLICITE sur le sheet.
            Sans ça, flex:1 dans la zone résultats = hauteur 0.
          */}
          <View style={[styles.sheet, { height: sheetHeight }]}>

            {/* ── En-tête fixe ─────────────────────────────────────────── */}
            <View style={styles.fixedHeader}>
              {/* Drag handle */}
              <View style={[styles.handle, { backgroundColor: C.border }]} />

              {/* Title */}
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color: C.text }]}>
                  {lang === "fr" ? "Choisir une localisation" : "Choose a location"}
                </Text>
                <TouchableOpacity onPress={onClose} hitSlop={12}>
                  <Ionicons name="close" size={22} color={C.textMuted} />
                </TouchableOpacity>
              </View>

              {/* GPS — caché quand clavier ouvert */}
              {!kbOpen && (
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
                  >
                    {gpsLoading ? (
                      <ActivityIndicator size="small" color={C.lavender} style={{ width: 20 }} />
                    ) : (
                      <Ionicons name="navigate" size={18} color={C.lavender} />
                    )}
                    <Text style={[styles.gpsBtnText, { color: C.lavender }]}>
                      {gpsLoading
                        ? (lang === "fr" ? "Localisation…" : "Getting location…")
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
                  placeholder="Lomé, Abidjan, Paris, Togo…"
                  placeholderTextColor={C.textMuted}
                  value={query}
                  onChangeText={(t) => {
                    setQuery(t);
                  }}
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
            </View>

            {/* ── Zone résultats (flex:1 → fonctionne car parent a height explicite) ── */}
            <ScrollView
              style={styles.resultScroll}
              contentContainerStyle={styles.resultContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              showsVerticalScrollIndicator
            >
              {renderResults()}
            </ScrollView>

            {/* ── Pied fixe — caché quand clavier ouvert ───────────────── */}
            {!kbOpen && (
              <View style={[styles.fixedFooter, { paddingBottom }]}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: C.border }]}
                  onPress={onClose}
                >
                  <Text style={[styles.cancelText, { color: C.textMuted }]}>
                    {lang === "fr" ? "Annuler" : "Cancel"}
                  </Text>
                </TouchableOpacity>
              </View>
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
    kavOuter: {
      // Pas de flex ici — le sheet définit lui-même sa hauteur
    },
    sheet: {
      backgroundColor: C.bg,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      paddingTop: 12,
      overflow: "hidden",
      // `height` défini dynamiquement via style inline
    },
    fixedHeader: {
      // Taille déterminée par son contenu — ne pas mettre de flex
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
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      padding: 0,
    },
    // ScrollView pour les résultats — flex:1 fonctionne car le parent (sheet) a une hauteur explicite
    resultScroll: {
      flex: 1,
    },
    resultContent: {
      flexGrow: 1,
    },
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
    fixedFooter: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    cancelBtn: {
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
    },
    cancelText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  });
