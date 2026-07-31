/**
 * NavigationOptionsSheet
 * Bottom sheet premium pour choisir une application de navigation.
 * iOS : Apple Plans, Google Maps (si installé), carte NoStress, Annuler.
 * Android : Google Maps, carte NoStress, Annuler.
 * Web : Google Maps (lien web), Annuler.
 */
import React, { useCallback, useRef } from "react";
import {
  Animated,
  Easing,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useColors } from "@/context/AppContext";

interface NavigationOptionsSheetProps {
  visible: boolean;
  onClose: () => void;
  venue: {
    name: string;
    address?: string;
    city?: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  lang?: "fr" | "en";
}

function buildQuery(venue: NavigationOptionsSheetProps["venue"]): string {
  if (venue.address || venue.city) {
    return encodeURIComponent([venue.name, venue.address, venue.city].filter(Boolean).join(", "));
  }
  return encodeURIComponent(venue.name);
}

export function NavigationOptionsSheet({
  visible,
  onClose,
  venue,
  lang = "fr",
}: NavigationOptionsSheetProps) {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const pressing = useRef(false);

  const hasCoords =
    typeof venue.latitude === "number" &&
    typeof venue.longitude === "number" &&
    !isNaN(venue.latitude!) &&
    !isNaN(venue.longitude!);

  const lat = venue.latitude ?? 0;
  const lng = venue.longitude ?? 0;
  const query = buildQuery(venue);

  /** Safe single-fire wrapper — prevents double-press opening two apps */
  const once = useCallback((fn: () => void) => {
    if (pressing.current) return;
    pressing.current = true;
    fn();
    setTimeout(() => { pressing.current = false; }, 1500);
  }, []);

  const openAppleMaps = useCallback(() => once(() => {
    const url = hasCoords
      ? `maps:?daddr=${lat},${lng}`
      : `maps:?q=${query}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://maps.apple.com/?q=${query}`).catch(() => {});
    });
    onClose();
  }), [hasCoords, lat, lng, query, onClose]);

  const openGoogleMaps = useCallback(() => once(async () => {
    const webUrl = hasCoords
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`;

    if (Platform.OS === "ios") {
      const nativeUrl = hasCoords
        ? `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`
        : `comgooglemaps://?q=${query}`;
      const canOpen = await Linking.canOpenURL("comgooglemaps://").catch(() => false);
      if (canOpen) {
        Linking.openURL(nativeUrl).catch(() => Linking.openURL(webUrl).catch(() => {}));
      } else {
        Linking.openURL(webUrl).catch(() => {});
      }
    } else if (Platform.OS === "android") {
      const nativeUrl = hasCoords
        ? `geo:${lat},${lng}?q=${lat},${lng}(${query})`
        : `geo:0,0?q=${query}`;
      const canOpen = await Linking.canOpenURL(nativeUrl).catch(() => false);
      if (canOpen) {
        Linking.openURL(nativeUrl).catch(() => Linking.openURL(webUrl).catch(() => {}));
      } else {
        Linking.openURL(webUrl).catch(() => {});
      }
    } else {
      Linking.openURL(webUrl).catch(() => {});
    }
    onClose();
  }), [hasCoords, lat, lng, query, onClose]);

  const openNoStressMap = useCallback(() => once(() => {
    onClose();
    setTimeout(() => {
      router.push("/(tabs)/map" as any);
    }, 200);
  }), [onClose]);

  const t = (fr: string, en: string) => lang === "fr" ? fr : en;

  const options: Array<{
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    sublabel?: string;
    color: string;
    onPress: () => void;
    disabled?: boolean;
  }> = [
    ...(Platform.OS === "ios" ? [{
      icon: "map" as const,
      label: t("Ouvrir dans Plans", "Open in Maps"),
      sublabel: t("Apple Plans", "Apple Maps"),
      color: C.lavender,
      onPress: openAppleMaps,
    }] : []),
    {
      icon: "navigate-circle-outline",
      label: "Google Maps",
      sublabel: Platform.OS === "web"
        ? t("Ouvrir dans le navigateur", "Open in browser")
        : t("Application Google Maps", "Google Maps app"),
      color: "#4285F4",
      onPress: openGoogleMaps,
    },
    {
      icon: "location-outline",
      label: t("Carte NoStress", "NoStress Map"),
      sublabel: t("Voir sur la carte intégrée", "View on built-in map"),
      color: C.gold,
      onPress: openNoStressMap,
    },
  ];

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[s.backdrop, { backgroundColor: C.overlay }]}>
          <TouchableWithoutFeedback>
            <View
              style={[
                s.sheet,
                {
                  backgroundColor: C.card,
                  paddingBottom: insets.bottom + 16,
                },
              ]}
            >
              {/* Handle */}
              <View style={[s.handle, { backgroundColor: C.border }]} />

              {/* Title */}
              <Text style={[s.sheetTitle, { color: C.text }]}>
                {t("Choisir un itinéraire", "Choose route")}
              </Text>
              {(venue.address || venue.city) && (
                <Text style={[s.sheetSub, { color: C.textMuted }]} numberOfLines={1}>
                  {[venue.address, venue.city].filter(Boolean).join(", ")}
                </Text>
              )}

              {!hasCoords && (
                <View style={[s.noCoordsBanner, { backgroundColor: C.card2, borderColor: C.border }]}>
                  <Ionicons name="warning-outline" size={14} color={C.textMuted} />
                  <Text style={[s.noCoordsTxt, { color: C.textMuted }]}>
                    {t("Coordonnées GPS non disponibles — navigation par adresse", "No GPS coordinates — navigating by address")}
                  </Text>
                </View>
              )}

              {/* Options */}
              <View style={[s.optionsList, { borderColor: C.border }]}>
                {options.map((opt, i) => (
                  <React.Fragment key={opt.label}>
                    <TouchableOpacity
                      onPress={opt.disabled ? undefined : opt.onPress}
                      activeOpacity={opt.disabled ? 1 : 0.75}
                      style={[s.option, opt.disabled && s.optionDisabled]}
                      accessibilityRole="button"
                      accessibilityLabel={opt.label}
                    >
                      <View style={[s.optionIcon, { backgroundColor: opt.color + "18" }]}>
                        <Ionicons name={opt.icon} size={22} color={opt.disabled ? C.textMuted : opt.color} />
                      </View>
                      <View style={s.optionText}>
                        <Text style={[s.optionLabel, { color: opt.disabled ? C.textMuted : C.text }]}>
                          {opt.label}
                        </Text>
                        {opt.sublabel ? (
                          <Text style={[s.optionSub, { color: C.textMuted }]}>{opt.sublabel}</Text>
                        ) : null}
                      </View>
                      {!opt.disabled && (
                        <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
                      )}
                    </TouchableOpacity>
                    {i < options.length - 1 && (
                      <View style={[s.divider, { backgroundColor: C.border }]} />
                    )}
                  </React.Fragment>
                ))}
              </View>

              {/* Cancel */}
              <TouchableOpacity
                onPress={onClose}
                style={[s.cancelBtn, { backgroundColor: C.card2, borderColor: C.border }]}
                accessibilityRole="button"
                accessibilityLabel={t("Annuler", "Cancel")}
              >
                <Text style={[s.cancelText, { color: C.textMuted }]}>{t("Annuler", "Cancel")}</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 18 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.3 },
  sheetSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4, marginBottom: 4 },

  noCoordsBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, marginTop: 10,
  },
  noCoordsTxt: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },

  optionsList: { borderRadius: 18, borderWidth: 1, overflow: "hidden", marginTop: 16 },
  option: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16, gap: 14 },
  optionDisabled: { opacity: 0.45 },
  optionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  optionSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },

  cancelBtn: {
    marginTop: 12, borderRadius: 18, borderWidth: 1,
    paddingVertical: 16, alignItems: "center",
  },
  cancelText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
