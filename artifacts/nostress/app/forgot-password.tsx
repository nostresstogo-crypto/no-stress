import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useT, useApp, useColors } from "@/context/AppContext";
import { API_BASE } from "@/lib/apiBase";

type Role = "user" | "partner";

export default function ForgotPasswordScreen() {
  const t = useT();
  const { lang } = useApp();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(C);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const cleanEmail = email.trim().toLowerCase();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

  const handleSubmit = async () => {
    if (!emailValid || loading) return;
    setLoading(true);
    setError("");
    try {
      const path =
        role === "partner"
          ? `${API_BASE}/partners/forgot-password`
          : `${API_BASE}/auth/forgot-password`;
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });
      // Backend always returns 200 with a generic message (no email enumeration).
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data?.error ||
            (lang === "fr"
              ? "Une erreur est survenue. Réessayez."
              : "An error occurred. Try again."),
        );
      } else {
        setDone(true);
      }
    } catch {
      setError(
        lang === "fr"
          ? "Connexion impossible. Vérifiez votre réseau."
          : "Connection failed. Check your network.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.root, { paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {lang === "fr" ? "Mot de passe oublié" : "Forgot password"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {done ? (
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="mail" size={40} color={C.success} />
            </View>
            <Text style={styles.successTitle}>
              {lang === "fr" ? "Email envoyé" : "Email sent"}
            </Text>
            <Text style={styles.successText}>
              {lang === "fr"
                ? "Si un compte correspond à cet email, un nouveau mot de passe à 6 caractères vient d'être envoyé. Vérifiez votre boîte de réception (et le dossier spam)."
                : "If an account matches this email, a new 6-character password has just been sent. Check your inbox (and spam folder)."}
            </Text>
            <TouchableOpacity
              onPress={() => router.replace("/auth")}
              style={[styles.submitBtn, { marginTop: 24 }]}
            >
              <Text style={styles.submitBtnText}>
                {lang === "fr" ? "Retour à la connexion" : "Back to login"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.intro}>
              {lang === "fr"
                ? "Saisissez votre email et le type de compte. Un nouveau mot de passe à 6 caractères vous sera envoyé immédiatement."
                : "Enter your email and account type. A new 6-character password will be sent to you immediately."}
            </Text>

            <Text style={styles.fieldLabel}>
              {lang === "fr" ? "Type de compte" : "Account type"}
            </Text>
            <View style={styles.roleRow}>
              <TouchableOpacity
                onPress={() => setRole("user")}
                style={[
                  styles.roleBtn,
                  role === "user" && styles.roleBtnActive,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={role === "user" ? C.bg : C.text}
                />
                <Text
                  style={[
                    styles.roleBtnText,
                    role === "user" && styles.roleBtnTextActive,
                  ]}
                >
                  {lang === "fr" ? "Utilisateur" : "User"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setRole("partner")}
                style={[
                  styles.roleBtn,
                  role === "partner" && styles.roleBtnActive,
                ]}
              >
                <Ionicons
                  name="briefcase-outline"
                  size={18}
                  color={role === "partner" ? C.bg : C.text}
                />
                <Text
                  style={[
                    styles.roleBtnText,
                    role === "partner" && styles.roleBtnTextActive,
                  ]}
                >
                  {lang === "fr" ? "Partenaire" : "Partner"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
              {t("email")}
            </Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color={C.textMuted} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={C.textMuted}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={C.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!emailValid || loading}
              style={[
                styles.submitBtn,
                (!emailValid || loading) && { opacity: 0.5 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color={C.bg} />
              ) : (
                <>
                  <Ionicons name="send" size={16} color={C.bg} />
                  <Text style={styles.submitBtnText}>
                    {lang === "fr" ? "Envoyer le nouveau mot de passe" : "Send new password"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.hint}>
              {lang === "fr"
                ? "Pour des raisons de sécurité, nous ne révélons pas si l'email est connu ou non."
                : "For security, we never reveal whether the email is registered."}
            </Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (C: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
    title: {
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
    },
    content: { padding: 20, paddingBottom: 60 },
    intro: {
      fontSize: 14,
      lineHeight: 20,
      fontFamily: "Inter_400Regular",
      color: C.textMuted,
      marginBottom: 24,
    },
    fieldLabel: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
      marginBottom: 8,
    },
    roleRow: { flexDirection: "row", gap: 10 },
    roleBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.card,
    },
    roleBtnActive: {
      backgroundColor: C.lavender,
      borderColor: C.lavender,
    },
    roleBtnText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
    },
    roleBtnTextActive: { color: C.bg },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.card,
      paddingHorizontal: 14,
    },
    input: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: C.text,
      paddingVertical: 14,
    },
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: C.error + "15",
      borderRadius: 10,
      padding: 12,
      marginTop: 14,
    },
    errorText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: C.error,
    },
    submitBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: C.lavender,
      borderRadius: 12,
      paddingVertical: 16,
      marginTop: 24,
    },
    submitBtnText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: C.bg,
    },
    hint: {
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "Inter_400Regular",
      color: C.textMuted,
      textAlign: "center",
      marginTop: 16,
    },
    successCard: {
      alignItems: "center",
      paddingVertical: 24,
    },
    successIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: C.success + "20",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    successTitle: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      color: C.text,
      marginBottom: 12,
    },
    successText: {
      fontSize: 14,
      lineHeight: 22,
      fontFamily: "Inter_400Regular",
      color: C.textMuted,
      textAlign: "center",
      paddingHorizontal: 8,
    },
  });
