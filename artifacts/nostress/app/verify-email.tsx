import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { safeReplace } from "@/lib/navigation";

import { useApp, useColors } from "@/context/AppContext";
import { API_BASE } from "@/lib/apiBase";

// ─── Constants ───────────────────────────────────────────────────
const DIGIT_COUNT = 6;
const OTP_TTL     = 15 * 60; // 15 minutes in seconds
const RESEND_CD   = 60;       // 60-second resend cooldown

type Phase     = "input" | "success-user" | "success-partner";
type ErrorKind = "wrong" | "expired" | "network" | "rate-limit" | "already-verified" | null;

// ─── Component ───────────────────────────────────────────────────
export default function VerifyEmailScreen() {
  const { setUser, setSession, lang, addNotification } = useApp();
  const C      = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string; role?: string }>();

  const targetEmail = String(params.email || "").trim().toLowerCase();
  const role        = params.role === "partner" ? "partner" : "user";
  const fr          = lang === "fr";

  const verifyEndpoint = role === "partner"
    ? `${API_BASE}/partners/verify-email`
    : `${API_BASE}/auth/verify-email`;
  const resendEndpoint = role === "partner"
    ? `${API_BASE}/partners/resend-verification`
    : `${API_BASE}/auth/resend-verification`;

  // ── State ────────────────────────────────────────────────────
  const [digits,      setDigits]      = useState<string[]>(Array(DIGIT_COUNT).fill(""));
  const [activeBox,   setActiveBox]   = useState(-1);
  const [loading,     setLoading]     = useState(false);
  const [resending,   setResending]   = useState(false);
  const [phase,       setPhase]       = useState<Phase>("input");
  const [errorKind,   setErrorKind]   = useState<ErrorKind>(null);
  const [errorMsg,    setErrorMsg]    = useState("");
  const [resendInfo,  setResendInfo]  = useState(""); // success message after resend
  const [resendCd,    setResendCd]    = useState(RESEND_CD);   // cooldown countdown
  const [expirySecs,  setExpirySecs]  = useState(OTP_TTL);     // code expiry countdown

  // ── Refs ─────────────────────────────────────────────────────
  const boxRefs    = useRef<Array<TextInput | null>>(Array(DIGIT_COUNT).fill(null));
  const successAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim   = useRef(new Animated.Value(0)).current;

  const S = useMemo(() => makeStyles(C), [C]);

  // ── Timers ───────────────────────────────────────────────────
  // OTP expiry countdown
  useEffect(() => {
    if (phase !== "input") return;
    const t = setInterval(() => {
      setExpirySecs(s => {
        if (s <= 1) {
          clearInterval(t);
          setErrorKind("expired");
          setErrorMsg(fr ? "Code expiré. Renvoyez-en un nouveau." : "Code expired. Request a new one.");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCd <= 0) return;
    const t = setInterval(() => setResendCd(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCd]);

  // ── Helpers ──────────────────────────────────────────────────
  const fmtTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  function clearError() {
    setErrorKind(null);
    setErrorMsg("");
    setResendInfo("");
  }

  function shakeBoxes() {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start();
  }

  function triggerSuccess(p: "success-user" | "success-partner") {
    setPhase(p);
    successAnim.setValue(0);
    Animated.spring(successAnim, {
      toValue: 1, tension: 55, friction: 6, useNativeDriver: true,
    }).start();
  }

  function classifyError(httpStatus: number, msg: string): ErrorKind {
    if (httpStatus === 429) return "rate-limit";
    const m = msg.toLowerCase();
    if (m.includes("expir")) return "expired";
    if (m.includes("aucun code") || m.includes("already verified") || m.includes("no pending"))
      return "already-verified";
    return "wrong";
  }

  // ── Digit input handlers ─────────────────────────────────────
  const handleDigitChange = useCallback((idx: number, raw: string) => {
    if (loading || phase !== "input") return;
    clearError();

    const clean = raw.replace(/\D/g, "");

    // Paste — 6+ digits at once
    if (clean.length >= 6) {
      const filled = clean.slice(0, 6).split("");
      setDigits(filled);
      boxRefs.current[5]?.focus();
      setTimeout(() => doVerify(filled.join("")), 80);
      return;
    }

    // Single-digit entry
    const digit = clean.slice(-1); // take last char (handles some Android edge cases)
    const next  = digits.slice();
    next[idx]   = digit;
    setDigits(next);

    if (digit) {
      if (idx < DIGIT_COUNT - 1) {
        boxRefs.current[idx + 1]?.focus();
      }
      // Auto-submit when last box filled
      if (idx === DIGIT_COUNT - 1 && next.every(d => d !== "")) {
        setTimeout(() => doVerify(next.join("")), 80);
      }
    }
  }, [digits, loading, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyPress = useCallback((idx: number, key: string) => {
    if (key !== "Backspace") return;
    clearError();
    if (!digits[idx] && idx > 0) {
      const next   = digits.slice();
      next[idx - 1] = "";
      setDigits(next);
      boxRefs.current[idx - 1]?.focus();
    } else if (digits[idx]) {
      const next = digits.slice();
      next[idx]  = "";
      setDigits(next);
    }
  }, [digits]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── API calls ────────────────────────────────────────────────
  async function doVerify(code: string) {
    if (loading || !targetEmail) return;
    setLoading(true);
    clearError();
    try {
      const res  = await fetch(verifyEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, code }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const kind = classifyError(res.status, data?.error || "");
        setErrorKind(kind);
        setErrorMsg(
          kind === "expired"          ? (fr ? "Ce code a expiré. Renvoyez-en un nouveau." : "This code has expired. Request a new one.")
          : kind === "rate-limit"     ? (fr ? "Trop de tentatives. Réessayez dans quelques minutes." : "Too many attempts. Try again in a few minutes.")
          : kind === "already-verified" ? (fr ? "Cet email est déjà vérifié. Connectez-vous." : "This email is already verified. Please sign in.")
          : (fr ? "Code incorrect. Vérifiez et réessayez." : "Incorrect code. Check and try again.")
        );
        shakeBoxes();
        // Reset digits so user can re-enter
        setDigits(Array(DIGIT_COUNT).fill(""));
        setTimeout(() => boxRefs.current[0]?.focus(), 100);
        setLoading(false);
        return;
      }

      // ── Success ──
      if (role === "partner") {
        if (data.user)  await setUser(data.user);
        if (data.token) await setSession(data.token, data.refreshToken || null);
        addNotification({
          title: "Account activated",   titleFr: "Compte activé",
          body:  "Your partner account is now active. Your venue is pending review.",
          bodyFr: "Votre compte partenaire est actif. Votre lieu est en cours de validation.",
        });
        triggerSuccess("success-partner");
        setTimeout(() => safeReplace("/(tabs)"), 2000);
      } else {
        if (data.user)  await setUser(data.user);
        if (data.token) await setSession(data.token, data.refreshToken || null);
        triggerSuccess("success-user");
        setTimeout(() => safeReplace("/(tabs)"), 2000);
      }
    } catch {
      setErrorKind("network");
      setErrorMsg(fr ? "Erreur réseau. Vérifiez votre connexion." : "Network error. Check your connection.");
      shakeBoxes();
    }
    setLoading(false);
  }

  async function handleResend() {
    if (resendCd > 0 || resending || !targetEmail) return;
    setResending(true);
    clearError();
    try {
      const res  = await fetch(resendEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorKind("network");
        setErrorMsg(data?.error || (fr ? "Erreur lors de l'envoi." : "Failed to send."));
      } else {
        setResendInfo(fr ? "Nouveau code envoyé ✓" : "New code sent ✓");
        setResendCd(RESEND_CD);
        setExpirySecs(OTP_TTL);
        setDigits(Array(DIGIT_COUNT).fill(""));
        setTimeout(() => boxRefs.current[0]?.focus(), 100);
      }
    } catch {
      setErrorKind("network");
      setErrorMsg(fr ? "Erreur réseau." : "Network error.");
    }
    setResending(false);
  }

  function handleCancel() {
    Alert.alert(
      fr ? "Annuler la vérification ?" : "Cancel verification?",
      fr ? "Votre code ne sera plus valide et vous devrez recommencer l'inscription."
         : "Your code will no longer be valid and you will need to restart registration.",
      [
        { text: fr ? "Continuer" : "Continue", style: "cancel" },
        { text: fr ? "Quitter" : "Quit", style: "destructive", onPress: () => router.back() },
      ],
    );
  }

  function openMailApp() {
    Linking.openURL("message://").catch(() =>
      Linking.openURL("mailto:").catch(() => {})
    );
  }

  // ── Success screen ───────────────────────────────────────────
  if (phase === "success-user" || phase === "success-partner") {
    return (
      <View style={[S.successRoot, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}>
        <Animated.View style={[
          S.successCircle,
          { borderColor: C.success + "44", backgroundColor: C.success + "14" },
          { transform: [{ scale: successAnim }], opacity: successAnim },
        ]}>
          <LinearGradient
            colors={[C.success, C.success + "CC"]}
            style={S.successIconInner}
          >
            <Ionicons name="checkmark" size={52} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={{ opacity: successAnim, alignItems: "center", gap: 10 }}>
          <Text style={[S.successTitle, { color: C.text }]}>
            {fr ? "Email vérifié !" : "Email verified!"}
          </Text>
          <Text style={[S.successSub, { color: C.textMuted }]}>
            {fr ? "Connexion en cours…" : "Signing you in…"}
          </Text>
          <ActivityIndicator color={C.lavender} style={{ marginTop: 12 }} />
        </Animated.View>
      </View>
    );
  }

  // ── Input screen ─────────────────────────────────────────────
  const codeComplete   = digits.every(d => d !== "");
  const codeStr        = digits.join("");
  const isExpired      = expirySecs === 0;
  const expiryWarning  = expirySecs > 0 && expirySecs <= 120; // last 2 mins
  const expiryColor    = isExpired ? C.error : expiryWarning ? C.gold : C.textMuted;

  return (
    <View style={[S.root, { backgroundColor: C.bg }]}>
      {/* Safe-area top spacer + cancel */}
      <View style={[S.topBar, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={handleCancel} style={S.cancelBtn} accessibilityLabel={fr ? "Annuler" : "Cancel"}>
          <Ionicons name="close" size={20} color={C.textMuted} />
        </TouchableOpacity>
        {/* Expiry timer */}
        <View style={[S.expiryBadge, { borderColor: expiryColor + "44", backgroundColor: expiryColor + "14" }]}>
          <Ionicons name="timer-outline" size={13} color={expiryColor} />
          <Text style={[S.expiryText, { color: expiryColor }]}>
            {isExpired
              ? (fr ? "Expiré" : "Expired")
              : fmtTime(expirySecs)}
          </Text>
        </View>
      </View>

      <View style={[S.content, { paddingBottom: insets.bottom + 24 }]}>
        {/* Icon */}
        <View style={[S.iconCircle, { backgroundColor: C.lavender + "18", borderColor: C.lavender + "30" }]}>
          <Ionicons name="mail-unread-outline" size={38} color={C.lavender} />
        </View>

        {/* Title */}
        <Text style={[S.title, { color: C.text }]}>
          {fr ? "Vérifiez votre email" : "Verify your email"}
        </Text>
        <Text style={[S.subtitle, { color: C.textMuted }]}>
          {fr ? "Saisissez le code à 6 chiffres envoyé à" : "Enter the 6-digit code sent to"}
        </Text>
        <Text style={[S.emailText, { color: C.lavender }]} numberOfLines={1}>
          {targetEmail || (fr ? "votre adresse email" : "your email")}
        </Text>

        {/* Partner notice */}
        {role === "partner" && (
          <View style={[S.partnerBanner, { backgroundColor: C.gold + "14", borderColor: C.gold + "40" }]}>
            <Ionicons name="business-outline" size={15} color={C.gold} />
            <Text style={[S.partnerBannerText, { color: C.gold }]}>
              {fr
                ? "Compte partenaire — votre lieu sera examiné par notre équipe après vérification."
                : "Partner account — your venue will be reviewed by our team after verification."}
            </Text>
          </View>
        )}

        {/* 6 OTP boxes */}
        <Animated.View style={[S.boxRow, { transform: [{ translateX: shakeAnim }] }]}>
          {Array.from({ length: DIGIT_COUNT }).map((_, i) => {
            const isFocused = activeBox === i;
            const isFilled  = !!digits[i];
            const hasError  = !!errorKind;
            return (
              <TextInput
                key={i}
                ref={r => { boxRefs.current[i] = r; }}
                style={[
                  S.box,
                  { borderColor: hasError ? C.error : isFocused ? C.lavender : isFilled ? C.lavender + "66" : C.border,
                    backgroundColor: isFocused ? C.lavender + "0C" : isFilled ? C.lavender + "08" : C.card,
                    color: C.text },
                ]}
                value={digits[i]}
                onChangeText={v => handleDigitChange(i, v)}
                onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(i, key)}
                onFocus={() => { setActiveBox(i); clearError(); }}
                onBlur={() => setActiveBox(-1)}
                keyboardType="number-pad"
                maxLength={2}  /* 2 to capture paste on some Android versions */
                selectTextOnFocus
                caretHidden
                autoFocus={i === 0}
                accessibilityLabel={fr ? `Chiffre ${i + 1}` : `Digit ${i + 1}`}
                editable={!loading && !isExpired}
              />
            );
          })}
        </Animated.View>

        {/* Error message */}
        {!!errorKind && (
          <View style={[S.errorCard, { backgroundColor: C.error + "14", borderColor: C.error + "30" }]}>
            <Ionicons
              name={errorKind === "network" ? "wifi-outline" : errorKind === "expired" ? "timer-outline" : errorKind === "already-verified" ? "checkmark-circle-outline" : "close-circle-outline"}
              size={16} color={C.error}
            />
            <Text style={[S.errorText, { color: C.error }]}>{errorMsg}</Text>
          </View>
        )}

        {/* Resend info */}
        {!!resendInfo && (
          <View style={[S.infoCard, { backgroundColor: C.success + "14", borderColor: C.success + "30" }]}>
            <Ionicons name="checkmark-circle-outline" size={16} color={C.success} />
            <Text style={[S.infoText, { color: C.success }]}>{resendInfo}</Text>
          </View>
        )}

        {/* Verify button — only shown if not auto-submitting */}
        {!loading && codeComplete && (
          <TouchableOpacity
            onPress={() => doVerify(codeStr)}
            disabled={loading || isExpired}
            style={[S.verifyBtn, { opacity: isExpired ? 0.4 : 1 }]}
            accessibilityLabel={fr ? "Vérifier le code" : "Verify code"}
            accessibilityRole="button"
          >
            <LinearGradient colors={[C.lavender, C.lavender + "CC"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.verifyBtnInner}>
              <Text style={[S.verifyBtnText, { color: "#FFFFFF" }]}>
                {fr ? "Vérifier" : "Verify"}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {loading && (
          <View style={S.loadingRow}>
            <ActivityIndicator color={C.lavender} />
            <Text style={[S.loadingText, { color: C.textMuted }]}>
              {fr ? "Vérification en cours…" : "Verifying…"}
            </Text>
          </View>
        )}

        {/* Divider */}
        <View style={[S.divider, { backgroundColor: C.border }]} />

        {/* Resend */}
        <View style={S.resendRow}>
          {resendCd > 0 ? (
            <Text style={[S.resendDisabled, { color: C.textMuted }]}>
              {fr ? `Renvoyer dans ${resendCd}s` : `Resend in ${resendCd}s`}
            </Text>
          ) : (
            <TouchableOpacity
              onPress={handleResend}
              disabled={resending}
              accessibilityLabel={fr ? "Renvoyer le code" : "Resend code"}
              accessibilityRole="button"
            >
              <Text style={[S.resendLink, { color: C.lavender }]}>
                {resending ? (fr ? "Envoi…" : "Sending…") : (fr ? "Renvoyer le code" : "Resend code")}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Open mail app */}
        <TouchableOpacity
          onPress={openMailApp}
          style={[S.mailBtn, { borderColor: C.border, backgroundColor: C.card }]}
          accessibilityLabel={fr ? "Ouvrir ma boîte mail" : "Open mail app"}
          accessibilityRole="button"
        >
          <Ionicons name="open-outline" size={16} color={C.textMuted} />
          <Text style={[S.mailBtnText, { color: C.textMuted }]}>
            {fr ? "Ouvrir ma boîte mail" : "Open mail app"}
          </Text>
        </TouchableOpacity>

        {/* Spam hint */}
        <Text style={[S.spamHint, { color: C.textMuted }]}>
          {fr ? "💡 Pensez à vérifier votre dossier Spams / Courrier indésirable." : "💡 Check your Spam or Junk folder if you don't see the email."}
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const makeStyles = (C: ReturnType<typeof import("@/context/AppContext").useColors>) =>
  StyleSheet.create({
    root:    { flex: 1 },
    content: { flex: 1, alignItems: "center", paddingHorizontal: 28, gap: 14, paddingTop: 10 },

    topBar:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 8 },
    cancelBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },

    expiryBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
    expiryText:  { fontSize: 13, fontFamily: "Inter_600SemiBold" },

    iconCircle: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center", borderWidth: 1.5, marginTop: 6 },

    title:     { fontSize: 22, fontFamily: "Inter_700Bold", color: C.text, textAlign: "center" },
    subtitle:  { fontSize: 14, fontFamily: "Inter_400Regular", color: C.textMuted, textAlign: "center" },
    emailText: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "center", maxWidth: 300 },

    partnerBanner:     { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, width: "100%" },
    partnerBannerText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },

    // OTP boxes
    boxRow: { flexDirection: "row", gap: 10, marginTop: 4 },
    box:    {
      width: 46, height: 58, borderRadius: 14, borderWidth: 2,
      fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center",
      ...Platform.select({ ios: {}, android: { paddingBottom: 0 } }),
    },

    // Error / info
    errorCard: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, width: "100%" },
    errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
    infoCard:  { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, width: "100%" },
    infoText:  { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },

    // Verify button
    verifyBtn:      { width: "100%" },
    verifyBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, paddingVertical: 16 },
    verifyBtnText:  { fontSize: 16, fontFamily: "Inter_700Bold" },

    // Loading
    loadingRow:  { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
    loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },

    divider: { height: 1, width: "100%", marginVertical: 4 },

    // Resend
    resendRow:     { alignItems: "center" },
    resendDisabled: { fontSize: 14, fontFamily: "Inter_400Regular" },
    resendLink:    { fontSize: 14, fontFamily: "Inter_700Bold" },

    // Mail
    mailBtn:     { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12, borderWidth: 1 },
    mailBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },

    // Spam hint
    spamHint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18, paddingHorizontal: 8 },

    // Success screen
    successRoot:      { flex: 1, alignItems: "center", justifyContent: "center", gap: 28, paddingHorizontal: 32 },
    successCircle:    { width: 140, height: 140, borderRadius: 70, borderWidth: 2, alignItems: "center", justifyContent: "center" },
    successIconInner: { width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center" },
    successTitle:     { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center" },
    successSub:       { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 23 },
  });
