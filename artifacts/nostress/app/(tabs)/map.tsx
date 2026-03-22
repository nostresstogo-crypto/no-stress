import React, { useState, useMemo, useCallback } from "react";
import {
  Animated,
  Platform,
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
import { MOCK_VENUES, VENUE_TYPES, MOCK_CITIES } from "@/constants/data";
import { MapWebView } from "@/components/MapWebView";
import { router } from "expo-router";

type Venue = (typeof MOCK_VENUES)[0];

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

  const navColor = "#0E1120";
  const gold = "#D4AF37";
  const lavender = "#9B8FE8";
  const cardBg = "#141726";
  const border = "#1F2440";
  const textColor = "#E8E8F0";
  const textMuted = "#6B7099";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; width: 100%; background: ${navColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  #map { width: 100%; height: 100%; }
  .leaflet-container { background: #1a1e32 !important; }
  /* Custom popup */
  .leaflet-popup-content-wrapper {
    background: ${cardBg};
    border: 1px solid ${border};
    border-radius: 14px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    padding: 0;
    min-width: 200px;
  }
  .leaflet-popup-content {
    margin: 0;
    padding: 0;
  }
  .leaflet-popup-tip-container { display: none; }
  .leaflet-popup-close-button { color: ${textMuted} !important; font-size: 16px !important; top: 8px !important; right: 10px !important; }
  .popup-inner {
    padding: 14px 16px;
    color: ${textColor};
  }
  .popup-type {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: ${lavender};
    margin-bottom: 4px;
  }
  .popup-name {
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .popup-address {
    font-size: 12px;
    color: ${textMuted};
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .popup-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: ${gold}22;
    border: 1px solid ${gold}55;
    color: ${gold};
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 6px;
    margin-top: 8px;
  }
  .ns-marker {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    background: ${gold};
    box-shadow: 0 4px 12px rgba(212,175,55,0.5);
    border: 2px solid rgba(255,255,255,0.15);
    cursor: pointer;
    transition: transform 0.15s;
  }
  .ns-marker-inner {
    transform: rotate(45deg);
    font-size: 14px;
    font-weight: 900;
    color: ${navColor};
    letter-spacing: -1px;
  }
  .ns-marker.selected {
    background: ${lavender};
    box-shadow: 0 4px 18px rgba(155,143,232,0.7);
    border-color: rgba(255,255,255,0.3);
    width: 44px;
    height: 44px;
  }
  .ns-marker.selected .ns-marker-inner {
    font-size: 17px;
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
  preferCanvas: true,
}).setView([8, -2], 4);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  maxZoom: 18,
  subdomains: 'abcd',
}).addTo(map);

L.control.zoom({ position: 'topright' }).addTo(map);
L.control.attribution({ prefix: false }).addTo(map);

function createMarkerIcon(venueId) {
  var isSel = venueId === selectedId;
  var size = isSel ? 44 : 36;
  return L.divIcon({
    html: '<div class="ns-marker' + (isSel ? ' selected' : '') + '"><span class="ns-marker-inner">N</span></div>',
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -(size + 4)],
  });
}

