import React, { useState, useMemo, useEffect, useCallback } from "react";
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
import * as Location from "expo-location";
import { safePush } from "@/lib/navigation";

import { useT, useApp, useColors } from "@/context/AppContext";
import { VENUE_TYPES } from "@/constants/data";
import { VenueCard } from "@/components/VenueCard";
import { API_BASE } from "@/lib/apiBase";

const DISTANCE_OPTIONS = [2, 5, 10, 25, 50];

export default function VenuesScreen() {
  const t = useT();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(C), [C]);
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const [apiVenues, setApiVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [radiusKm, setRadiusKm] = useState<number | null>(5);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

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
        <Text style={styles.headerTitle}>{t("venues")}</Text>

        <View style={styles.row}>
          <View style={styles.inputWrap}>
            <Ionicons name="location-outline" size={16} color={C.textMuted} />
            <TextInput
              style={styles.input}
              placeholder={t("city" as any) || "Ville"}
              placeholderTextColor={C.textMuted}
              value={city}
              onChangeText={setCity}
            />
          </View>
          <View style={styles.inputWrap}>
            <Ionicons name="flag-outline" size={16} color={C.textMuted} />
            <TextInput
              style={styles.input}
              placeholder={t("country" as any) || "Pays"}
              placeholderTextColor={C.textMuted}
              value={country}
              onChangeText={setCountry}
            />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <TouchableOpacity
            style={[styles.chip, selectedType === "" && styles.chipActive]}
            onPress={() => setSelectedType("")}
          >
            <Text style={[styles.chipText, selectedType === "" && styles.chipTextActive]}>
              {t("allTypes")}
            </Text>
          </TouchableOpacity>
          {VENUE_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.chip, selectedType === type && styles.chipActive]}
              onPress={() => setSelectedType(selectedType === type ? "" : type)}
            >
              <Text style={[styles.chipText, selectedType === type && styles.chipTextActive]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
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
      </View>

      {loading ? (
        <View style={styles.empty}><ActivityIndicator color={C.lavender} /></View>
      ) : (
        <FlatList
          data={venues}
          keyExtractor={(v) => v.id}
          contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 118 : 100 }]}
          showsVerticalScrollIndicator={false}
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
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 4 },
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
