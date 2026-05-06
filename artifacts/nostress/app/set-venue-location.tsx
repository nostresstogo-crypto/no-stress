import React, { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { useApp, useColors } from "@/context/AppContext";

export default function SetVenueLocationScreen() {
  const { user, lang, token, authFetch, addNotification } = useApp();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const isFr = lang === "fr";
  const styles = makeStyles(C);

  const params = useLocalSearchParams<{ venueId?: string; name?: string }>();
  const venueId = typeof params.venueId === "string" ? params.venueId : "";
  const venueName = typeof params.name === "string" ? params.name : "";

  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
    : "/api";

  const requestAndCapture = async () => {
    setError("");
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLoading(false);
        Alert.alert(
          isFr ? "Autorisation refusée" : "Permission denied",
          isFr ? "Activez la localisation dans les réglages." : "Enable location in your settings.",
          [
            { text: isFr ? "Annuler" : "Cancel", style: "cancel" },
            { text: isFr ? "Ouvrir Réglages" : "Open Settings", onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoords({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
    } catch (e: any) {
      setError(isFr ? "Impossible de récupérer la position." : "Could not get location.");
    } finally {
      setLoading(false);
    }
  };

  const submitLocation = async () => {
    if (!coords || !token || !venueId) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await authFetch(`${API_BASE}/partners/me/venues/${venueId}/location`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || (isFr ? "Erreur lors de l'enregistrement." : "Save error."));
        return;
      }
      addNotification({
        title: "Venue GPS saved",
        titleFr: "Position du lieu enregistrée",
        body: "Your venue is now placed on the map.",
        bodyFr: "Votre lieu est maintenant placé sur la carte.",
      });
      router.back();
    } catch {
      setError(isFr ? "Erreur réseau." : "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || user.role !== "structure" || !venueId) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.center}>
          <Text style={styles.errText}>
            {isFr ? "Lieu introuvable." : "Venue not found."}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isFr ? "Position du lieu" : "Venue location"}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconBubble}>
          <Ionicons name="location" size={42} color={C.gold} />
        </View>

        <Text style={styles.h1}>
          {venueName || (isFr ? "Activez la position GPS" : "Enable GPS position")}
        </Text>
        <Text style={styles.intro}>
          {isFr
            ? "Placez-vous à l'emplacement physique de ce lieu puis appuyez sur le bouton."
            : "Stand at the physical location of this venue, then tap the button."}
        </Text>

        <TouchableOpacity
          style={[styles.captureBtn, loading && { opacity: 0.6 }]}
          onPress={requestAndCapture}
          disabled={loading || submitting}
          activeOpacity={0.8}
        >
          {loading ? (
            <>
              <ActivityIndicator color={C.bg} />
              <Text style={styles.captureBtnText}>
                {isFr ? "Localisation…" : "Locating…"}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="navigate" size={20} color={C.bg} />
              <Text style={styles.captureBtnText}>
                {coords
                  ? (isFr ? "Recapturer" : "Recapture")
                  : (isFr ? "Utiliser ma position" : "Use my location")}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {coords && (
          <View style={styles.coordCard}>
            <View style={styles.coordRow}>
              <Ionicons name="checkmark-circle" size={20} color={C.success} />
              <Text style={styles.coordTitle}>
                {isFr ? "Position capturée" : "Position captured"}
              </Text>
            </View>
            <Text style={styles.coordValue}>Lat: {coords.latitude.toFixed(6)}</Text>
            <Text style={styles.coordValue}>Lng: {coords.longitude.toFixed(6)}</Text>
            {coords.accuracy != null && (
              <Text style={styles.accuracy}>
                {isFr ? "Précision" : "Accuracy"} : ±{Math.round(coords.accuracy)} m
              </Text>
            )}
          </View>
        )}

        {!!error && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={16} color={C.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {coords && (
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={submitLocation}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <Text style={styles.submitBtnText}>
                {isFr ? "Enregistrement…" : "Saving…"}
              </Text>
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color={C.bg} />
                <Text style={styles.submitBtnText}>
                  {isFr ? "Confirmer cette position" : "Confirm this position"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {Platform.OS === "web" && (
          <Text style={styles.webNote}>
            {isFr
              ? "ℹ️ Sur le navigateur, la position peut être moins précise."
              : "ℹ️ On the browser, location may be less accurate."}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 16, fontFamily: "Inter_700Bold", color: C.text, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  errText: { color: C.error, fontSize: 14, textAlign: "center" },
  iconBubble: {
    alignSelf: "center", width: 84, height: 84, borderRadius: 42,
    backgroundColor: C.gold + "1A", borderWidth: 1, borderColor: C.gold + "44",
    alignItems: "center", justifyContent: "center", marginTop: 20, marginBottom: 16,
  },
  h1: { fontSize: 22, fontFamily: "Inter_700Bold", color: C.text, textAlign: "center", marginBottom: 10 },
  intro: { fontSize: 14, lineHeight: 21, color: C.textMuted, textAlign: "center", fontFamily: "Inter_400Regular", marginBottom: 22 },
  captureBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: C.gold, borderRadius: 14, paddingVertical: 16,
  },
  captureBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.bg },
  coordCard: {
    marginTop: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 16,
  },
  coordRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  coordTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: C.success },
  coordValue: { fontSize: 14, color: C.text, fontFamily: "Inter_400Regular", marginBottom: 4 },
  accuracy: { fontSize: 12, color: C.textMuted, marginTop: 6, fontFamily: "Inter_400Regular" },
  errorRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.error + "22", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 14,
  },
  errorText: { fontSize: 13, color: C.error, fontFamily: "Inter_400Regular", flex: 1 },
  submitBtn: {
    marginTop: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: C.lavender, borderRadius: 14, paddingVertical: 16,
  },
  submitBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.bg },
  webNote: { marginTop: 18, fontSize: 12, color: C.textMuted, lineHeight: 18, fontFamily: "Inter_400Regular", textAlign: "center" },
});