var markers = {};
venues.forEach(function(v) {
  var marker = L.marker([v.lat, v.lng], { icon: createMarkerIcon(v.id) });
  marker.venueId = v.id;

  var popupHtml = '<div class="popup-inner">' +
    '<div class="popup-type">' + v.type + '</div>' +
    '<div class="popup-name">' + v.name + '</div>' +
    '<div class="popup-address">📍 ' + v.address + '</div>' +
    (v.isVerified ? '<div class="popup-badge">✓ Vérifié</div>' : '') +
    '</div>';

  marker.bindPopup(popupHtml, { maxWidth: 260, minWidth: 200 });

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
  map.fitBounds(group.getBounds().pad(0.2));
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

export default function MapScreen() {
  const t = useT();
  const C = useColors();
  const { lang, selectedCity, setSelectedCity } = useApp();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const [selectedType, setSelectedType] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const iframeRef = React.useRef<any>(null);

  const filteredVenues = useMemo(() => {
    return MOCK_VENUES.filter((v) => {
      const cityObj = MOCK_CITIES.find((c) => c.id === selectedCity);
      const matchCity =
        !selectedCity ||
        v.city.toLowerCase() === selectedCity.toLowerCase() ||
        (cityObj?.name && v.city === cityObj.name);
      const matchType = !selectedType || v.type === selectedType;
      return matchCity && matchType;
    });
  }, [selectedCity, selectedType]);

  const htmlContent = useMemo(() => {
    return buildLeafletHtml(filteredVenues, selectedVenue?.id ?? "");
  }, [filteredVenues]);

  const handleMessage = useCallback((data: any) => {
    let parsed: any;
    try {
      parsed = typeof data === "string" ? JSON.parse(data) : data;
    } catch {
      return;
    }
    if (parsed?.type === "venueSelected") {
      const v = MOCK_VENUES.find((x) => x.id === parsed.venueId);
      if (v) setSelectedVenue(v);
    }
  }, []);

  const flyTo = (venue: Venue) => {
    setSelectedVenue(venue);
  };

  const resetFilter = () => {
    setSelectedCity("");
    setSelectedType("");
    setSelectedVenue(null);
    setMapKey((k) => k + 1);
  };

  const filterLabel = useMemo(() => {
    if (selectedCity) {
      const cityObj = MOCK_CITIES.find((c) => c.id === selectedCity);
      return cityObj?.name ?? selectedCity;
    }
    return null;
  }, [selectedCity]);

  return (
    <View style={styles.root}>
      {/* Top header */}
      <View style={[styles.header, { paddingTop: topInset + 10 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>
              {lang === "fr" ? "Carte des Lieux" : "Venues Map"}
            </Text>
            <Text style={styles.headerSub}>
              {filteredVenues.length}{" "}
              {lang === "fr"
                ? filteredVenues.length > 1 ? "lieux" : "lieu"
                : filteredVenues.length > 1 ? "venues" : "venue"}
              {filterLabel ? ` · ${filterLabel}` : ""}
            </Text>
          </View>
          {(selectedCity || selectedType) && (
            <TouchableOpacity style={styles.resetBtn} onPress={resetFilter}>
              <Ionicons name="refresh" size={14} color={C.lavender} />
              <Text style={styles.resetBtnText}>
                {lang === "fr" ? "Tout voir" : "Show all"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* City pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pills}
        >
          <TouchableOpacity
            style={[styles.pill, !selectedCity && styles.pillActive]}
            onPress={() => setSelectedCity("")}
          >
            <Ionicons
              name="globe-outline"
              size={12}
              color={!selectedCity ? C.bg : C.textMuted}
            />
            <Text style={[styles.pillText, !selectedCity && styles.pillTextActive]}>
              {lang === "fr" ? "Tous" : "All"}
            </Text>
          </TouchableOpacity>
          {MOCK_CITIES.map((city) => {
            const active = selectedCity === city.id;
            return (
              <TouchableOpacity
                key={city.id}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setSelectedCity(active ? "" : city.id)}
              >
                <Text style={styles.pillEmoji}>{city.emoji}</Text>
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {city.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Type pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.pills, { paddingBottom: 2 }]}
        >
          <TouchableOpacity
            style={[styles.typePill, !selectedType && styles.typePillActive]}
            onPress={() => setSelectedType("")}
          >
            <Text style={[styles.typePillText, !selectedType && styles.typePillTextActive]}>
              {t("allTypes")}
            </Text>
          </TouchableOpacity>
          {VENUE_TYPES.map((type) => {
            const active = selectedType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.typePill, active && styles.typePillActive]}
                onPress={() => setSelectedType(active ? "" : type)}
              >
                <Text style={[styles.typePillText, active && styles.typePillTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

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
          <View style={styles.venueCard}>
            <TouchableOpacity
              style={styles.venueCardClose}
              onPress={() => setSelectedVenue(null)}
            >
              <Ionicons name="close" size={16} color={C.textMuted} />
            </TouchableOpacity>

            <View style={styles.venueCardContent}>
              <View style={styles.venueCardLeft}>
                <View style={styles.venueMarkerIcon}>
                  <Text style={styles.venueMarkerLetter}>N</Text>
                </View>
              </View>
              <View style={styles.venueCardInfo}>
                <View style={styles.venueNameRow}>
                  <Text style={styles.venueName} numberOfLines={1}>
                    {selectedVenue.name}
                  </Text>
                  {selectedVenue.isVerified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={C.gold} />
                    </View>
                  )}
                </View>
                <View style={styles.venueTypePill}>
                  <Text style={styles.venueType}>{selectedVenue.type}</Text>
                </View>
                <View style={styles.venueAddressRow}>
                  <Ionicons name="location-outline" size={12} color={C.textMuted} />
                  <Text style={styles.venueAddress} numberOfLines={1}>
                    {selectedVenue.address}
                  </Text>
                </View>
              </View>
            </View>

            {/* Details button */}
            <TouchableOpacity
              style={styles.detailsBtn}
              onPress={() => router.push(`/venue/${selectedVenue.id}` as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.detailsBtnText}>
                {lang === "fr" ? "Voir les détails" : "View details"}
              </Text>
              <Ionicons name="arrow-forward" size={15} color={C.bg} />
            </TouchableOpacity>
          </View>
        )}

        {/* Floating venue list toggle */}
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
  venues,
  selectedVenue,
  lang,
  onSelect,
}: {
  venues: Venue[];
  selectedVenue: Venue | null;
  lang: string;
  onSelect: (v: Venue) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={list.container}>
      <TouchableOpacity style={list.toggle} onPress={() => setOpen(!open)}>
        <Ionicons name="list" size={16} color={C.text} />
        <Text style={list.toggleText}>
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
                style={[list.item, active && list.itemActive]}
                onPress={() => { onSelect(v); setOpen(false); }}
              >
                <View style={[list.dot, { backgroundColor: active ? C.gold : C.lavender }]} />
                <View style={list.itemInfo}>
                  <Text style={list.itemName} numberOfLines={1}>{v.name}</Text>
                  <Text style={list.itemSub}>{v.city} · {v.type}</Text>
                </View>
                {v.isVerified && (
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
    position: "absolute",
    bottom: 12,
    left: 12,
    width: 220,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    maxHeight: 280,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
  },
  toggleText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  scroll: { maxHeight: 220 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  itemActive: { backgroundColor: C.gold + "10" },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  itemInfo: { flex: 1, gap: 2 },
  itemName: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  itemSub: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    backgroundColor: C.bg,
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 10,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    marginTop: 2,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.lavender + "18",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.lavender + "44",
  },
  resetBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: C.lavender,
  },
  pills: {
    gap: 6,
    paddingRight: 20,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  pillActive: {
    backgroundColor: C.lavender,
    borderColor: C.lavender,
  },
  pillEmoji: { fontSize: 13 },
  pillText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: C.text,
  },
  pillTextActive: {
    color: C.bg,
    fontFamily: "Inter_600SemiBold",
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  typePillActive: {
    backgroundColor: C.gold + "22",
    borderColor: C.gold,
  },
  typePillText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
  },
  typePillTextActive: {
    color: C.gold,
    fontFamily: "Inter_600SemiBold",
  },

  mapContainer: { flex: 1, position: "relative" },
  map: { flex: 1 },

  venueCard: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  venueCardClose: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.border,
    borderRadius: 12,
    zIndex: 1,
  },
  venueCardContent: { flexDirection: "row", gap: 12, alignItems: "center" },
  venueCardLeft: {},
  venueMarkerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.gold,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  venueMarkerLetter: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: C.bg,
  },
  venueCardInfo: { flex: 1, gap: 4 },
  venueNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  venueName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: C.text,
    flex: 1,
  },
  verifiedBadge: {},
  venueTypePill: {
    alignSelf: "flex-start",
    backgroundColor: C.lavender + "18",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: C.lavender + "40",
  },
  venueType: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: C.lavender,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  venueAddressRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  venueAddress: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    flex: 1,
  },
  detailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.lavender,
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 10,
  },
  detailsBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: C.bg,
  },
});
