import React, { useEffect, useRef } from "react";
import { Animated, View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { dismissAllAndGoHome } from "@/lib/navigation";

import { useApp, useColors } from "@/context/AppContext";

export default function PartnerPendingScreen() {
  const { lang } = useApp();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const fr = lang === "fr";
  const styles = makeStyles(C);

  const enterAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(enterAnim, {
      toValue: 1,
      tension: 52,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <ScrollView
      contentContainerStyle={[styles.root, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ transform: [{ scale: enterAnim }], opacity: enterAnim }}>
        <View style={styles.iconCircle}>
          <Ionicons name="time-outline" size={48} color={C.gold} />
        </View>
      </Animated.View>

      <Text style={styles.title}>
        {fr ? "Lieu en cours de validation" : "Venue being reviewed"}
      </Text>

      <Text style={styles.subtitle}>
        {fr
          ? "Votre compte est actif ! Notre équipe va examiner votre lieu avant qu'il soit publié sur la plateforme."
          : "Your account is active! Our team will review your venue before it is published on the platform."}
      </Text>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={[styles.bullet, { backgroundColor: C.gold + "33" }]}>
            <Text style={[styles.bulletText, { color: C.gold }]}>1</Text>
          </View>
          <Text style={styles.cardText}>
            {fr
              ? "Validation de votre lieu sous 24 à 48h."
              : "Your venue is reviewed within 24 to 48 hours."}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <View style={[styles.bullet, { backgroundColor: C.gold + "33" }]}>
            <Text style={[styles.bulletText, { color: C.gold }]}>2</Text>
          </View>
          <Text style={styles.cardText}>
            {fr
              ? "Vous serez notifié par email dès que votre lieu est approuvé."
              : "You will be notified by email once your venue is approved."}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <View style={[styles.bullet, { backgroundColor: C.gold + "33" }]}>
            <Text style={[styles.bulletText, { color: C.gold }]}>3</Text>
          </View>
          <Text style={styles.cardText}>
            {fr
              ? "Une fois validé, vous pourrez publier vos événements depuis le tableau de bord."
              : "Once approved, you can publish your events from the dashboard."}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => dismissAllAndGoHome()}
        activeOpacity={0.85}
        accessibilityLabel={fr ? "Accéder au tableau de bord" : "Go to dashboard"}
        accessibilityRole="button"
      >
        <Ionicons name="grid-outline" size={18} color={C.bg} />
        <Text style={styles.primaryBtnText}>{fr ? "Accéder au tableau de bord" : "Go to dashboard"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (C: any) => StyleSheet.create({
  root: { flexGrow: 1, backgroundColor: C.bg, paddingHorizontal: 28, alignItems: "center" },
  iconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: C.gold + "22", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: C.text, textAlign: "center", marginBottom: 12 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.textMuted, textAlign: "center", lineHeight: 22, marginBottom: 24, maxWidth: 380 },
  card: { width: "100%", maxWidth: 420, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 18, marginBottom: 28, gap: 14 },
  cardRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  bullet: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  bulletText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  cardText: { color: C.text, fontFamily: "Inter_400Regular", fontSize: 13.5, lineHeight: 20, flex: 1 },
  primaryBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.lavender, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  primaryBtnText: { color: C.bg, fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
