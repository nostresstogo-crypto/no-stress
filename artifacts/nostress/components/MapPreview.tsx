import React from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/constants/colors";

type Props = {
  latitude: number;
  longitude: number;
  zoom?: number;
  height?: number;
  borderRadius?: number;
  showOpenLink?: boolean;
};

function bbox(lat: number, lng: number, delta = 0.005) {
  return `${(lng - delta).toFixed(6)},${(lat - delta).toFixed(6)},${(lng + delta).toFixed(6)},${(lat + delta).toFixed(6)}`;
}

export function osmEmbedUrl(lat: number, lng: number, delta = 0.005) {
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox(lat, lng, delta)}&layer=mapnik&marker=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export function osmFullUrl(lat: number, lng: number, zoom = 16) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
}

export default function MapPreview({
  latitude,
  longitude,
  zoom = 16,
  height = 200,
  borderRadius = 12,
  showOpenLink = true,
}: Props) {
  if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) {
    return null;
  }

  // delta inversely proportional to zoom: zoom 16 ~ delta 0.005
  const delta = 0.005 * Math.pow(2, 16 - zoom);
  const embedUrl = osmEmbedUrl(latitude, longitude, delta);
  const fullUrl = osmFullUrl(latitude, longitude, zoom);

  let mapNode: React.ReactNode = null;

  if (Platform.OS === "web") {
    mapNode = (
      // @ts-ignore
      <iframe
        src={embedUrl}
        style={{
          width: "100%",
          height: `${height}px`,
          border: 0,
          display: "block",
        }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    );
  } else {
    // Lazy import WebView so web bundle never tries to resolve it.
    let WebView: any = null;
    try {
      WebView = require("react-native-webview").WebView;
    } catch {}
    if (WebView) {
      mapNode = (
        <WebView
          source={{ uri: embedUrl }}
          style={{ width: "100%", height }}
          javaScriptEnabled
          domStorageEnabled
          scalesPageToFit
          startInLoadingState
          originWhitelist={["*"]}
        />
      );
    } else {
      mapNode = (
        <View style={[styles.fallback, { height }]}>
          <Ionicons name="map" size={28} color={C.lavender} />
          <Text style={styles.fallbackText}>{`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}</Text>
        </View>
      );
    }
  }

  return (
    <View style={[styles.container, { borderRadius }]}>
      <View style={[styles.mapWrap, { height, borderRadius }]}>{mapNode}</View>
      {showOpenLink ? (
        <Pressable
          onPress={() => Linking.openURL(fullUrl)}
          accessibilityRole="link"
          accessibilityLabel="Open in OpenStreetMap"
          style={styles.openLink}
        >
          <Ionicons name="open-outline" size={14} color={C.lavender} />
          <Text style={styles.openLinkText}>OpenStreetMap</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  mapWrap: {
    overflow: "hidden",
    width: "100%",
  },
  openLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-end",
  },
  openLinkText: { fontSize: 12, color: C.lavender, fontWeight: "600" },
  fallback: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.card,
  },
  fallbackText: { fontSize: 12, color: C.textMuted },
});
