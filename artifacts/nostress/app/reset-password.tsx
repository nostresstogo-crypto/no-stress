/**
 * reset-password.tsx — Phase 4
 *
 * Receives: email + role from useLocalSearchParams (set by forgot-password.tsx).
 * Flow:
 *   1. User enters the 6-digit OTP received by email.
 *   2. User sets a new password (≥8 chars, letter + digit) with strength indicator.
 *   3. Submit → POST /auth/reset-password (user) or /partners/reset-password (partner).
 *   4. Success animation → router.replace("/auth?mode=login") after 2s.
 *
 * Security rules enforced:
 *   - Code is sent as plain text over HTTPS — never stored client-side beyond state.
 *   - Passwords are never logged.
 *   - On error the OTP boxes are cleared so users must re-enter the code.
 *   - gestureEnabled: false is set in _layout.tsx to prevent accidental dismissal.
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
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
import { router, useLocalSearchParams } from "expo-router";

import { useApp, useColors } from "@/context/AppContext";
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

export default function ResetPasswordScreen() {
  const { lang } = useApp();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(C);

  const { email: rawEmail, role: rawRole } = useLocalSearchParams<{ email: string; role: string }>();
  const email = (rawEmail ?? "").trim().toLowerCase();
  const role: "user" | "partner" = rawRole === "partner" ? "partner" : "user";

  // Guard: if params are missing, go back to forgot-password.
  useEffect(() => {
    if (!email || !rawRole) router.replace("/forgot-password");
  }, [email, rawRole]);

  // ── OTP boxes ─────────────────────────────────────────────────────────────
  const CODE_LEN = 6;
  const [digits, setDigits] = useState<string[]>(Array(CODE_LEN).fill(""));
  const digitRefs = useRef<Array<TextInput | null>>(Array(CODE_LEN).fill(null));
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const code = digits.join("");

  // ── password fields ───────────────────────────────────────────────────────
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const strength = strengthScore(password);

  // ── request state ─────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ icon: keyof typeof Ionicons.glyphMap; text: string } | null>(null);
  const [done, setDone] = useState(false);
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  // ── expiry countdown (mirrors the backend 15-min window) ──────────────────
  const EXPIRY_SECS = 15 * 60;
  const [remaining, setRemaining] = useState(EXPIRY_SECS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };
  const expired = remaining === 0;
  const timerColor =
    remaining > 2 * 60 ? C.textMuted : remaining > 60 ? "#f0c040" : C.error;

  // ── validation ────────────────────────────────────────────────────────────
  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const pwdValid = password.length >= 8 && hasLetter && hasDigit;
  const confirmMatch = password === confirm;
  const canSubmit =
    code.length === CODE_LEN &&
    pwdValid &&
    confirmMatch &&
    !loading &&
    !expired;

  // ── shake animation ───────────────────────────────────────────────────────
  const triggerShake = useCallback(() => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  // ── OTP digit handlers ────────────────────────────────────────────────────
  const handleDigitChange = useCallback(
    (idx: number, value: string) => {
      const stripped = value.replace(/\D/g, "");

      // Handle paste (6 digits at once)
      if (stripped.length >= CODE_LEN) {
        const pasted = stripped.slice(0, CODE_LEN).split("");
        setDigits(pasted);
        digitRefs.current[CODE_LEN - 1]?.focus();
        return;
      }

      if (stripped.length === 0) return; // handled by onKeyPress
      const next = [...digits];
      next[idx] = stripped[stripped.length - 1];
      setDigits(next);
      setError(null);
      if (idx < CODE_LEN - 1) {
        digitRefs.current[idx + 1]?.focus();
      } else {
        digitRefs.current[idx]?.blur();
      }
    },
    [digits],
  );

  const handleKeyPress = useCallback(
    (idx: number, key: string) => {
      if (key === "Backspace") {
        const next = [...digits];
        if (next[idx]) {
          next[idx] = "";
          setDigits(next);
        } else if (idx > 0) {
          next[idx - 1] = "";
          setDigits(next);
          digitRefs.current[idx - 1]?.focus();
        }
        setError(null);
      }
    },
    [digits],
  );

  // ── submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const path =
        role === "partner"
          ? `${API_BASE}/partners/reset-password`
          : `${API_BASE}/auth/reset-password`;
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword: password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg: string = data?.error ?? "";
        if (res.status === 429) {
          setError({
            icon: "time-outline",
            text:
              lang === "fr"
                ? "Trop de tentatives. Réessayez dans quelques minutes."
                : "Too many attempts. Try again in a few minutes.",
          });
        } else if (msg.includes("xpiré")) {
          setError({
            icon: "timer-outline",
            text:
              lang === "fr"
                ? "Ce code a expiré. Revenez en arrière pour en obtenir un nouveau."
                : "This code has expired. Go back to request a new one.",
          });
        } else {
          setError({
            icon: "close-circle",
            text:
              msg ||
              (lang === "fr"
                ? "Code incorrect. Vérifiez et réessayez."
                : "Incorrect code. Check and try again."),
          });
          // Clear OTP boxes so user can re-enter
          setDigits(Array(CODE_LEN).fill(""));
          setTimeout(() => digitRefs.current[0]?.focus(), 80);
          triggerShake();
        }
        return;
      }

      // ── Success ──────────────────────────────────────────────────────────
      if (timerRef.current) clearInterval(timerRef.current);
      setDone(true);
      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 6,
        }),
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      setTimeout(() => router.replace("/auth?mode=login"), 2200);
    } catch {
      setError({
        icon: "wifi-outline",
        text:
          lang === "fr"
            ? "Connexion impossible. Vérifiez votre réseau."
            : "Connection failed. Check your network.",
      });
    } finally {
      setLoading(false);
    }
  }, [canSubmit, code, email, lang, password, role, triggerShake, successScale, successOpacity]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      lang === "fr" ? "Annuler la réinitialisation ?" : "Cancel reset?",
      lang === "fr"
        ? "Votre code de réinitialisation sera invalidé. Vous pouvez en demander un nouveau depuis l'écran précédent."
        : "Your reset code will be invalidated. You can request a new one from the previous screen.",
      [
        { text: lang === "fr" ? "Rester" : "Stay", style: "cancel" },
        {
          text: lang === "fr" ? "Annuler" : "Cancel reset",
          style: "destructive",
          onPress: () => router.back(),
        },
      ],
    );
  }, [lang]);

  // ── Success overlay ───────────────────────────────────────────────────────
  if (done) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, justifyContent: "center", alignItems: "center" }]}>
        <Animated.View
          style={[
            styles.successCircle,
            { backgroundColor: C.success + "20", transform: [{ scale: successScale }], opacity: successOpacity },
          ]}
        >
          <Ionicons name="checkmark" size={56} color={C.success} />
        </Animated.View>
        <Animated.Text style={[styles.successTitle, { opacity: successOpacity, marginTop: 24 }]}>
          {lang === "fr" ? "Mot de passe modifié !" : "Password updated!"}
        </Animated.Text>
        <Animated.Text style={[styles.successSub, { opacity: successOpacity }]}>
          {lang === "fr"
            ? "Vos anciennes sessions ont été révoquées. Connectez-vous avec votre nouveau mot de passe."
            : "Your old sessions have been revoked. Sign in with your new password."}
        </Animated.Text>
        <ActivityIndicator color={C.lavender} style={{ marginTop: 24 }} />
      </View>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.root, { paddingTop: insets.top }]}
    >
      {/* header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backBtn} accessibilityLabel="Annuler">
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {lang === "fr" ? "Nouveau mot de passe" : "New password"}
        </Text>
        {/* expiry timer */}
        <Text style={[styles.timerText, { color: timerColor }]}>
          {expired ? (lang === "fr" ? "Expiré" : "Expired") : formatTime(remaining)}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* email recap */}
        <View style={styles.emailRecap}>
          <Ionicons name="mail-outline" size={14} color={C.textMuted} />
          <Text style={styles.emailRecapText} numberOfLines={1}>{email}</Text>
        </View>

        {/* ── SECTION 1: OTP ─────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>
          {lang === "fr" ? "Code reçu par email" : "Code received by email"}
        </Text>
        <Text style={styles.sectionSub}>
          {lang === "fr"
            ? "Saisissez le code à 6 chiffres envoyé à votre adresse email."
            : "Enter the 6-digit code sent to your email address."}
        </Text>

        <Animated.View
          style={[styles.digitRow, { transform: [{ translateX: shakeAnim }] }]}
        >
          {digits.map((d, idx) => (
            <TextInput
              key={idx}
              ref={(r) => { digitRefs.current[idx] = r; }}
              value={d}
              onChangeText={(v) => handleDigitChange(idx, v)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(idx, nativeEvent.key)}
              maxLength={2}
              keyboardType="number-pad"
              selectTextOnFocus
              style={[
                styles.digitBox,
                d ? styles.digitBoxFilled : null,
                error ? styles.digitBoxError : null,
              ]}
              accessibilityLabel={`${lang === "fr" ? "Chiffre" : "Digit"} ${idx + 1}`}
              editable={!loading && !expired}
            />
          ))}
        </Animated.View>

        {/* OTP error */}
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name={error.icon} size={16} color={C.error} />
            <Text style={styles.errorText}>{error.text}</Text>
          </View>
        ) : null}

        {expired ? (
          <View style={[styles.errorBox, { borderColor: C.error + "33", borderWidth: 1 }]}>
            <Ionicons name="timer-outline" size={16} color={C.error} />
            <Text style={styles.errorText}>
              {lang === "fr"
                ? "Ce code a expiré. Revenez en arrière pour en demander un nouveau."
                : "This code has expired. Go back to request a new one."}
            </Text>
          </View>
        ) : null}

        {/* ── SECTION 2: new password ─────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>
          {lang === "fr" ? "Nouveau mot de passe" : "New password"}
        </Text>
        <Text style={styles.sectionSub}>
          {lang === "fr"
            ? "Au moins 8 caractères, une lettre et un chiffre."
            : "At least 8 characters, one letter and one digit."}
        </Text>

        <View style={[styles.inputRow, password && !pwdValid && styles.inputRowError]}>
          <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={lang === "fr" ? "Nouveau mot de passe" : "New password"}
            placeholderTextColor={C.textMuted}
            style={styles.input}
            secureTextEntry={!showPwd}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            returnKeyType="next"
            accessibilityLabel={lang === "fr" ? "Nouveau mot de passe" : "New password"}
          />
          <TouchableOpacity
            onPress={() => setShowPwd(v => !v)}
            accessibilityLabel={showPwd ? "Masquer" : "Afficher"}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={18} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        {/* strength bar */}
        {password.length > 0 && (
          <View style={styles.strengthRow}>
            {[1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  styles.strengthBar,
                  {
                    backgroundColor:
                      strength >= i
                        ? STRENGTH_COLORS[strength]
                        : C.border,
                  },
                ]}
              />
            ))}
            <Text style={[styles.strengthLabel, { color: STRENGTH_COLORS[strength] || C.textMuted }]}>
              {lang === "fr" ? STRENGTH_LABELS_FR[strength] : STRENGTH_LABELS_EN[strength]}
            </Text>
          </View>
        )}

        {/* confirm */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
          {lang === "fr" ? "Confirmer le mot de passe" : "Confirm password"}
        </Text>
        <View style={[
          styles.inputRow,
          confirm && !confirmMatch && styles.inputRowError,
          confirm && confirmMatch && password ? styles.inputRowSuccess : null,
        ]}>
          <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} />
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            placeholder={lang === "fr" ? "Confirmer le mot de passe" : "Confirm password"}
            placeholderTextColor={C.textMuted}
            style={styles.input}
            secureTextEntry={!showConfirm}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            accessibilityLabel={lang === "fr" ? "Confirmer le mot de passe" : "Confirm password"}
          />
          <TouchableOpacity
            onPress={() => setShowConfirm(v => !v)}
            accessibilityLabel={showConfirm ? "Masquer" : "Afficher"}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={18} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        {confirm.length > 0 && !confirmMatch && (
          <Text style={styles.mismatchText}>
            {lang === "fr" ? "Les mots de passe ne correspondent pas." : "Passwords do not match."}
          </Text>
        )}

        {/* submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={[styles.submitBtn, !canSubmit && { opacity: 0.45 }, { marginTop: 28 }]}
          accessibilityLabel={lang === "fr" ? "Réinitialiser le mot de passe" : "Reset password"}
        >
          {loading ? (
            <ActivityIndicator color={C.bg} />
          ) : (
            <>
              <Ionicons name="shield-checkmark-outline" size={18} color={C.bg} />
              <Text style={styles.submitBtnText}>
                {lang === "fr" ? "Réinitialiser le mot de passe" : "Reset password"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.sessionHint}>
          {lang === "fr"
            ? "Toutes vos sessions actives seront déconnectées après la réinitialisation."
            : "All your active sessions will be signed out after the reset."}
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
    timerText: { fontSize: 13, fontFamily: "Inter_600SemiBold", minWidth: 52, textAlign: "right" },
    content: { padding: 20, paddingBottom: 60 },
    emailRecap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: C.card,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: C.border,
    },
    emailRecapText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: C.textMuted },
    sectionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text, marginBottom: 4 },
    sectionSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textMuted, marginBottom: 14 },
    digitRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
    digitBox: {
      flex: 1,
      aspectRatio: 0.85,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: C.border,
      backgroundColor: C.card,
      textAlign: "center",
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: C.text,
    },
    digitBoxFilled: { borderColor: C.lavender },
    digitBoxError: { borderColor: C.error, backgroundColor: C.error + "10" },
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
    inputRowSuccess: { borderColor: C.success },
    input: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: C.text,
      paddingVertical: 14,
    },
    strengthRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 10,
    },
    strengthBar: {
      flex: 1,
      height: 4,
      borderRadius: 2,
    },
    strengthLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", minWidth: 48 },
    mismatchText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: C.error,
      marginTop: 6,
      marginLeft: 4,
    },
    submitBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: C.lavender,
      borderRadius: 12,
      paddingVertical: 16,
    },
    submitBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.bg },
    sessionHint: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: C.textMuted,
      textAlign: "center",
      marginTop: 14,
      lineHeight: 18,
    },
    successCircle: {
      width: 112,
      height: 112,
      borderRadius: 56,
      alignItems: "center",
      justifyContent: "center",
    },
    successTitle: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: C.text,
      textAlign: "center",
      marginBottom: 10,
    },
    successSub: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: C.textMuted,
      textAlign: "center",
      lineHeight: 21,
      paddingHorizontal: 24,
    },
  });
