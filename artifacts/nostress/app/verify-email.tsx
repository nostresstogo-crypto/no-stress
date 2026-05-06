import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { safeReplace } from "@/lib/navigation";

import { useApp, useColors } from "@/context/AppContext";

type VerifyRole = "user" | "partner";

export default function VerifyEmailScreen() {
  const { setUser, setSession, lang, addNotification } = useApp();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string; role?: string }>();
  const targetEmail = String(params.email || "").trim();
  const role: VerifyRole = params.role === "partner" ? "partner" : "user";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
    : "/api";

  const fr = lang === "fr";
  const styles = makeStyles(C);

  const verifyEndpoint = role === "partner"
    ? `${API_BASE}/partners/verify-email`
    : `${API_BASE}/auth/verify-email`;
  const resendEndpoint = role === "partner"
    ? `${API_BASE}/partners/resend-verification`
    : `${API_BASE}/auth/resend-verification`;

  const handleVerify = async () => {
    setError("");
    setInfo("");
    if (!targetEmail) {
      setError(fr ? "Email manquant. Recommencez l'inscription." : "Email missing. Restart registration.");
      return;
    }
    if (!code || code.length !== 6) {
      setError(fr ? "Saisissez le code à 6 chiffres." : "Enter the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(verifyEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || (fr ? "Code invalide." : "Invalid code."));
        setLoading(false);
        return;
      }
      if (role === "partner") {
        // Partner verified email but cannot log in until admin approval
        addNotification({
          title: "Email verified",
          titleFr: "Email vérifié",
          body: "Your account is pending admin approval. You will be notified by email.",
          bodyFr: "Votre compte est en attente d'approbation par l'administrateur. Vous serez notifié par email.",
        });
        router.replace({ pathname: "/partner-pending", params: { email: targetEmail } });
      } else {
        // User verified — session issued by API
        if (data.user) await setUser(data.user);
        if (data.token) await setSession(data.token, data.refreshToken || null);
        setInfo(fr ? "Email vérifié !" : "Email verified!");
        setTimeout(() => safeReplace("/(tabs)"), 600);
      }
    } catch {
      setError(fr ? "Erreur réseau." : "Network error.");
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setError("");
    setInfo("");
    if (!targetEmail) {
      setError(fr ? "Email manquant." : "Email missing.");
      return;
    }
    setResending(true);
    try {
      const res = await fetch(resendEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || (fr ? "Erreur d'envoi." : "Failed to send."));
      } else {
        setInfo(fr ? "Nouveau code envoyé." : "New code sent.");
      }
    } catch {
      setError(fr ? "Erreur réseau." : "Network error.");
    }
    setResending(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>

        <View style={styles.iconCircle}>
          <Ionicons name="mail-unread" size={40} color={C.lavender} />
        </View>

        <Text style={styles.title}>{fr ? "Vérifiez votre email" : "Verify your email"}</Text>
        <Text style={styles.subtitle}>
          {fr ? "Un code à 6 chiffres a été envoyé à" : "A 6-digit code was sent to"}{" "}
          <Text style={styles.email}>{targetEmail || (fr ? "votre adresse email" : "your email")}</Text>
        </Text>

        {role === "partner" && (
          <View style={styles.partnerBanner}>
            <Ionicons name="business-outline" size={16} color={C.gold} />
            <Text style={styles.partnerBannerText}>
              {fr
                ? "Après vérification, votre compte sera examiné par l'administrateur (24-48h)."
                : "After verification, your account will be reviewed by the administrator (24-48h)."}
            </Text>
          </View>
        )}

        <TextInput
          style={styles.codeInput}
          value={code}
          onChangeText={(v) => setCode(v.replace(/[^0-9]/g, "").slice(0, 6))}
          placeholder="000000"
          placeholderTextColor={C.textMuted}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          textAlign="center"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {info ? <Text style={styles.info}>{info}</Text> : null}

        <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.6 }]} onPress={handleVerify} disabled={loading}>
          <Text style={styles.primaryBtnText}>{loading ? (fr ? "Vérification…" : "Verifying…") : (fr ? "Vérifier" : "Verify")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkBtn} onPress={handleResend} disabled={resending}>
          <Text style={styles.linkText}>
            {resending ? (fr ? "Envoi…" : "Sending…") : (fr ? "Renvoyer le code" : "Resend code")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (C: any) => StyleSheet.create({
  root: { flexGrow: 1, paddingHorizontal: 28, alignItems: "center" },
  backBtn: { alignSelf: "flex-start", padding: 6, marginBottom: 12 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.lavender + "22", alignItems: "center", justifyContent: "center", marginTop: 12, marginBottom: 20 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: C.text, textAlign: "center", marginBottom: 10 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.textMuted, textAlign: "center", lineHeight: 22, marginBottom: 20 },
  email: { color: C.lavender, fontFamily: "Inter_600SemiBold" },
  partnerBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: C.gold + "15", borderRadius: 12, borderWidth: 1, borderColor: C.gold + "44", padding: 12, width: "100%", maxWidth: 380, marginBottom: 18 },
  partnerBannerText: { color: C.gold, fontSize: 12, lineHeight: 17, fontFamily: "Inter_500Medium", flex: 1 },
  codeInput: { width: "100%", maxWidth: 320, fontSize: 28, letterSpacing: 12, fontFamily: "Inter_700Bold", color: C.text, backgroundColor: C.surface, borderRadius: 14, paddingVertical: 18, marginBottom: 16, borderWidth: 1, borderColor: C.border || "#2a2c4a" },
  error: { color: "#ff7a7a", fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 12, textAlign: "center" },
  info: { color: "#6acf9c", fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 12, textAlign: "center" },
  primaryBtn: { width: "100%", maxWidth: 320, backgroundColor: C.lavender, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 6 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  linkBtn: { paddingVertical: 14 },
  linkText: { color: C.lavender, fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
