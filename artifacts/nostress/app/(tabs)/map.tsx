import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
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
import * as Location from "expo-location";

import { C } from "@/constants/colors";
import { useT, useApp, useColors } from "@/context/AppContext";
import { VENUE_TYPES, MOCK_CITIES } from "@/constants/data";
import { MapWebView, type MapWebViewHandle } from "@/components/MapWebView";
import { router } from "expo-router";
import { safePush } from "@/lib/navigation";
import { API_BASE } from "@/lib/apiBase";

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

type UserCoords = { lat: number; lng: number; accuracy?: number | null } | null;

/* ─── Haversine distance (km) ─────────────────────────────────────────────── */
function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const R = 6371; // km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatDistance(km: number, lang: string): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

function buildLeafletHtml(
  venues: Venue[],
  selectedVenueId: string,
  user: UserCoords
): string {
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
  const userData = JSON.stringify(
    user ? { lat: user.lat, lng: user.lng, accuracy: user.accuracy ?? null } : null
  );

  const gold = "#D4AF37";
  const lavender = "#9B8FE8";
  const userBlue = "#4A8BFF";
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

  /* User location marker (blue dot like Google Maps) */
  .ns-user-dot {
    position: relative;
    width: 22px; height: 22px;
    border-radius: 50%;
    background: ${userBlue};
    border: 3px solid #fff;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.4), 0 0 12px ${userBlue}aa, 0 2px 6px rgba(0,0,0,0.5);
  }
  .ns-user-pulse {
    position: absolute;
    left: 50%; top: 50%;
    width: 22px; height: 22px;
    border-radius: 50%;
    background: ${userBlue};
    opacity: 0.4;
    transform: translate(-50%, -50%);
    animation: userPulse 2s ease-out infinite;
    pointer-events: none;
  }
  @keyframes userPulse {
    0%   { transform: translate(-50%, -50%) scale(0.7); opacity: 0.55; }
    100% { transform: translate(-50%, -50%) scale(3.2); opacity: 0; }
  }
  /* Accuracy circle styling */
  .ns-user-accuracy {
    fill: ${userBlue};
    fill-opacity: 0.10;
    stroke: ${userBlue};
    stroke-opacity: 0.45;
    stroke-width: 1;
  }
  .leaflet-popup.user-popup .leaflet-popup-content-wrapper {
    border-color: ${userBlue}88;
  }
  .leaflet-popup.user-popup .popup-category { color: ${userBlue}; }
</style>
</head>
<body>
<div id="map"></div>
<script>
var venues = ${venueData};
var selectedId = "${selectedVenueId}";
var userLoc = ${userData};

/* HTML-escape any user-supplied venue field before injecting into popup HTML */
function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
    + '<div class="popup-category">📍 ' + esc(v.type) + '</div>'
    + '<div class="popup-name">' + esc(v.name) + '</div>'
    + '<div class="popup-divider"></div>'
    + '<div class="popup-address">🏙️ ' + esc(v.city) + ' &nbsp;·&nbsp; ' + esc(v.address) + '</div>'
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

/* ─── User location marker ─────────────────────────────────────────────── */
var userMarker = null;
var userAccuracy = null;

function userIcon() {
  return L.divIcon({
    html: '<div class="ns-user-pulse"></div><div class="ns-user-dot"></div>',
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -16],
  });
}

function setUserLocation(loc, opts) {
  if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return;
  var latlng = [loc.lat, loc.lng];

  if (userAccuracy) { try { map.removeLayer(userAccuracy); } catch(_){} userAccuracy = null; }
  if (loc.accuracy && loc.accuracy > 0 && loc.accuracy < 5000) {
    userAccuracy = L.circle(latlng, {
      radius: loc.accuracy,
      className: 'ns-user-accuracy',
      interactive: false,
    }).addTo(map);
  }

  if (!userMarker) {
    userMarker = L.marker(latlng, { icon: userIcon(), zIndexOffset: 1000 });
    userMarker.bindPopup(
      '<div class="popup-inner"><div class="popup-category">📍 Vous êtes ici</div>' +
      '<div class="popup-name" style="font-size:14px;">Votre position</div></div>',
      { maxWidth: 220, className: 'user-popup' }
    );
    userMarker.addTo(map);
  } else {
    userMarker.setLatLng(latlng);
  }

  if (opts && opts.fly) {
    map.flyTo(latlng, opts.zoom || 14, { animate: true, duration: 0.9 });
  }
}

if (userLoc) setUserLocation(userLoc, { fly: false });

