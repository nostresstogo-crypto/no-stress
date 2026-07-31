/**
 * change-password.tsx — Task 56
 *
 * Focused screen for changing the current user's password.
 * Accessible from the account tab via "Changer le mot de passe".
 *
 * Flow:
 *   1. User enters their current password.
 *   2. User enters a new password (≥8 chars) with strength indicator.
 *   3. User confirms the new password.
 *   4. Submit → POST /users/me/change-password or /partners/me/change-password via authFetch.
 *   5. On success: Alert "Mot de passe modifié. Vous allez être déconnecté." → logout().
 *
 * Error handling:
 *   - 401 → wrong current password
 *   - 400 → too short / validation error
 *   - network error
 */

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
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
import { ColorPalette } from "@/constants/colors";
import { API_BASE } from "@/lib/apiBase";

// ── password strength ─────────────────────────────────────────────────────────

function strengthScore(p: string): 0 | 1 | 2 | 3 | 4 {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s as 0 | 1 | 2 | 3 | 4;
}

const STRENGTH_LABELS_FR = ["", "Faible", "Correct", "Bon", "Fort"];
const STRENGTH_LABELS_EN = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = ["#e05252", "#e05252", "#f0c040", "#7bc67e", "#4caf50"];

// ── styles ────────────────────────────────────────────────────────────────────

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      backgroundColor: C.bg,
    },
    backBtn: { padding: 4 },
    headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", color: C.text },
    content: { padding: 20, gap: 20 },

    // Hint block
    hint: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: C.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      padding: 14,
    },
    hintText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: C.textMuted,
      lineHeight: 19,
    },

    // Form fields
    fieldGroup: { gap: 16 },
    fieldLabel: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: C.textMuted,
      marginBottom: 6,
    },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 10,
      paddingHorizontal: 14,
    },
    input: {
      flex: 1,
      paddingVertical: 12,
      color: C.text,
      fontFamily: "Inter_400Regular",
      fontSize: 15,
    },
    eyeBtn: { padding: 6 },

    // Strength bar
    strengthWrap: { marginTop: 8, gap: 4 },
    strengthBars: { flexDirection: "row", gap: 4 },
    strengthBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: C.border },
    strengthLabel: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      textAlign: "right",
    },

    // Inline error
    inlineError: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: "#e05252",
      marginTop: 4,
    },

    // Error banner
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: "#3a1818",
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: "#e05252",
      padding: 14,
    },
    errorBannerText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: "#e05252",
    },

    // Submit button
    submitBtn: {
      backgroundColor: C.lavender,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
    },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: {
      color: C.bg,
      fontSize: 15,
      fontFamily: "Inter_700Bold",
    },
  });
}

// ── component ─────────────────────────────────────────────────────────────────

