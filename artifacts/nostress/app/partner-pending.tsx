import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { useApp, useColors } from "@/context/AppContext";

export default function PartnerPendingScreen() {
  const { lang } = useApp();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string }>();
  const fr = lang === "fr";
  const email = String(params.email || "").trim();
  const styles = makeStyles(C);

  return (
    <ScrollView
      contentContainerStyle={[styles.root, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.iconCircle}>
        <Ionicons name="hourglass-outline" size={48} color={C.gold} />
      </View>

      <Text style={styles.title}>
        {fr ? "Compte en attente d'approbation" : "Account pending approval"}
      </Text>

      <Text style={styles.subtitle}>
        {fr
          ? "Merci ! Votre adresse email a bien été vérifiée. Notre équipe va maintenant examiner votre demande de compte partenaire."
          : "Thanks! Your email is verified. Our team will now review your partner account request."}
      </Text>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={[styles.bullet, { backgroundColor: C.gold + "33" }]}>
            <Text style={[styles.bulletText, { color: C.gold }]}>1</Text>
          </View>
          <Text style={styles.cardText}>
            {fr
              ? "Validation de votre dossier sous 24 à 48h."
              : "Your file is reviewed within 24 to 48 hours."}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <View style={[styles.bullet, { backgroundColor: C.gold + "33" }]}>
            <Text style={[styles.bulletText, { color: C.gold }]}>2</Text>
          </View>
          <Text style={styles.cardText}>
            {fr
              ? "Vous recevrez un email avec votre mot de passe sécurisé."
              : "You will receive an email with your secure password."}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <View style={[styles.bullet, { backgroundColor: C.gold + "33" }]}>
            <Text style={[styles.bulletText, { color: C.gold }]}>3</Text>
          </View>
          <Text style={styles.cardText}>
            {fr
              ? "Connectez-vous avec ce mot de passe pour accéder à votre tableau de bord."
              : "Log in with that password to access your dashboard."}
          </Text>
        </View>
      </View>

      {!!email && (
        <View style={styles.emailBox}>
          <Ionicons name="mail-outline" size={16} color={C.textMuted} />
          <Text style={styles.emailText}>{email}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => router.replace("/(tabs)")}
        activeOpacity={0.85}
      >
        <Ionicons name="home-outline" size={18} color={C.bg} />
        <Text style={styles.primaryBtnText}>{fr ? "Retour à l'accueil" : "Back to home"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (C: any) => StyleSheet.create({
  root: { flexGrow: 1, backgroundColor: C.bg, paddingHorizontal: 28, alignItems: "center" },
  iconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: C.gold + "22", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: C.text, textAlign: "center", marginBottom: 12 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.textMuted, textAlign: "center", lineHeight: 22, marginBottom: 24, maxWidth: 380 },
  card: { width: "100%", maxWidth: 420, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border || "#2a2c4a", padding: 18, marginBottom: 18, gap: 14 },
  cardRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  bullet: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  bulletText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  cardText: { color: C.text, fontFamily: "Inter_400Regular", fontSize: 13.5, lineHeight: 20, flex: 1 },
  emailBox: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border || "#2a2c4a", marginBottom: 24 },
  emailText: { color: C.text, fontSize: 13, fontFamily: "Inter_500Medium" },
  primaryBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.lavender, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  primaryBtnText: { color: C.bg, fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
