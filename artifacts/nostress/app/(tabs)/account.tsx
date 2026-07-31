/**
 * account.tsx — Phase 5 refonte
 *
 * Organisation :
 *   Non connecté  → Connexion / Inscription + réglages invité
 *   Connecté      → Profil · Compte · Préférences · Assistance · Zone sensible
 *
 * Règles :
 *   - Tous les hooks avant le premier return conditionnel.
 *   - Aucune route fictive : on navigue uniquement vers des écrans existants.
 *   - useColors() + useApp() uniquement pour les contextes.
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { safePush } from "@/lib/navigation";

import { useT, useApp, useColors } from "@/context/AppContext";
import { useNetwork, type DataSaverMode } from "@/context/NetworkContext";
import { ColorPalette } from "@/constants/colors";
import { LANG_LABELS, type Lang } from "@/constants/i18n";
import { API_BASE } from "@/lib/apiBase";

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPPORT_WHATSAPP_URL = `https://wa.me/22872770767?text=${encodeURIComponent("Bonjour NoStress, j'ai besoin d'aide.")}`;

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    content: { paddingHorizontal: 14, gap: 12 },

    // ── Guest ────────────────────────────────────────────────────────────────
    authPrompt: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      gap: 12,
    },
    authTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: C.text, textAlign: "center" },
    authSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.textMuted, textAlign: "center", lineHeight: 20 },
    authBtnPrimary: {
      backgroundColor: C.lavender,
      borderRadius: 12,
      paddingVertical: 15,
      width: "100%" as any,
      alignItems: "center" as const,
    },
    authBtnPrimaryText: { color: C.bg, fontSize: 15, fontFamily: "Inter_600SemiBold" },
    authBtnSecondary: {
      borderWidth: 1.5,
      borderColor: C.lavender,
      borderRadius: 12,
      paddingVertical: 14,
      width: "100%" as any,
      alignItems: "center" as const,
    },
    authBtnSecondaryText: { color: C.lavender, fontSize: 15, fontFamily: "Inter_600SemiBold" },
    guestDivider: {
      width: "100%" as any,
      height: 1,
      backgroundColor: C.border,
      marginVertical: 8,
    },

    // ── Profile card ─────────────────────────────────────────────────────────
    profileCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    avatar: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: C.lavender,
      alignItems: "center", justifyContent: "center",
      overflow: "hidden",
      borderWidth: 2,
      borderColor: C.card2,
    },
    avatarImage: { width: 64, height: 64, borderRadius: 32 },
    avatarText: { fontSize: 26, fontFamily: "Inter_700Bold", color: C.bg },
    profileInfo: { flex: 1, gap: 2 },
    profileName: { fontSize: 17, fontFamily: "Inter_700Bold", color: C.text },
    profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textMuted },
    roleBadge: {
      marginTop: 5,
      backgroundColor: C.card2,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      alignSelf: "flex-start",
    },
    roleText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.lavender, textTransform: "uppercase", letterSpacing: 0.5 },

    // ── Unverified email banner ───────────────────────────────────────────────
    unverifiedBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      backgroundColor: "#3a2a18",
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: "#f0a830",
    },
    unverifiedTitle: { color: "#f0a830", fontFamily: "Inter_600SemiBold", fontSize: 14 },
    unverifiedSub: { color: "#b09070", fontSize: 12, marginTop: 2, fontFamily: "Inter_400Regular" },
    unverifiedActions: { flexDirection: "row", gap: 8, marginTop: 8 },
    unverifiedBtnPrimary: {
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
      backgroundColor: "#f0a830",
    },
    unverifiedBtnPrimaryText: { color: "#1a0e00", fontSize: 12, fontFamily: "Inter_600SemiBold" },
    unverifiedBtnSecondary: {
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
      borderWidth: 1, borderColor: "#f0a83060",
    },
    unverifiedBtnSecondaryText: { color: "#f0a830", fontSize: 12, fontFamily: "Inter_500Medium" },

    // ── Partner status card ───────────────────────────────────────────────────
    partnerCard: {
      backgroundColor: C.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      padding: 14,
      gap: 6,
    },
    partnerCardRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    partnerCardLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textMuted },
    partnerStatusBadge: {
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
      alignSelf: "flex-start",
    },
    partnerStatusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

    // ── Section cards ────────────────────────────────────────────────────────
    card: {
      backgroundColor: C.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      overflow: "hidden",
    },
    sectionHeader: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: C.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 6,
      marginLeft: 4,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    rowLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: C.text },
    rowValue: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.textMuted },
    divider: { height: 1, backgroundColor: C.border, marginHorizontal: 16 },
    iconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
    badge: {
      backgroundColor: C.error, borderRadius: 8, minWidth: 18, height: 18,
      alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
    },
    badgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: C.white },

    // ── Language / theme chips ────────────────────────────────────────────────
    chipsWrap: { paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
    chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    chip: {
      flexDirection: "row", alignItems: "center", gap: 6,
      paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card2,
    },
    chipActive: { borderColor: C.lavender, backgroundColor: C.lavender + "20" },
    chipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.textMuted },
    chipTextActive: { color: C.text, fontFamily: "Inter_600SemiBold" },

    // ── Logout button ────────────────────────────────────────────────────────
    logoutBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      paddingVertical: 15, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    },
    logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.text },

    // ── Danger zone ──────────────────────────────────────────────────────────
    dangerZone: {
      backgroundColor: C.error + "0c",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.error + "40",
      overflow: "hidden",
    },
    dangerHeader: {
      flexDirection: "row", alignItems: "center", gap: 8,
      paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    },
    dangerTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: C.error, textTransform: "uppercase", letterSpacing: 0.5 },
    dangerDesc: {
      fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular",
      color: C.textMuted, paddingHorizontal: 16, paddingBottom: 14,
    },
    dangerDivider: { height: 1, backgroundColor: C.error + "30" },
    deleteBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      paddingVertical: 15, paddingHorizontal: 16,
    },
    deleteBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.error },

    // ── Guest settings ────────────────────────────────────────────────────────
    guestSettings: {
      width: "100%" as any,
      paddingTop: 20,
      gap: 6,
    },
    guestSettingLabel: {
      flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6,
    },
    guestSettingLabelText: {
      fontSize: 11, fontFamily: "Inter_500Medium", color: C.textMuted,
      textTransform: "uppercase", letterSpacing: 0.5,
    },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function partnerStatusColor(status?: string): { bg: string; text: string } {
  switch (status) {
    case "approved":  return { bg: "#27ae6020", text: "#27ae60" };
    case "pending":   return { bg: "#f0a83020", text: "#f0a830" };
    case "rejected":  return { bg: "#e0525220", text: "#e05252" };
    default:          return { bg: "#80808020", text: "#808080" };
  }
}

type SubscriptionState = "active" | "expiring_soon" | "expired" | "none";

function subscriptionState(subscriptionUntil?: string | null): SubscriptionState {
  if (!subscriptionUntil) return "none";
  const until = new Date(subscriptionUntil);
  const now = new Date();
  if (until < now) return "expired";
  const diffMs = until.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays <= 7) return "expiring_soon";
  return "active";
}

function subscriptionPillColors(state: SubscriptionState): { bg: string; text: string } {
  switch (state) {
    case "active":        return { bg: "#27ae6020", text: "#27ae60" };
    case "expiring_soon": return { bg: "#f0a83020", text: "#f0a830" };
    case "expired":       return { bg: "#e0525220", text: "#e05252" };
    default:              return { bg: "#80808020", text: "#808080" };
  }
}

function formatSubscriptionDate(iso: string, fr: boolean): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(fr ? "fr-FR" : "en-US", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AccountScreen() {
  // ── Hooks (ALL before any conditional return) ────────────────────────────
  const t = useT();
  const C = useColors();
  const {
    user, lang, setLang, logout, unreadCount,
    themeMode, setThemeMode,
    locationNotificationsEnabled, setLocationNotificationsEnabled,
    selectedCity, nearbyEventsCount,
    refreshApiEvents, syncMyEventsFromBackend,
  } = useApp();
  const { dataSaverMode, setDataSaverMode } = useNetwork();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const styles = useMemo(() => makeStyles(C), [C]);

  const [deletionLoading, setDeletionLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  // Re-sync on focus
  useFocusEffect(useCallback(() => {
    refreshApiEvents();
    if (user) syncMyEventsFromBackend();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]));

  // ── Callbacks ────────────────────────────────────────────────────────────

  const handleLogout = useCallback(() => {
    const fr = lang === "fr";
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(fr ? "Déconnexion — Êtes-vous sûr ?" : "Log out — Are you sure?")) logout();
      return;
    }
    Alert.alert(
      fr ? "Déconnexion" : "Log out",
      fr
        ? "Êtes-vous sûr de vouloir vous déconnecter ?"
        : "Are you sure you want to log out?",
      [
        { text: fr ? "Annuler" : "Cancel", style: "cancel" },
        { text: fr ? "Se déconnecter" : "Log out", style: "destructive", onPress: logout },
      ],
    );
  }, [lang, logout]);

  const handleDeleteAccount = useCallback(() => {
    if (!user) return;
    const fr = lang === "fr";
    const submit = async () => {
      setDeletionLoading(true);
      try {
        const res = await fetch(`${API_BASE}/account/deletion-request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            name: user.name,
            accountType: user.role === "structure" ? "partner" : "user",
            reason: "in_app_request",
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          Alert.alert(
            fr ? "Demande envoyée" : "Request submitted",
            fr
              ? "Votre demande de suppression a été reçue et sera traitée dans un délai maximum de 30 jours. Vous serez notifié par email."
              : "Your deletion request has been received and will be processed within 30 days. You'll be notified by email.",
            [{ text: "OK", onPress: logout }],
          );
        } else if (res.status === 409) {
          Alert.alert(
            fr ? "Demande déjà en cours" : "Request already pending",
            fr
              ? "Une demande de suppression est déjà en cours pour ce compte."
              : "A deletion request is already pending for this account.",
          );
        } else {
          Alert.alert(
            t("error"),
            data?.error ?? (fr ? "Une erreur est survenue." : "An error occurred."),
          );
        }
      } catch {
        Alert.alert(t("error"), fr ? "Impossible de joindre le serveur." : "Could not reach the server.");
      } finally {
        setDeletionLoading(false);
      }
    };

    if (Platform.OS === "web") {
      const ok = typeof window !== "undefined" && window.confirm(
        fr
          ? "Supprimer mon compte — Cette action est irréversible. Confirmer ?"
          : "Delete my account — This action cannot be undone. Confirm?",
      );
      if (ok) submit();
      return;
    }

    Alert.alert(
      fr ? "Supprimer mon compte" : "Delete my account",
      fr
        ? "Votre demande sera traitée sous 30 jours. Toutes vos données seront définitivement effacées.\n\nCette action est irréversible."
        : "Your request will be processed within 30 days. All your data will be permanently erased.\n\nThis action cannot be undone.",
      [
        { text: fr ? "Annuler" : "Cancel", style: "cancel" },
        { text: fr ? "Supprimer" : "Delete", style: "destructive", onPress: submit },
      ],
    );
  }, [user, lang, logout, t]);

  const handleResendVerification = useCallback(async () => {
    if (!user || resendLoading || resendSent) return;
    setResendLoading(true);
    try {
      const endpoint = user.role === "structure"
        ? `${API_BASE}/partners/resend-verification`
        : `${API_BASE}/auth/resend-verification`;
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      setResendSent(true);
      // Navigate to verify-email so the user can enter the code
      setTimeout(() => {
        safePush({
          pathname: "/verify-email",
          params: { email: user.email, role: user.role === "structure" ? "partner" : "user" },
        });
      }, 400);
    } catch {
      const fr = lang === "fr";
      Alert.alert(fr ? "Erreur réseau" : "Network error", fr ? "Impossible d'envoyer le code." : "Could not send the code.");
    } finally {
      setResendLoading(false);
    }
  }, [user, lang, resendLoading, resendSent]);

  const handleGoVerify = useCallback(() => {
    if (!user) return;
    safePush({
      pathname: "/verify-email",
      params: { email: user.email, role: user.role === "structure" ? "partner" : "user" },
    });
  }, [user]);

  const openWhatsApp = useCallback(() => {
    Linking.openURL(SUPPORT_WHATSAPP_URL).catch(() =>
      Alert.alert(t("error"), lang === "fr" ? "Impossible d'ouvrir WhatsApp." : "Could not open WhatsApp."),
    );
  }, [lang, t]);

  // ── Avatar URL helper ────────────────────────────────────────────────────
  const avatarUri = useMemo(() => {
    const raw = user?.avatarUrl || (user as any)?.profileImage || "";
    if (!raw) return "";
    return raw.startsWith("http") || raw.startsWith("data:")
      ? raw
      : `${API_BASE}${raw.startsWith("/") ? "" : "/"}${raw}`;
  }, [user]);

  const fr = lang === "fr";

  // ─────────────────────────────────────────────────────────────────────────
  // Guest view (non connecté)
  // ─────────────────────────────────────────────────────────────────────────
  if (!user) {
    const themeOptions: Array<{ mode: "light" | "dark" | "system"; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = [
      { mode: "light",  label: fr ? "Jour"   : "Day",   icon: "sunny",             color: C.gold    },
      { mode: "dark",   label: fr ? "Nuit"   : "Night", icon: "moon",              color: C.lavender },
      { mode: "system", label: "Auto",                  icon: "phone-portrait",    color: "#5FD4F5"  },
    ];

    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.authPrompt,
          { paddingTop: topInset + 20, paddingBottom: 60 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Ionicons name="person-circle-outline" size={80} color={C.border} />
        <Text style={styles.authTitle}>{t("loginRequired")}</Text>
        <Text style={styles.authSub}>{t("noAccount")}</Text>

        <TouchableOpacity
          style={[styles.authBtnPrimary, { marginTop: 8 }]}
          onPress={() => safePush("/auth?mode=login")}
          accessibilityLabel={fr ? "Se connecter" : "Log in"}
          accessibilityRole="button"
        >
          <Text style={styles.authBtnPrimaryText}>{t("login")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.authBtnSecondary}
          onPress={() => safePush("/auth?mode=register")}
          accessibilityLabel={fr ? "Créer un compte" : "Create an account"}
          accessibilityRole="button"
        >
          <Text style={styles.authBtnSecondaryText}>{t("register")}</Text>
        </TouchableOpacity>

        {/* Guest preferences */}
        <View style={styles.guestDivider} />

        <View style={[styles.guestSettings, { width: "100%" }]}>
          {/* Language */}
          <View style={styles.guestSettingLabel}>
            <Ionicons name="language-outline" size={14} color={C.textMuted} />
            <Text style={styles.guestSettingLabelText}>{t("language")}</Text>
          </View>
          <View style={styles.chipRow}>
            {(Object.keys(LANG_LABELS) as Lang[]).map((code) => {
              const active = lang === code;
              return (
                <TouchableOpacity
                  key={code}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setLang(code)}
                  accessibilityLabel={LANG_LABELS[code]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {LANG_LABELS[code]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Theme — 3 options */}
          <View style={[styles.guestSettingLabel, { marginTop: 14 }]}>
            <Ionicons name="color-palette-outline" size={14} color={C.textMuted} />
            <Text style={styles.guestSettingLabelText}>{fr ? "Thème" : "Theme"}</Text>
          </View>
          <View style={styles.chipRow}>
            {themeOptions.map(({ mode, label, icon, color }) => {
              const active = themeMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.chip, active && { borderColor: color, backgroundColor: color + "20" }]}
                  onPress={() => setThemeMode(mode)}
                  accessibilityLabel={label}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons name={icon} size={14} color={active ? color : C.textMuted} />
                  <Text style={[styles.chipText, active && { color: C.text, fontFamily: "Inter_600SemiBold" }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Authenticated view
  // ─────────────────────────────────────────────────────────────────────────

  const isPartner = user.role === "structure";
  const roleLabel = isPartner
    ? (fr ? "Partenaire" : "Partner")
    : (fr ? "Utilisateur" : "User");

  const partnerStatusLabels: Record<string, string> = {
    approved: fr ? "Approuvé" : "Approved",
    pending:  fr ? "En attente d'approbation" : "Pending approval",
    rejected: fr ? "Demande refusée" : "Application rejected",
  };
  const psColors = partnerStatusColor(user.partnerStatus);

  const themeOptions: Array<{ mode: "light" | "dark" | "system"; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = [
    { mode: "light",  label: fr ? "Jour"   : "Day",   icon: "sunny",          color: C.gold     },
    { mode: "dark",   label: fr ? "Nuit"   : "Night", icon: "moon",           color: C.lavender },
    { mode: "system", label: "Auto",                  icon: "phone-portrait", color: "#5FD4F5"  },
  ];

  const dataSaverOptions: Array<{ value: DataSaverMode; label: string }> = [
    { value: "auto", label: "Auto" },
    { value: "on",   label: fr ? "Activé"    : "On"  },
    { value: "off",  label: fr ? "Désactivé" : "Off" },
  ];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topInset + 12, paddingBottom: Platform.OS === "web" ? 120 : 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Profile card ──────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.profileCard}
        onPress={() => safePush("/edit-profile")}
        activeOpacity={0.85}
        accessibilityLabel={fr ? "Modifier le profil" : "Edit profile"}
        accessibilityRole="button"
      >
        <View style={styles.avatar}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <Text style={styles.avatarText}>{(user.name || user.email).charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName} numberOfLines={1}>{user.name || user.email}</Text>
          <Text style={styles.profileEmail} numberOfLines={1}>{user.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{roleLabel}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={C.textMuted} />
      </TouchableOpacity>

      {/* ── Email not verified banner ──────────────────────────────────────── */}
      {!isPartner && user.emailVerified === false && (
        <View
          style={styles.unverifiedBanner}
          accessibilityRole="alert"
          accessibilityLabel={fr ? "Email non vérifié" : "Email not verified"}
        >
          <Ionicons name="mail-unread" size={22} color="#f0a830" />
          <View style={{ flex: 1 }}>
            <Text style={styles.unverifiedTitle}>
              {fr ? "Email non vérifié" : "Email not verified"}
            </Text>
            <Text style={styles.unverifiedSub}>
              {fr
                ? "Vérifiez votre boîte de réception (et le dossier Spams)."
                : "Check your inbox (and your Spam folder)."}
            </Text>
            <View style={styles.unverifiedActions}>
              <TouchableOpacity
                style={styles.unverifiedBtnPrimary}
                onPress={handleResendVerification}
                disabled={resendLoading || resendSent}
                accessibilityLabel={fr ? "Renvoyer le code" : "Resend code"}
                accessibilityRole="button"
              >
                {resendLoading ? (
                  <ActivityIndicator size="small" color="#1a0e00" />
                ) : (
                  <Text style={styles.unverifiedBtnPrimaryText}>
                    {resendSent
                      ? (fr ? "Code envoyé ✓" : "Code sent ✓")
                      : (fr ? "Renvoyer le code" : "Resend code")}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.unverifiedBtnSecondary}
                onPress={handleGoVerify}
                accessibilityLabel={fr ? "Saisir mon code" : "Enter my code"}
                accessibilityRole="button"
              >
                <Text style={styles.unverifiedBtnSecondaryText}>
                  {fr ? "Saisir le code" : "Enter code"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── Partner status card ────────────────────────────────────────────── */}
      {isPartner && user.partnerStatus && (
        <View style={styles.partnerCard}>
          <View style={styles.partnerCardRow}>
            <Ionicons name="briefcase-outline" size={16} color={C.textMuted} />
            <Text style={styles.partnerCardLabel}>
              {fr ? "Statut du compte partenaire" : "Partner account status"}
            </Text>
          </View>
          <View style={[styles.partnerStatusBadge, { backgroundColor: psColors.bg }]}>
            <Text style={[styles.partnerStatusText, { color: psColors.text }]}>
              {partnerStatusLabels[user.partnerStatus] ?? user.partnerStatus}
            </Text>
          </View>
          {user.partnerStatus === "pending" && (
            <Text style={[styles.partnerCardLabel, { fontSize: 11, marginTop: 2 }]}>
              {fr
                ? "L'équipe NoStress examine votre demande (24–48h)."
                : "The NoStress team is reviewing your application (24–48h)."}
            </Text>
          )}
          {user.partnerStatus === "rejected" && user.partnerRejectionReason && (
            <Text style={[styles.partnerCardLabel, { fontSize: 11, marginTop: 2, color: "#e05252" }]}>
              {user.partnerRejectionReason}
            </Text>
          )}

          {/* ── Subscription expiry ─────────────────────────────────────── */}
          {user.subscriptionUntil != null && (() => {
            const subState = subscriptionState(user.subscriptionUntil);
            const pillColors = subscriptionPillColors(subState);
            const pillLabel = {
              active:        fr ? "Actif"           : "Active",
              expiring_soon: fr ? "Expire bientôt"  : "Expiring soon",
              expired:       fr ? "Expiré"           : "Expired",
              none:          "",
            }[subState];
            const expiryLabel = {
              active:        fr ? "Abonnement valide jusqu'au" : "Subscription valid until",
              expiring_soon: fr ? "Expire le"                  : "Expires on",
              expired:       fr ? "Expiré le"                  : "Expired on",
              none:          "",
            }[subState];
            return (
              <View style={{ marginTop: 10, gap: 4 }}>
                <View style={styles.partnerCardRow}>
                  <Ionicons name="card-outline" size={14} color={C.textMuted} />
                  <Text style={styles.partnerCardLabel}>
                    {fr ? "Abonnement" : "Subscription"}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <View style={[styles.partnerStatusBadge, { backgroundColor: pillColors.bg }]}>
                    <Text style={[styles.partnerStatusText, { color: pillColors.text }]}>
                      {pillLabel}
                    </Text>
                  </View>
                  <Text style={[styles.partnerCardLabel, { fontSize: 12 }]}>
                    {expiryLabel} {formatSubscriptionDate(user.subscriptionUntil!, fr)}
                  </Text>
                </View>
              </View>
            );
          })()}
        </View>
      )}

      {/* ── Section : Mon compte ───────────────────────────────────────────── */}
      <Text style={styles.sectionHeader}>{fr ? "Mon compte" : "My account"}</Text>
      <View style={styles.card}>
        {/* Modifier le profil */}
        <TouchableOpacity
          style={styles.row}
          onPress={() => safePush("/edit-profile")}
          accessibilityLabel={fr ? "Modifier le profil" : "Edit profile"}
          accessibilityRole="button"
        >
          <View style={[styles.iconWrap, { backgroundColor: C.lavender + "18" }]}>
            <Ionicons name="create-outline" size={18} color={C.lavender} />
          </View>
          <Text style={styles.rowLabel}>{t("editProfile")}</Text>
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Changer le mot de passe */}
        <TouchableOpacity
          style={styles.row}
          onPress={() => safePush("/change-password")}
          accessibilityLabel={fr ? "Changer le mot de passe" : "Change password"}
          accessibilityRole="button"
        >
          <View style={[styles.iconWrap, { backgroundColor: C.lavender + "18" }]}>
            <Ionicons name="lock-closed-outline" size={18} color={C.lavender} />
          </View>
          <Text style={styles.rowLabel}>{t("changePassword")}</Text>
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Notifications */}
        <TouchableOpacity
          style={styles.row}
          onPress={() => safePush("/notifications")}
          accessibilityLabel={fr ? "Notifications" : "Notifications"}
          accessibilityRole="button"
        >
          <View style={[styles.iconWrap, { backgroundColor: C.lavender + "18" }]}>
            <Ionicons name="notifications-outline" size={18} color={C.lavender} />
          </View>
          <Text style={styles.rowLabel}>{t("notifications")}</Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { marginRight: 4 }]}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : String(unreadCount)}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Favoris */}
        <TouchableOpacity
          style={styles.row}
          onPress={() => safePush("/favorites")}
          accessibilityLabel={fr ? "Mes favoris" : "My favorites"}
          accessibilityRole="button"
        >
          <View style={[styles.iconWrap, { backgroundColor: C.error + "15" }]}>
            <Ionicons name="heart-outline" size={18} color={C.error} />
          </View>
          <Text style={styles.rowLabel}>{t("favorites")}</Text>
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ── Section : Préférences ──────────────────────────────────────────── */}
      <Text style={styles.sectionHeader}>{fr ? "Préférences" : "Preferences"}</Text>
      <View style={styles.card}>
        {/* Langue */}
        <View style={[styles.row, { alignItems: "flex-start" }]}>
          <View style={[styles.iconWrap, { backgroundColor: C.textMuted + "18", marginTop: 2 }]}>
            <Ionicons name="language" size={18} color={C.textMuted} />
          </View>
          <View style={{ flex: 1, gap: 10 }}>
            <Text style={styles.rowLabel}>{t("language")}</Text>
            <View style={styles.chipRow}>
              {(Object.keys(LANG_LABELS) as Lang[]).map((code) => {
                const active = lang === code;
                return (
                  <TouchableOpacity
                    key={code}
                    style={[styles.chip, { paddingVertical: 6 }, active && styles.chipActive]}
                    onPress={() => setLang(code)}
                    accessibilityLabel={LANG_LABELS[code]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {LANG_LABELS[code]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Thème — 3 options */}
        <View style={[styles.row, { alignItems: "flex-start" }]}>
          <View style={[styles.iconWrap, { backgroundColor: C.textMuted + "18", marginTop: 2 }]}>
            <Ionicons name="color-palette-outline" size={18} color={C.textMuted} />
          </View>
          <View style={{ flex: 1, gap: 10 }}>
            <Text style={styles.rowLabel}>{fr ? "Thème" : "Theme"}</Text>
            <View style={styles.chipRow}>
              {themeOptions.map(({ mode, label, icon, color }) => {
                const active = themeMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.chip, { paddingVertical: 6 }, active && { borderColor: color, backgroundColor: color + "20" }]}
                    onPress={() => setThemeMode(mode)}
                    accessibilityLabel={label}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Ionicons name={icon} size={13} color={active ? color : C.textMuted} />
                    <Text style={[styles.chipText, active && { color: C.text, fontFamily: "Inter_600SemiBold" }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Économie de données */}
        <View style={[styles.row, { alignItems: "flex-start" }]}>
          <View style={[styles.iconWrap, { backgroundColor: C.textMuted + "18", marginTop: 2 }]}>
            <Ionicons name="cellular-outline" size={18} color={C.textMuted} />
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            <View>
              <Text style={styles.rowLabel}>{fr ? "Économie de données" : "Data saver"}</Text>
              <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: C.textMuted, marginTop: 1 }}>
                {fr
                  ? "Réduit la qualité des images sur une connexion lente."
                  : "Reduces image quality on slow connections."}
              </Text>
            </View>
            <View style={styles.chipRow}>
              {dataSaverOptions.map(({ value, label }) => {
                const active = dataSaverMode === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.chip, { paddingVertical: 6 }, active && styles.chipActive]}
                    onPress={() => setDataSaverMode(value)}
                    accessibilityLabel={label}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Alertes de proximité — users only */}
        {!isPartner && (
          <>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: C.textMuted + "18" }]}>
                <Ionicons
                  name={locationNotificationsEnabled ? "location" : "location-outline"}
                  size={18}
                  color={locationNotificationsEnabled ? C.lavender : C.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{fr ? "Alertes de proximité" : "Nearby alerts"}</Text>
                {selectedCity && nearbyEventsCount > 0 && locationNotificationsEnabled && (
                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: C.lavender, marginTop: 1 }}>
                    {fr
                      ? `${nearbyEventsCount} événement${nearbyEventsCount > 1 ? "s" : ""} à ${selectedCity}`
                      : `${nearbyEventsCount} event${nearbyEventsCount > 1 ? "s" : ""} in ${selectedCity}`}
                  </Text>
                )}
              </View>
              <Switch
                value={locationNotificationsEnabled}
                onValueChange={setLocationNotificationsEnabled}
                thumbColor={C.card}
                trackColor={{ false: C.border, true: C.lavender }}
                accessibilityLabel={fr ? "Alertes de proximité" : "Nearby alerts"}
              />
            </View>
          </>
        )}
      </View>

      {/* ── Section : Assistance ───────────────────────────────────────────── */}
      <Text style={styles.sectionHeader}>{fr ? "Assistance" : "Support"}</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => safePush("/ai-assistant")}
          accessibilityLabel={fr ? "Assistant IA" : "AI Assistant"}
          accessibilityRole="button"
        >
          <View style={[styles.iconWrap, { backgroundColor: "#5A46C018" }]}>
            <Ionicons name="sparkles" size={18} color="#7C5CFC" />
          </View>
          <Text style={styles.rowLabel}>{fr ? "Assistant IA" : "AI Assistant"}</Text>
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.row}
          onPress={openWhatsApp}
          accessibilityLabel={fr ? "Contacter le support WhatsApp" : "Contact WhatsApp support"}
          accessibilityRole="button"
        >
          <View style={[styles.iconWrap, { backgroundColor: "#25D36618" }]}>
            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
          </View>
          <Text style={styles.rowLabel}>{fr ? "Support WhatsApp" : "WhatsApp support"}</Text>
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push("/legal/privacy")}
          accessibilityLabel={fr ? "Politique de confidentialité" : "Privacy policy"}
          accessibilityRole="button"
        >
          <View style={[styles.iconWrap, { backgroundColor: C.lavender + "18" }]}>
            <Ionicons name="shield-checkmark-outline" size={18} color={C.lavender} />
          </View>
          <Text style={styles.rowLabel}>{fr ? "Politique de confidentialité" : "Privacy policy"}</Text>
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push("/legal/terms")}
          accessibilityLabel={fr ? "Conditions d'utilisation" : "Terms of use"}
          accessibilityRole="button"
        >
          <View style={[styles.iconWrap, { backgroundColor: C.lavender + "18" }]}>
            <Ionicons name="document-text-outline" size={18} color={C.lavender} />
          </View>
          <Text style={styles.rowLabel}>{fr ? "Conditions d'utilisation" : "Terms of use"}</Text>
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ── Déconnexion ────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        accessibilityLabel={fr ? "Se déconnecter" : "Log out"}
        accessibilityRole="button"
      >
        <Ionicons name="log-out-outline" size={20} color={C.text} />
        <Text style={styles.logoutText}>{t("logout")}</Text>
      </TouchableOpacity>

      {/* ── Zone sensible ──────────────────────────────────────────────────── */}
      <View style={styles.dangerZone}>
        <View style={styles.dangerHeader}>
          <Ionicons name="warning-outline" size={16} color={C.error} />
          <Text style={styles.dangerTitle}>{fr ? "Zone sensible" : "Danger zone"}</Text>
        </View>
        <Text style={styles.dangerDesc}>
          {fr
            ? "La suppression de votre compte est irréversible. Une demande sera transmise à notre équipe et traitée sous 30 jours. Toutes vos données et favoris seront définitivement effacés."
            : "Deleting your account is irreversible. A request will be sent to our team and processed within 30 days. All your data and favorites will be permanently erased."}
        </Text>
        <View style={styles.dangerDivider} />
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDeleteAccount}
          disabled={deletionLoading}
          accessibilityLabel={fr ? "Supprimer mon compte" : "Delete my account"}
          accessibilityRole="button"
          accessibilityState={{ disabled: deletionLoading }}
        >
          {deletionLoading ? (
            <ActivityIndicator color={C.error} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color={C.error} />
              <Text style={styles.deleteBtnText}>{t("deleteAccount")}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