/* ─── Initial fit ─────────────────────────────────────────────────────── */
if (!selectedId) {
  if (userLoc && venues.length > 0) {
    /* Fit to user + nearby venues (sorted by distance, take top 6) */
    function distKm(aLat, aLng, bLat, bLng) {
      var R = 6371;
      var toRad = function(d){ return d * Math.PI / 180; };
      var dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
      var lat1 = toRad(aLat), lat2 = toRad(bLat);
      var h = Math.sin(dLat/2)*Math.sin(dLat/2) +
              Math.sin(dLng/2)*Math.sin(dLng/2)*Math.cos(lat1)*Math.cos(lat2);
      return 2 * R * Math.asin(Math.sqrt(h));
    }
    var nearby = venues
      .map(function(v){ return { v: v, d: distKm(userLoc.lat, userLoc.lng, v.lat, v.lng) }; })
      .sort(function(a, b){ return a.d - b.d; })
      .slice(0, 6);
    var pts = [[userLoc.lat, userLoc.lng]].concat(nearby.map(function(n){ return [n.v.lat, n.v.lng]; }));
    map.fitBounds(L.latLngBounds(pts).pad(0.3), { animate: true, maxZoom: 13 });
  } else if (userLoc) {
    map.setView([userLoc.lat, userLoc.lng], 13, { animate: true });
  } else if (venues.length > 0) {
    var group = L.featureGroup(Object.values(markers));
    map.fitBounds(group.getBounds().pad(0.25));
  }
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
  if (e.data && e.data.type === 'flyToUser') {
    if (userMarker) {
      map.flyTo(userMarker.getLatLng(), 15, { animate: true, duration: 0.9 });
      setTimeout(function() { userMarker.openPopup(); }, 950);
    }
  }
  if (e.data && e.data.type === 'setUserLocation') {
    setUserLocation(e.data.loc, { fly: !!e.data.fly, zoom: e.data.zoom });
  }
});
</script>
</body>
</html>`;
}

/* ─── Distance filter options (km) ──────────────────────────────────────── */
const DISTANCE_OPTIONS: { value: number | null; labelFr: string; labelEn: string }[] = [
  { value: null, labelFr: "Toutes distances", labelEn: "Any distance" },
  { value: 1,  labelFr: "≤ 1 km",  labelEn: "≤ 1 km" },
  { value: 2,  labelFr: "≤ 2 km",  labelEn: "≤ 2 km" },
  { value: 5,  labelFr: "≤ 5 km",  labelEn: "≤ 5 km" },
  { value: 10, labelFr: "≤ 10 km", labelEn: "≤ 10 km" },
  { value: 20, labelFr: "≤ 20 km", labelEn: "≤ 20 km" },
  { value: 50, labelFr: "≤ 50 km", labelEn: "≤ 50 km" },
];

/* ─── Distance picker modal ─────────────────────────────────────────────── */
function DistancePickerModal({
  visible,
  selected,
  hasLocation,
  lang,
  onClose,
  onSelect,
  onRequestLocation,
}: {
  visible: boolean;
  selected: number | null;
  hasLocation: boolean;
  lang: "fr" | "en";
  onClose: () => void;
  onSelect: (km: number | null) => void;
  onRequestLocation: () => void;
}) {
  const C = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={modal.backdrop} onPress={onClose} />
      <View style={[modal.sheet, { paddingBottom: insets.bottom + 16, backgroundColor: C.card }]}>
        <View style={[modal.handle, { backgroundColor: C.border }]} />
        <Text style={[modal.title, { color: C.text }]}>
          {lang === "fr" ? "Distance maximale" : "Maximum distance"}
        </Text>
        {!hasLocation && (
          <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
            <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 8 }}>
              {lang === "fr"
                ? "Active la géolocalisation pour filtrer par distance."
                : "Enable location to filter by distance."}
            </Text>
            <TouchableOpacity
              onPress={() => { onRequestLocation(); }}
              style={{
                alignSelf: "flex-start",
                flexDirection: "row", alignItems: "center", gap: 6,
                backgroundColor: C.lavender + "22",
                borderColor: C.lavender, borderWidth: 1,
                paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
              }}
            >
              <Ionicons name="locate" size={14} color={C.lavender} />
              <Text style={{ color: C.lavender, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                {lang === "fr" ? "Activer ma position" : "Enable my location"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <FlatList
          data={DISTANCE_OPTIONS}
          keyExtractor={(o) => String(o.value ?? "any")}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const active = item.value === selected;
            const disabled = !hasLocation && item.value !== null;
            return (
              <TouchableOpacity
                disabled={disabled}
                style={[
                  modal.item,
                  active && { backgroundColor: C.lavender + "18" },
                  { borderBottomColor: C.border, opacity: disabled ? 0.4 : 1 },
                ]}
                onPress={() => { onSelect(item.value); onClose(); }}
              >
                <Text style={modal.emoji}>{item.value == null ? "🌐" : "📏"}</Text>
                <Text style={[modal.cityName, { color: active ? C.lavender : C.text }]}>
                  {lang === "fr" ? item.labelFr : item.labelEn}
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
  const [distanceModalOpen, setDistanceModalOpen] = useState(false);
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null);
  const [apiVenues, setApiVenues] = useState<Venue[]>([]);
  const [userLocation, setUserLocation] = useState<UserCoords>(null);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "requesting" | "granted" | "denied" | "error"
  >("idle");
  const mapRef = React.useRef<MapWebViewHandle>(null);

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

  /* ─── Request user location on mount ──────────────────────────────────── */
  const requestUserLocation = useCallback(async (silent = false) => {
    try {
      setLocationStatus("requesting");
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationStatus("denied");
        return null;
      }
      setLocationStatus("granted");
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords: UserCoords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? null,
      };
      setUserLocation(coords);
      return coords;
    } catch (e) {
      if (!silent) console.warn("location error", e);
      setLocationStatus("error");
      return null;
    }
  }, []);

  useEffect(() => {
    requestUserLocation(true);
  }, [requestUserLocation]);

  const filteredVenues = useMemo(() => {
    return apiVenues.filter((v) => {
      const cityObj = MOCK_CITIES.find((c) => c.id === selectedCity);
      const matchCity =
        !selectedCity ||
        v.city.toLowerCase() === selectedCity.toLowerCase() ||
        (cityObj?.name && v.city === cityObj.name);
      const matchType = !selectedType || v.type === selectedType;
      // Distance filter: only applied when location is available AND a max is set
      let matchDistance = true;
      if (maxDistanceKm != null && userLocation && v.latitude != null && v.longitude != null) {
        const d = haversineKm(userLocation.lat, userLocation.lng, v.latitude, v.longitude);
        matchDistance = d <= maxDistanceKm;
      }
      return matchCity && matchType && matchDistance;
    });
  }, [apiVenues, selectedCity, selectedType, maxDistanceKm, userLocation]);

  /* ─── Compute distance + sort nearest-first when location available ─── */
  const venuesWithDistance = useMemo(() => {
    if (!userLocation) {
      return filteredVenues.map((v) => ({ venue: v, distanceKm: null as number | null }));
    }
    return filteredVenues
      .map((v) => ({
        venue: v,
        distanceKm:
          v.latitude != null && v.longitude != null
            ? haversineKm(userLocation.lat, userLocation.lng, v.latitude, v.longitude)
            : null,
      }))
      .sort((a, b) => {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
  }, [filteredVenues, userLocation]);

  const htmlContent = useMemo(() => {
    return buildLeafletHtml(filteredVenues, selectedVenue?.id ?? "", userLocation);
    // selectedVenue intentionally omitted: we drive selection via postMessage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredVenues, userLocation]);

  const handleMessage = useCallback((data: any) => {
    let parsed: any;
    try { parsed = typeof data === "string" ? JSON.parse(data) : data; } catch { return; }
    if (parsed?.type === "venueSelected") {
      const v = apiVenues.find((x) => x.id === parsed.venueId);
      if (v) setSelectedVenue(v);
    }
  }, [apiVenues]);

  const flyTo = (venue: Venue) => {
    setSelectedVenue(venue);
    mapRef.current?.postMessage({ type: "flyToVenue", venueId: venue.id });
  };

  const flyToUser = useCallback(async () => {
    let loc = userLocation;
    if (!loc) {
      loc = await requestUserLocation();
    }
    if (loc) {
      // Send the location AND fly in one message — works whether or not the
      // WebView's HTML already had the user marker. Avoids race conditions
      // because the handler will create the marker if needed before flying.
      mapRef.current?.postMessage({
        type: "setUserLocation",
        loc,
        fly: true,
        zoom: 15,
      });
    }
  }, [userLocation, requestUserLocation]);

  const resetFilter = () => {
    setSelectedCity("");
    setSelectedType("");
    setMaxDistanceKm(null);
    setSelectedVenue(null);
    setMapKey((k) => k + 1);
  };

  const distanceLabel = useMemo(() => {
    if (maxDistanceKm == null) return null;
    return `≤ ${maxDistanceKm} km`;
  }, [maxDistanceKm]);

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
          {(selectedCity || selectedType || maxDistanceKm != null) && (
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

          {/* Distance button — always visible (max 50 km) */}
          <TouchableOpacity
            style={[
              styles.villesBtn,
              {
                backgroundColor: maxDistanceKm != null ? C.lavender : C.card,
                borderColor: maxDistanceKm != null ? C.lavender : C.border,
              },
            ]}
            onPress={() => setDistanceModalOpen(true)}
          >
            <Ionicons
              name="resize"
              size={14}
              color={maxDistanceKm != null ? C.bg : C.gold}
            />
            <Text style={[styles.villesBtnText, { color: maxDistanceKm != null ? C.bg : C.text }]}>
              {distanceLabel ?? (lang === "fr" ? "Distance" : "Distance")}
            </Text>
            <Ionicons
              name="chevron-down"
              size={12}
              color={maxDistanceKm != null ? C.bg : C.textMuted}
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

      {/* Distance picker modal */}
      <DistancePickerModal
        visible={distanceModalOpen}
        selected={maxDistanceKm}
        hasLocation={!!userLocation}
        lang={lang}
        onClose={() => setDistanceModalOpen(false)}
        onSelect={setMaxDistanceKm}
        onRequestLocation={() => requestUserLocation()}
      />

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapWebView
          ref={mapRef}
          key={`${mapKey}-${filteredVenues.map((v) => v.id).join(",")}-${userLocation ? "u" : "n"}`}
          htmlContent={htmlContent}
          style={styles.map}
          onMessage={handleMessage}
        />

        {/* Locate-me floating button */}
        <TouchableOpacity
          style={[
            styles.locateBtn,
            {
              backgroundColor: C.card,
              borderColor: userLocation ? C.lavender : C.border,
              top: selectedVenue ? 156 : 12,
            },
          ]}
          onPress={flyToUser}
          activeOpacity={0.8}
          accessibilityLabel={lang === "fr" ? "Me localiser" : "Locate me"}
        >
          {locationStatus === "requesting" ? (
            <ActivityIndicator size="small" color={C.lavender} />
          ) : (
            <Ionicons
              name={
                locationStatus === "denied" || locationStatus === "error"
                  ? "locate-outline"
                  : "locate"
              }
              size={20}
              color={userLocation ? C.lavender : C.gold}
            />
          )}
        </TouchableOpacity>

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
              onPress={() => safePush(`/venue/${selectedVenue.id}` as any)}
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
          items={venuesWithDistance}
          selectedVenue={selectedVenue}
          lang={lang}
          hasUserLocation={!!userLocation}
          onSelect={flyTo}
        />
      </View>
    </View>
  );
}

type VenueWithDistance = { venue: Venue; distanceKm: number | null };

function VenueList({
  items, selectedVenue, lang, hasUserLocation, onSelect,
}: {
  items: VenueWithDistance[];
  selectedVenue: Venue | null;
  lang: string;
  hasUserLocation: boolean;
  onSelect: (v: Venue) => void;
}) {
  const [open, setOpen] = useState(false);
  const C = useColors();

  const title = hasUserLocation
    ? lang === "fr" ? "Près de vous" : "Nearby"
    : lang === "fr" ? "Liste" : "List";

  return (
    <View style={[list.container, { backgroundColor: C.card, borderColor: C.border }]}>
      <TouchableOpacity style={list.toggle} onPress={() => setOpen(!open)}>
        <Ionicons
          name={hasUserLocation ? "navigate" : "list"}
          size={16}
          color={hasUserLocation ? C.lavender : C.text}
        />
        <Text style={[list.toggleText, { color: C.text }]}>
          {title} ({items.length})
        </Text>
        <Ionicons name={open ? "chevron-down" : "chevron-up"} size={14} color={C.textMuted} />
      </TouchableOpacity>
      {open && (
        <ScrollView style={list.scroll} showsVerticalScrollIndicator={false}>
          {items.map(({ venue: v, distanceKm }) => {
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
                  <Text style={[list.itemSub, { color: C.textMuted }]} numberOfLines={1}>
                    {v.city} · {v.type}
                  </Text>
                </View>
                {distanceKm != null && (
                  <View style={[list.distBadge, { backgroundColor: C.lavender + "1f", borderColor: C.lavender + "44" }]}>
                    <Text style={[list.distText, { color: C.lavender }]}>
                      {formatDistance(distanceKm, lang)}
                    </Text>
                  </View>
                )}
                {v.isVerified && distanceKm == null && (
                  <Ionicons name="checkmark-circle" size={14} color={C.gold} />
                )}
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
  itemInfo: { flex: 1, gap: 2, minWidth: 0 },
  itemName: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  itemSub: { fontSize: 10, fontFamily: "Inter_400Regular" },
  distBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 0,
  },
  distText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
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

  locateBtn: {
    position: "absolute",
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
