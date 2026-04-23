import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { safeReplace } from "@/lib/navigation";

import { useApp, useColors } from "@/context/AppContext";

export default function VerifyEmailScreen() {
  const { user, setUser, token, lang, authFetch } = useApp();
  const C = useColors();
  const insets = useSafeAreaInsets();

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

  const handleVerify = async () => {
    setError("");
    setInfo("");
    if (!code || code.length !== 6) {
      setError(fr ? "Saisissez le code à 6 chiffres." : "Enter the 6-digit code.");
      return;
    }
    if (!token) {
      setError(fr ? "Session expirée. Reconnectez-vous." : "Session expired. Please log in again.");
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || (fr ? "Code invalide." : "Invalid code."));
      } else {
        if (data.user) await setUser(data.user);
        setInfo(fr ? "Email vérifié !" : "Email verified!");
        setTimeout(() => safeReplace("/(tabs)"), 800);
      }
    } catch {
      setError(fr ? "Erreur réseau." : "Network error.");
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setError("");
    setInfo("");
    if (!token) {
      setError(fr ? "Session expirée." : "Session expired.");
      return;
    }
    setResending(true);
    try {
      const res = await authFetch(`${API_BASE}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
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
          <Text style={styles.email}>{user?.email || ""}</Text>
        </Text>

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

        <TouchableOpacity style={styles.linkBtn} onPress={() => safeReplace("/(tabs)")}>
          <Text style={[styles.linkText, { color: C.textMuted }]}>
            {fr ? "Plus tard" : "Later"}
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
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.textMuted, textAlign: "center", lineHeight: 22, marginBottom: 28 },
  email: { color: C.lavender, fontFamily: "Inter_600SemiBold" },
  codeInput: { width: "100%", maxWidth: 320, fontSize: 28, letterSpacing: 12, fontFamily: "Inter_700Bold", color: C.text, backgroundColor: C.surface, borderRadius: 14, paddingVertical: 18, marginBottom: 16, borderWidth: 1, borderColor: C.border || "#2a2c4a" },
  error: { color: "#ff7a7a", fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 12, textAlign: "center" },
  info: { color: "#6acf9c", fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 12, textAlign: "center" },
  primaryBtn: { width: "100%", maxWidth: 320, backgroundColor: C.lavender, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 6 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  linkBtn: { paddingVertical: 14 },
  linkText: { color: C.lavender, fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