export default function ChangePasswordScreen() {
  const { lang, user, token, logout } = useApp();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(C), [C]);
  const fr = lang === "fr";

  const isPartner = user?.role === "structure";

  // ── fields ───────────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── state ─────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── strength ──────────────────────────────────────────────────────────────
  const strength = strengthScore(newPassword);
  const strengthLabels = fr ? STRENGTH_LABELS_FR : STRENGTH_LABELS_EN;
  const strengthColor = newPassword.length > 0 ? STRENGTH_COLORS[strength] : C.border;

  // ── validation ────────────────────────────────────────────────────────────
  const hasLetter = /[A-Za-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const newPwdValid = newPassword.length >= 8 && hasLetter && hasDigit;
  const confirmMatch = newPassword === confirm;
  const canSubmit =
    currentPassword.length > 0 &&
    newPwdValid &&
    confirmMatch &&
    !loading;

  // ── submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      const url = isPartner
        ? `${API_BASE}/partners/me/change-password`
        : `${API_BASE}/users/me/change-password`;

      // Use plain fetch (not authFetch) so that a 401 meaning "wrong current
      // password" is handled here as a validation error rather than being
      // intercepted by authFetch's session-expiry / token-refresh logic.
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const r = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 401) {
          setErrorMsg(fr
            ? "Mot de passe actuel incorrect."
            : "Current password is incorrect.");
        } else if (r.status === 400) {
          setErrorMsg(
            data?.error ||
            (fr
              ? "Le nouveau mot de passe est invalide (minimum 8 caractères, une lettre et un chiffre)."
              : "New password is invalid (minimum 8 characters, one letter and one digit)."),
          );
        } else {
          setErrorMsg(data?.error || (fr ? "Erreur serveur." : "Server error."));
        }
        return;
      }
      // Success
      Alert.alert(
        fr ? "Mot de passe modifié" : "Password changed",
        fr
          ? "Mot de passe modifié. Vous allez être déconnecté."
          : "Password changed. You will be logged out.",
        [{ text: "OK", onPress: () => logout() }],
      );
    } catch {
      setErrorMsg(fr ? "Impossible de joindre le serveur." : "Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, [canSubmit, isPartner, token, currentPassword, newPassword, fr, logout]);

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: (Platform.OS === "web" ? 0 : insets.top) + 12 },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={fr ? "Retour" : "Back"}
          accessibilityRole="button"
        >
          <Ionicons name="close" size={26} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {fr ? "Changer le mot de passe" : "Change password"}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Security hint */}
        <View style={styles.hint}>
          <Ionicons name="shield-checkmark-outline" size={18} color={C.lavender} />
          <Text style={styles.hintText}>
            {fr
              ? "Après la modification, vous serez déconnecté de tous vos appareils."
              : "After changing your password, you will be signed out on all devices."}
          </Text>
        </View>

        {/* Error banner */}
        {errorMsg && (
          <View style={styles.errorBanner} accessibilityRole="alert">
            <Ionicons name="alert-circle-outline" size={18} color="#e05252" />
            <Text style={styles.errorBannerText}>{errorMsg}</Text>
          </View>
        )}

        {/* Fields */}
        <View style={styles.fieldGroup}>
          {/* Current password */}
          <View>
            <Text style={styles.fieldLabel}>
              {fr ? "Mot de passe actuel" : "Current password"}
            </Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={(v) => { setCurrentPassword(v); setErrorMsg(null); }}
                secureTextEntry={!showCurrent}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={fr ? "Entrez votre mot de passe actuel" : "Enter your current password"}
                placeholderTextColor={C.textMuted}
                returnKeyType="next"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowCurrent((v) => !v)}
                accessibilityLabel={showCurrent ? (fr ? "Masquer" : "Hide") : (fr ? "Afficher" : "Show")}
              >
                <Ionicons
                  name={showCurrent ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={C.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* New password */}
          <View>
            <Text style={styles.fieldLabel}>
              {fr ? "Nouveau mot de passe" : "New password"}
            </Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={(v) => { setNewPassword(v); setErrorMsg(null); }}
                secureTextEntry={!showNew}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={fr ? "Au moins 8 caractères" : "At least 8 characters"}
                placeholderTextColor={C.textMuted}
                returnKeyType="next"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowNew((v) => !v)}
                accessibilityLabel={showNew ? (fr ? "Masquer" : "Hide") : (fr ? "Afficher" : "Show")}
              >
                <Ionicons
                  name={showNew ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={C.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Strength bar */}
            {newPassword.length > 0 && (
              <View style={styles.strengthWrap}>
                <View style={styles.strengthBars}>
                  {[1, 2, 3, 4].map((bar) => (
                    <View
                      key={bar}
                      style={[
                        styles.strengthBar,
                        bar <= strength && { backgroundColor: strengthColor },
                      ]}
                    />
                  ))}
                </View>
                {strength > 0 && (
                  <Text style={[styles.strengthLabel, { color: strengthColor }]}>
                    {strengthLabels[strength]}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Confirm password */}
          <View>
            <Text style={styles.fieldLabel}>
              {fr ? "Confirmer le nouveau mot de passe" : "Confirm new password"}
            </Text>
            <View
              style={[
                styles.inputWrap,
                confirm.length > 0 && !confirmMatch && { borderColor: "#e05252" },
              ]}
            >
              <TextInput
                style={styles.input}
                value={confirm}
                onChangeText={(v) => { setConfirm(v); setErrorMsg(null); }}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={fr ? "Répétez le nouveau mot de passe" : "Repeat the new password"}
                placeholderTextColor={C.textMuted}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowConfirm((v) => !v)}
                accessibilityLabel={showConfirm ? (fr ? "Masquer" : "Hide") : (fr ? "Afficher" : "Show")}
              >
                <Ionicons
                  name={showConfirm ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={C.textMuted}
                />
              </TouchableOpacity>
            </View>
            {confirm.length > 0 && !confirmMatch && (
              <Text style={styles.inlineError}>
                {fr ? "Les mots de passe ne correspondent pas." : "Passwords do not match."}
              </Text>
            )}
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          accessibilityLabel={fr ? "Enregistrer le nouveau mot de passe" : "Save new password"}
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator size="small" color={C.bg} />
          ) : (
            <>
              <Ionicons name="lock-closed" size={16} color={C.bg} />
              <Text style={styles.submitBtnText}>
                {fr ? "Enregistrer" : "Save"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
