import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { C } from "@/constants/colors";
import { useT, useApp, useColors } from "@/context/AppContext";
import { VENUE_TYPES, MOCK_CITIES } from "@/constants/data";
import { MapWebView } from "@/components/MapWebView";
import { router } from "expo-router";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

type Venue = {
  id: string;
  name: string;
  type: string;
  city: string;
  address: string;
  description?: string;
  latitude: number | null;
  longitude: number | null;
  isVerified?: boolean;
};

function buildLeafletHtml(venues: Venue[], selectedVenueId: string): string {
  const venueData = JSON.stringify(
    venues.map((v) => ({
      id: v.id,
      name: v.name,
      city: v.city,
      type: v.type,
      address: v.address,
      isVerified: v.isVerified,
      lat: v.latitude,
      lng: v.longitude,
    }))
  );

  const gold = "#D4AF37";
  const lavender = "#9B8FE8";
  const cardBg = "#0a0f1e";
  const textColor = "#E8E8F0";
  const textMuted = "#8891b0";
  const border = "#1a2040";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; width: 100%; background: #000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  #map { width: 100%; height: 100%; }
  .leaflet-container { background: #000 !important; }

  .leaflet-popup-content-wrapper {
    background: ${cardBg};
    border: 1px solid ${lavender}55;
    border-radius: 16px;
    box-shadow: 0 0 24px rgba(155,143,232,0.25), 0 8px 32px rgba(0,0,0,0.8);
    padding: 0;
    min-width: 210px;
  }
  .leaflet-popup-content { margin: 0; padding: 0; }
  .leaflet-popup-tip-container { display: none; }
  .leaflet-popup-close-button { color: ${textMuted} !important; font-size: 18px !important; top: 8px !important; right: 10px !important; }

  .popup-inner { padding: 16px 18px; color: ${textColor}; }
  .popup-category {
    font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
    text-transform: uppercase; color: ${lavender}; margin-bottom: 6px;
    display: flex; align-items: center; gap: 4px;
  }
  .popup-name { font-size: 16px; font-weight: 800; margin-bottom: 6px; letter-spacing: -0.3px; }
  .popup-address { font-size: 12px; color: ${textMuted}; display: flex; align-items: center; gap: 4px; }
  .popup-badge {
    display: inline-flex; align-items: center; gap: 4px;
    background: linear-gradient(135deg, ${gold}33, ${gold}11);
    border: 1px solid ${gold}66;
    color: ${gold}; font-size: 10px; font-weight: 700;
    padding: 3px 10px; border-radius: 20px; margin-top: 10px;
    letter-spacing: 0.5px; text-transform: uppercase;
  }
  .popup-divider { height: 1px; background: ${border}; margin: 10px 0; }

  /* Marker: glowing pin */
  .ns-pin {
    position: relative;
    display: flex; align-items: center; justify-content: center;
    width: 34px; height: 34px;
    border-radius: 50%;
    background: radial-gradient(circle, ${gold}dd, ${gold}88);
    box-shadow: 0 0 12px ${gold}99, 0 0 24px ${gold}44, 0 2px 6px rgba(0,0,0,0.6);
    border: 2px solid rgba(255,255,255,0.25);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .ns-pin::after {
    content: '';
    position: absolute;
    bottom: -10px; left: 50%;
    transform: translateX(-50%);
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 10px solid ${gold}cc;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
  }
  .ns-pin-inner { font-size: 14px; font-weight: 900; color: #0a0f1e; letter-spacing: -1px; }
  .ns-pin.selected {
    background: radial-gradient(circle, ${lavender}ee, ${lavender}99);
    box-shadow: 0 0 18px ${lavender}bb, 0 0 40px ${lavender}55, 0 2px 8px rgba(0,0,0,0.7);
    border-color: rgba(255,255,255,0.4);
    width: 42px; height: 42px;
  }
  .ns-pin.selected::after { border-top-color: ${lavender}cc; }
  .ns-pin.selected .ns-pin-inner { font-size: 17px; color: #fff; }

  /* Pulse ring on selected */
  .ns-pulse {
    position: absolute;
    width: 60px; height: 60px;
    border-radius: 50%;
    border: 2px solid ${lavender}66;
    animation: pulse 1.8s ease-out infinite;
    left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
  @keyframes pulse {
    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.8; }
    100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
  }
</style>
</head>
<body>
<div id="map"></div>
<script>
var venues = ${venueData};
var selectedId = "${selectedVenueId}";

var map = L.map('map', {
  zoomControl: false,
  attributionControl: false,
  preferCanvas: false,
}).setView([8.6, 1.0], 7);

/* CartoDB Dark Matter — fond noir uniquement Togo */
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  maxZoom: 19,
  minZoom: 6,
  subdomains: 'abcd',
  attribution: '&copy; CartoDB',
}).addTo(map);

/* Limiter la carte aux bounds du Togo */
var togoBounds = L.latLngBounds([[6.0, -0.2], [11.2, 1.9]]);
map.setMaxBounds(togoBounds.pad(0.15));

L.control.zoom({ position: 'topright' }).addTo(map);

function createMarkerIcon(venueId) {
  var isSel = venueId === selectedId;
  var size = isSel ? 42 : 34;
  var anchor = isSel ? 21 : 17;
  var html = '<div class="ns-pin' + (isSel ? ' selected' : '') + '">'
    + (isSel ? '<div class="ns-pulse"></div>' : '')
    + '<span class="ns-pin-inner">N</span>'
    + '</div>';
  return L.divIcon({
    html: html,
    className: '',
    iconSize: [size, size + 10],
    iconAnchor: [anchor, size + 10],
    popupAnchor: [0, -(size + 14)],
  });
}

var markers = {};
venues.forEach(function(v) {
  var marker = L.marker([v.lat, v.lng], { icon: createMarkerIcon(v.id) });
  marker.venueId = v.id;

  var popupHtml = '<div class="popup-inner">'
    + '<div class="popup-category">📍 ' + v.type + '</div>'
    + '<div class="popup-name">' + v.name + '</div>'
    + '<div class="popup-divider"></div>'
    + '<div class="popup-address">🏙️ ' + v.city + ' &nbsp;·&nbsp; ' + v.address + '</div>'
    + (v.isVerified ? '<div class="popup-badge">✦ Vérifié NoStress</div>' : '')
    + '</div>';

  marker.bindPopup(popupHtml, { maxWidth: 280, minWidth: 210 });

  marker.on('click', function() {
    selectedId = v.id;
    Object.keys(markers).forEach(function(id) {
      markers[id].setIcon(createMarkerIcon(id));
    });
    var msg = JSON.stringify({ type: 'venueSelected', venueId: v.id });
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(msg);
    } else {
      window.parent.postMessage({ type: 'venueSelected', venueId: v.id }, '*');
    }
  });

  marker.addTo(map);
  markers[v.id] = marker;

  if (v.id === selectedId) {
    setTimeout(function() {
      marker.openPopup();
      map.setView([v.lat, v.lng], 13, { animate: true });
    }, 400);
  }
});

if (venues.length > 0 && !selectedId) {
  var group = L.featureGroup(Object.values(markers));
  map.fitBounds(group.getBounds().pad(0.25));
}

window.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'flyToVenue') {
    var v = venues.find(function(x) { return x.id === e.data.venueId; });
    if (v) {
      selectedId = v.id;
      Object.keys(markers).forEach(function(id) {
        markers[id].setIcon(createMarkerIcon(id));
      });
      map.flyTo([v.lat, v.lng], 14, { animate: true, duration: 0.8 });
      setTimeout(function() { markers[v.id].openPopup(); }, 900);
    }
  }
  if (e.data && e.data.type === 'fitAll') {
    selectedId = '';
    Object.keys(markers).forEach(function(id) {
      markers[id].setIcon(createMarkerIcon(id));
    });
    var group = L.featureGroup(Object.values(markers));
    if (group.getLayers().length) map.fitBounds(group.getBounds().pad(0.2), { animate: true });
  }
});
</script>
</body>
</html>`;
}

/* ─── City picker modal ─────────────────────────────────────────────────── */
function CityPickerModal({
  visible,
  selected,
  onClose,
  onSelect,
}: {
  visible: boolean;
  selected: string;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const items = [{ id: "", name: "Toutes les villes", emoji: "🌍" }, ...MOCK_CITIES];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={modal.backdrop} onPress={onClose} />
      <View style={[modal.sheet, { paddingBottom: insets.bottom + 16, backgroundColor: C.card }]}>
        <View style={[modal.handle, { backgroundColor: C.border }]} />
        <Text style={[modal.title, { color: C.text }]}>Villes</Text>
        <FlatList
          data={items}
          keyExtractor={(c) => c.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const active = item.id === selected;
            return (
              <TouchableOpacity
                style={[modal.item, active && { backgroundColor: C.lavender + "18" }, { borderBottomColor: C.border }]}
                onPress={() => { onSelect(item.id); onClose(); }}
              >
                <Text style={modal.emoji}>{item.emoji}</Text>
                <Text style={[modal.cityName, { color: active ? C.lavender : C.text }]}>
                  {item.name}
                </Text>
                {active && <Ionicons name="checkmark-circle" size={18} color={C.lavender} />}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const modal = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)" },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 12,
    maxHeight: "65%",
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: "center", marginBottom: 16,
  },
  title: {
    fontSize: 20, fontFamily: "Inter_700Bold",
    paddingHorizontal: 20, marginBottom: 10,
  },
  item: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, gap: 12,
  },
  emoji: { fontSize: 18, width: 26 },
  cityName: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
});

/* ─── Main screen ───────────────────────────────────────────────────────── */
export default function MapScreen() {
  const t = useT();
  const C = useColors();
  const { lang, selectedCity, setSelectedCity } = useApp();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const [selectedType, setSelectedType] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [apiVenues, setApiVenues] = useState<Venue[]>([]);
  const iframeRef = React.useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/venues`);
        if (!r.ok) return;
        const data = await r.json();
        const list: Venue[] = (Array.isArray(data?.venues) ? data.venues : [])
          .map((v: any) => ({
            id: `api_${v.id}`,
            name: v.name || "",
            type: v.type || "",
            city: v.city || "",
            address: v.address || "",
            description: v.description || "",
            latitude: typeof v.latitude === "number" ? v.latitude : v.latitude ? Number(v.latitude) : null,
            longitude: typeof v.longitude === "number" ? v.longitude : v.longitude ? Number(v.longitude) : null,
            isVerified: !!v.isVerified,
          }))
          .filter((v: Venue) => v.latitude != null && v.longitude != null && !isNaN(v.latitude) && !isNaN(v.longitude));
        if (!cancelled) setApiVenues(list);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredVenues = useMemo(() => {
    return apiVenues.filter((v) => {
      const cityObj = MOCK_CITIES.find((c) => c.id === selectedCity);
      const matchCity =
        !selectedCity ||
        v.city.toLowerCase() === selectedCity.toLowerCase() ||
        (cityObj?.name && v.city === cityObj.name);
      const matchType = !selectedType || v.type === selectedType;
      return matchCity && matchType;
    });
  }, [apiVenues, selectedCity, selectedType]);

  const htmlContent = useMemo(() => {
    return buildLeafletHtml(filteredVenues, selectedVenue?.id ?? "");
  }, [filteredVenues]);

  const handleMessage = useCallback((data: any) => {
    let parsed: any;
    try { parsed = typeof data === "string" ? JSON.parse(data) : data; } catch { return; }
    if (parsed?.type === "venueSelected") {
      const v = apiVenues.find((x) => x.id === parsed.venueId);
      if (v) setSelectedVenue(v);
    }
  }, [apiVenues]);

  const flyTo = (venue: Venue) => setSelectedVenue(venue);

  const resetFilter = () => {
    setSelectedCity("");
    setSelectedType("");
    setSelectedVenue(null);
    setMapKey((k) => k + 1);
  };

  const selectedCityLabel = useMemo(() => {
    if (!selectedCity) return null;
    return MOCK_CITIES.find((c) => c.id === selectedCity)?.name ?? selectedCity;
  }, [selectedCity]);

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      {/* Top header */}
      <View style={[styles.header, { paddingTop: topInset + 10, backgroundColor: C.bg, borderBottomColor: C.border }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: C.text }]}>
              {lang === "fr" ? "Carte des Lieux" : "Venues Map"}
            </Text>
            <Text style={[styles.headerSub, { color: C.textMuted }]}>
              {filteredVenues.length}{" "}
              {lang === "fr"
                ? filteredVenues.length > 1 ? "lieux" : "lieu"
                : filteredVenues.length > 1 ? "venues" : "venue"}
              {selectedCityLabel ? ` · ${selectedCityLabel}` : ""}
            </Text>
          </View>
          {(selectedCity || selectedType) && (
            <TouchableOpacity
              style={[styles.resetBtn, { backgroundColor: C.lavender + "18", borderColor: C.lavender + "44" }]}
              onPress={resetFilter}
            >
              <Ionicons name="refresh" size={14} color={C.lavender} />
              <Text style={[styles.resetBtnText, { color: C.lavender }]}>
                {lang === "fr" ? "Tout voir" : "Show all"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter row: Villes + type pills */}
        <View style={styles.filterRow}>
          {/* Villes button */}
          <TouchableOpacity
            style={[
              styles.villesBtn,
              { backgroundColor: selectedCity ? C.lavender : C.card, borderColor: selectedCity ? C.lavender : C.border },
            ]}
            onPress={() => setCityModalOpen(true)}
          >
            <Ionicons
              name="location"
              size={14}
              color={selectedCity ? C.bg : C.gold}
            />
            <Text style={[styles.villesBtnText, { color: selectedCity ? C.bg : C.text }]}>
              {selectedCityLabel ?? "Villes"}
            </Text>
            <Ionicons
              name="chevron-down"
              size={12}
              color={selectedCity ? C.bg : C.textMuted}
            />
          </TouchableOpacity>

          {/* Type pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typePills}
          >
            <TouchableOpacity
              style={[styles.typePill, !selectedType && { backgroundColor: C.gold + "22", borderColor: C.gold }]}
              onPress={() => setSelectedType("")}
            >
              <Text style={[styles.typePillText, { color: !selectedType ? C.gold : C.textMuted }, !selectedType && styles.typePillTextActive]}>
                {t("allTypes")}
              </Text>
            </TouchableOpacity>
            {VENUE_TYPES.map((type) => {
              const active = selectedType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.typePill, active && { backgroundColor: C.gold + "22", borderColor: C.gold }, { borderColor: C.border }]}
                  onPress={() => setSelectedType(active ? "" : type)}
                >
                  <Text style={[styles.typePillText, { color: active ? C.gold : C.textMuted }, active && styles.typePillTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* City picker modal */}
      <CityPickerModal
        visible={cityModalOpen}
        selected={selectedCity}
        onClose={() => setCityModalOpen(false)}
        onSelect={setSelectedCity}
      />

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapWebView
          key={`${mapKey}-${filteredVenues.map((v) => v.id).join(",")}`}
          htmlContent={htmlContent}
          style={styles.map}
          onMessage={handleMessage}
        />

        {/* Venue bottom card */}
        {selectedVenue && (
          <View style={[styles.venueCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <TouchableOpacity
              style={[styles.venueCardClose, { backgroundColor: C.border }]}
              onPress={() => setSelectedVenue(null)}
            >
              <Ionicons name="close" size={16} color={C.textMuted} />
            </TouchableOpacity>

            <View style={styles.venueCardContent}>
              <View style={[styles.venueMarkerIcon, { backgroundColor: C.lavender }]}>
                <Text style={[styles.venueMarkerLetter, { color: C.bg }]}>N</Text>
              </View>
              <View style={styles.venueCardInfo}>
                <View style={styles.venueNameRow}>
                  <Text style={[styles.venueName, { color: C.text }]} numberOfLines={1}>
                    {selectedVenue.name}
                  </Text>
                  {selectedVenue.isVerified && (
                    <Ionicons name="checkmark-circle" size={15} color={C.gold} />
                  )}
                </View>
                <View style={[styles.venueTypePill, { backgroundColor: C.lavender + "18", borderColor: C.lavender + "40" }]}>
                  <Text style={[styles.venueType, { color: C.lavender }]}>{selectedVenue.type}</Text>
                </View>
                <View style={styles.venueAddressRow}>
                  <Ionicons name="location-outline" size={11} color={C.textMuted} />
                  <Text style={[styles.venueAddress, { color: C.textMuted }]} numberOfLines={1}>
                    {selectedVenue.city} · {selectedVenue.address}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.detailsBtn, { backgroundColor: C.lavender }]}
              onPress={() => router.push(`/venue/${selectedVenue.id}` as any)}
              activeOpacity={0.85}
            >
              <Text style={[styles.detailsBtnText, { color: C.bg }]}>
                {lang === "fr" ? "Voir les détails" : "View details"}
              </Text>
              <Ionicons name="arrow-forward" size={15} color={C.bg} />
            </TouchableOpacity>
          </View>
        )}

        {/* Floating venue list */}
        <VenueList
          venues={filteredVenues}
          selectedVenue={selectedVenue}
          lang={lang}
          onSelect={flyTo}
        />
      </View>
    </View>
  );
}

