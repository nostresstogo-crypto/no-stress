import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useApp, useColors } from "@/context/AppContext";
import { API_BASE } from "@/lib/apiBase";

type Role = "user" | "partner";

const RESEND_COOLDOWN = 60;

export default function ForgotPasswordScreen() {
  const { lang } = useApp();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(C);

  // ── form state ──────────────────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── success / resend state ──────────────────────────────────────────────────
  const [sent, setSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanEmail = email.trim().toLowerCase();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

  // cleanup timer on unmount
  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  const startCooldown = useCallback(() => {
    setResendCooldown(RESEND_COOLDOWN);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const callForgotPassword = useCallback(async (targetEmail: string, targetRole: Role) => {
    const path =
      targetRole === "partner"
        ? `${API_BASE}/partners/forgot-password`
        : `${API_BASE}/auth/forgot-password`;
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        throw new Error(
          lang === "fr"
            ? "Trop de tentatives. Réessayez dans quelques minutes."
            : "Too many attempts. Try again in a few minutes.",
        );
      }
      throw new Error(
        data?.error ||
          (lang === "fr" ? "Une erreur est survenue." : "An error occurred."),
      );
    }
  }, [lang]);

  const handleSubmit = async () => {
    if (!emailValid || loading) return;
    setLoading(true);
    setError("");
    try {
      await callForgotPassword(cleanEmail, role);
      setSent(true);
      startCooldown();
    } catch (e: any) {
      setError(
        e?.message ||
          (lang === "fr"
            ? "Connexion impossible. Vérifiez votre réseau."
            : "Connection failed. Check your network."),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    try {
      await callForgotPassword(cleanEmail, role);
      startCooldown();
    } catch (e: any) {
      Alert.alert(
        lang === "fr" ? "Erreur" : "Error",
        e?.message || (lang === "fr" ? "Une erreur est survenue." : "An error occurred."),
      );
    } finally {
      setResending(false);
    }
  };

  const handleEnterCode = () => {
    router.push(`/reset-password?email=${encodeURIComponent(cleanEmail)}&role=${role}`);
  };

  const handleOpenMail = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("message://").catch(() => Linking.openURL("mailto:").catch(() => {}));
    } else {
      Linking.openURL("mailto:").catch(() => {});
    }
  };

  // ── success screen ──────────────────────────────────────────────────────────
  if (sent) {
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
          contentContainerStyle={[styles.content, { alignItems: "center", paddingTop: 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* mail icon */}
          <View style={[styles.successIconWrap, { backgroundColor: C.lavender + "25" }]}>
            <Ionicons name="mail" size={40} color={C.lavender} />
          </View>

          <Text style={styles.successTitle}>
            {lang === "fr" ? "Code envoyé !" : "Code sent!"}
          </Text>

          <Text style={styles.successText}>
            {lang === "fr"
              ? `Si un compte est associé à ${cleanEmail}, un code à 6 chiffres vient d'y être envoyé.`
              : `If an account is linked to ${cleanEmail}, a 6-digit code has just been sent.`}
          </Text>

          <Text style={styles.spamHint}>
            <Ionicons name="folder-outline" size={12} color={C.textMuted} />{" "}
            {lang === "fr"
              ? "Pensez à vérifier votre dossier Spams."
              : "Don't forget to check your Spam folder."}
          </Text>

          {/* enter code */}
          <TouchableOpacity
            onPress={handleEnterCode}
            style={[styles.primaryBtn, { marginTop: 28 }]}
            accessibilityLabel={lang === "fr" ? "Saisir mon code" : "Enter my code"}
          >
            <Ionicons name="keypad-outline" size={18} color={C.bg} />
            <Text style={styles.primaryBtnText}>
              {lang === "fr" ? "Saisir mon code" : "Enter my code"}
            </Text>
          </TouchableOpacity>

          {/* open mail app */}
          <TouchableOpacity
            onPress={handleOpenMail}
            style={styles.secondaryBtn}
            accessibilityLabel={lang === "fr" ? "Ouvrir ma boîte mail" : "Open my mail app"}
          >
            <Ionicons name="open-outline" size={16} color={C.lavender} />
            <Text style={styles.secondaryBtnText}>
              {lang === "fr" ? "Ouvrir ma boîte mail" : "Open my mail app"}
            </Text>
          </TouchableOpacity>

          {/* resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>
              {lang === "fr" ? "Vous n'avez rien reçu ?" : "Nothing received?"}
            </Text>
            {resending ? (
              <ActivityIndicator size="small" color={C.lavender} style={{ marginLeft: 8 }} />
            ) : resendCooldown > 0 ? (
              <Text style={[styles.resendLink, { color: C.textMuted }]}>
                {lang === "fr"
                  ? `Renvoyer (${resendCooldown}s)`
                  : `Resend (${resendCooldown}s)`}
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} accessibilityLabel="Renvoyer">
                <Text style={styles.resendLink}>
                  {lang === "fr" ? "Renvoyer" : "Resend"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── request form ────────────────────────────────────────────────────────────
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
        <Text style={styles.intro}>
          {lang === "fr"
            ? "Saisissez votre email et votre type de compte. Nous vous enverrons un code à 6 chiffres pour créer un nouveau mot de passe."
            : "Enter your email and account type. We'll send a 6-digit code to reset your password."}
        </Text>

        {/* account type toggle */}
        <Text style={styles.fieldLabel}>
          {lang === "fr" ? "Type de compte" : "Account type"}
        </Text>
        <View style={styles.roleRow}>
          {(["user", "partner"] as Role[]).map((r) => {
            const active = role === r;
            return (
              <TouchableOpacity
                key={r}
                onPress={() => setRole(r)}
                style={[styles.roleBtn, active && styles.roleBtnActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <Ionicons
                  name={r === "user" ? "person-outline" : "briefcase-outline"}
                  size={18}
                  color={active ? C.bg : C.text}
                />
                <Text style={[styles.roleBtnText, active && styles.roleBtnTextActive]}>
                  {r === "user"
                    ? lang === "fr" ? "Utilisateur" : "User"
                    : lang === "fr" ? "Partenaire" : "Partner"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.roleHint}>
          {role === "user"
            ? lang === "fr"
              ? "Compte personnel NoStress."
              : "Personal NoStress account."
            : lang === "fr"
              ? "Compte professionnel (lieu, événement…)."
              : "Business account (venue, event…)."}
        </Text>

        {/* email field */}
        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>
          {lang === "fr" ? "Adresse email" : "Email address"}
        </Text>
        <View style={[styles.inputRow, email && !emailValid && styles.inputRowError]}>
          <Ionicons name="mail-outline" size={18} color={C.textMuted} />
          <TextInput
            value={email}
            onChangeText={(v) => { setEmail(v); setError(""); }}
            placeholder="you@example.com"
            placeholderTextColor={C.textMuted}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="send"
            onSubmitEditing={handleSubmit}
            editable={!loading}
            accessibilityLabel="Email"
          />
        </View>

        {/* error */}
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={C.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!emailValid || loading}
          style={[styles.primaryBtn, (!emailValid || loading) && { opacity: 0.5 }, { marginTop: 24 }]}
          accessibilityLabel={lang === "fr" ? "Envoyer le code" : "Send code"}
        >
          {loading ? (
            <ActivityIndicator color={C.bg} />
          ) : (
            <>
              <Ionicons name="send" size={16} color={C.bg} />
              <Text style={styles.primaryBtnText}>
                {lang === "fr" ? "Envoyer le code" : "Send code"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* anti-enumeration hint */}
        <Text style={styles.hint}>
          {lang === "fr"
            ? "Pour la sécurité, nous ne révélons pas si l'adresse email est connue ou non."
            : "For security, we never reveal whether an email address is registered."}
        </Text>
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
    title: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: C.text },
    content: { padding: 20, paddingBottom: 60 },
    intro: {
      fontSize: 14,
      lineHeight: 21,
      fontFamily: "Inter_400Regular",
      color: C.textMuted,
      marginBottom: 24,
    },
    fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.text, marginBottom: 8 },
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
    roleBtnActive: { backgroundColor: C.lavender, borderColor: C.lavender },
    roleBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text },
    roleBtnTextActive: { color: C.bg },
    roleHint: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: C.textMuted,
      marginTop: 8,
    },
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
    inputRowError: { borderColor: C.error },
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
    errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: C.error },
    primaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: C.lavender,
      borderRadius: 12,
      paddingVertical: 16,
    },
    primaryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.bg },
    hint: {
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "Inter_400Regular",
      color: C.textMuted,
      textAlign: "center",
      marginTop: 16,
    },
    // success screen
    successIconWrap: {
      width: 88,
      height: 88,
      borderRadius: 44,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    successTitle: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: C.text,
      marginBottom: 12,
      textAlign: "center",
    },
    successText: {
      fontSize: 14,
      lineHeight: 22,
      fontFamily: "Inter_400Regular",
      color: C.textMuted,
      textAlign: "center",
      paddingHorizontal: 8,
      marginBottom: 8,
    },
    spamHint: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: C.textMuted,
      textAlign: "center",
    },
    secondaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 14,
      marginTop: 10,
    },
    secondaryBtnText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: C.lavender,
    },
    resendRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 20,
      gap: 6,
    },
    resendLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textMuted },
    resendLink: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.lavender },
  });