function VenueList({
  venues, selectedVenue, lang, onSelect,
}: {
  venues: Venue[]; selectedVenue: Venue | null; lang: string; onSelect: (v: Venue) => void;
}) {
  const [open, setOpen] = useState(false);
  const C = useColors();

  return (
    <View style={[list.container, { backgroundColor: C.card, borderColor: C.border }]}>
      <TouchableOpacity style={list.toggle} onPress={() => setOpen(!open)}>
        <Ionicons name="list" size={16} color={C.text} />
        <Text style={[list.toggleText, { color: C.text }]}>
          {lang === "fr" ? "Liste" : "List"} ({venues.length})
        </Text>
        <Ionicons name={open ? "chevron-down" : "chevron-up"} size={14} color={C.textMuted} />
      </TouchableOpacity>
      {open && (
        <ScrollView style={list.scroll} showsVerticalScrollIndicator={false}>
          {venues.map((v) => {
            const active = selectedVenue?.id === v.id;
            return (
              <TouchableOpacity
                key={v.id}
                style={[list.item, active && { backgroundColor: C.gold + "12" }, { borderTopColor: C.border }]}
                onPress={() => { onSelect(v); setOpen(false); }}
              >
                <View style={[list.dot, { backgroundColor: active ? C.gold : C.lavender }]} />
                <View style={list.itemInfo}>
                  <Text style={[list.itemName, { color: C.text }]} numberOfLines={1}>{v.name}</Text>
                  <Text style={[list.itemSub, { color: C.textMuted }]}>{v.city} · {v.type}</Text>
                </View>
                {v.isVerified && <Ionicons name="checkmark-circle" size={14} color={C.gold} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const list = StyleSheet.create({
  container: {
    position: "absolute", bottom: 12, left: 12,
    width: 220, borderRadius: 14, borderWidth: 1,
    overflow: "hidden", maxHeight: 280,
    shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 10,
  },
  toggle: { flexDirection: "row", alignItems: "center", padding: 12, gap: 8 },
  toggleText: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  scroll: { maxHeight: 220 },
  item: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 10, borderTopWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  itemInfo: { flex: 1, gap: 2 },
  itemName: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  itemSub: { fontSize: 10, fontFamily: "Inter_400Regular" },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1, gap: 10, zIndex: 10,
  },
  headerRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
  },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  resetBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1,
  },
  resetBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  filterRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  villesBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, flexShrink: 0,
  },
  villesBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", maxWidth: 90 },

  typePills: { gap: 6, paddingRight: 4 },
  typePill: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 14, borderWidth: 1,
  },
  typePillText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  typePillTextActive: { fontFamily: "Inter_700Bold" },

  mapContainer: { flex: 1, position: "relative" },
  map: { flex: 1 },

  venueCard: {
    position: "absolute", top: 12, left: 12, right: 12,
    borderRadius: 18, padding: 14, borderWidth: 1,
    shadowColor: "#000", shadowOpacity: 0.6, shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 }, elevation: 12,
  },
  venueCardClose: {
    position: "absolute", top: 10, right: 10,
    width: 26, height: 26, alignItems: "center",
    justifyContent: "center", borderRadius: 13, zIndex: 1,
  },
  venueCardContent: { flexDirection: "row", gap: 12, alignItems: "center" },
  venueMarkerIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  venueMarkerLetter: { fontSize: 18, fontFamily: "Inter_700Bold" },
  venueCardInfo: { flex: 1, gap: 4 },
  venueNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  venueName: { fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  venueTypePill: {
    alignSelf: "flex-start", borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1,
  },
  venueType: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase" },
  venueAddressRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  venueAddress: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  detailsBtn: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8,
    borderRadius: 12, paddingVertical: 12, marginTop: 12,
  },
  detailsBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
