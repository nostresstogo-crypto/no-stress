import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { safePush } from "@/lib/navigation";

import { useT, useApp, useColors } from "@/context/AppContext";
import { EventCard } from "@/components/EventCard";
import { ColorPalette } from "@/constants/colors";
import { LANG_LABELS, type Lang } from "@/constants/i18n";
import { formatDateTimeLocalized } from "@/lib/formatDate";
import { API_BASE, WEB_BASE } from "@/lib/apiBase";

const SUPPORT_WHATSAPP = "+13197774884";
const SUPPORT_WHATSAPP_URL = `https://wa.me/${SUPPORT_WHATSAPP.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Bonjour NoStress, j'ai besoin d'aide.")}`;

type Tab = "favorites" | "notifications";

const DELETION_REASONS = [
  { key: "not_useful", labelFr: "Je n'utilise plus l'application", labelEn: "I no longer use the app" },
  { key: "privacy", labelFr: "Préoccupations de confidentialité", labelEn: "Privacy concerns" },
  { key: "bad_experience", labelFr: "Mauvaise expérience utilisateur", labelEn: "Bad user experience" },
  { key: "too_many_notifs", labelFr: "Trop de notifications", labelEn: "Too many notifications" },
  { key: "found_alternative", labelFr: "J'ai trouvé une alternative", labelEn: "I found an alternative" },
  { key: "other", labelFr: "Autre raison", labelEn: "Other reason" },
] as const;

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    content: { paddingHorizontal: 20, gap: 16 },
    authPrompt: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 40,
      gap: 16,
    },
    authTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: C.text, textAlign: "center" },
    authSub: { fontSize: 15, fontFamily: "Inter_400Regular", color: C.textMuted, textAlign: "center" },
    loginBtn: {
      backgroundColor: C.lavender,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 32,
      width: "100%" as any,
      alignItems: "center" as const,
    },
    loginBtnText: { color: C.bg, fontSize: 16, fontFamily: "Inter_600SemiBold" },
    registerBtn: {
      borderWidth: 1,
      borderColor: C.lavender,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 32,
      width: "100%" as any,
      alignItems: "center" as const,
    },
    registerBtnText: { color: C.lavender, fontSize: 16, fontFamily: "Inter_600SemiBold" },
    profile: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    avatar: {
      width: 60, height: 60, borderRadius: 30,
      backgroundColor: C.lavender,
      alignItems: "center", justifyContent: "center",
      overflow: "hidden",
      borderWidth: 2,
      borderColor: C.card2,
    },
    avatarImage: { width: 60, height: 60, borderRadius: 30 },
    avatarText: { fontSize: 24, fontFamily: "Inter_700Bold", color: C.bg },
    profileInfo: { flex: 1, gap: 2 },
    profileName: { fontSize: 18, fontFamily: "Inter_700Bold", color: C.text },
    profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textMuted },
    roleBadge: {
      marginTop: 4,
      backgroundColor: C.card2,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      alignSelf: "flex-start",
    },
    roleText: {
      fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.lavender,
      textTransform: "uppercase", letterSpacing: 0.5,
    },
    card: {
      backgroundColor: C.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      overflow: "hidden",
    },
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    settingDivider: {
      height: 1,
      backgroundColor: C.border,
      marginHorizontal: 16,
    },
    settingLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: C.text },
    settingValue: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.textMuted },
    langToggle: {
      flexDirection: "row",
      backgroundColor: C.card2,
      borderRadius: 10,
      padding: 2,
      gap: 2,
    },
    langBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    langBtnActive: { backgroundColor: C.lavender },
    langBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.textMuted },
    langBtnTextActive: { color: C.bg },
    tabs: {
      flexDirection: "row",
      backgroundColor: C.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      padding: 4,
      gap: 4,
    },
    tabBtn: {
      flex: 1, flexDirection: "row", alignItems: "center",
      justifyContent: "center", paddingVertical: 10, borderRadius: 8, gap: 6,
    },
    tabBtnActive: { backgroundColor: C.card2 },
    tabText: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.textMuted },
    tabTextActive: { color: C.lavender, fontFamily: "Inter_600SemiBold" },
    badge: {
      backgroundColor: C.error,
      borderRadius: 8,
      minWidth: 18,
      height: 18,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    badgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: C.white },
    notifCard: {
      flexDirection: "row",
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: C.border,
      gap: 10,
    },
    notifUnread: { borderColor: C.lavender },
    notifDot: { width: 10, paddingTop: 4, alignItems: "center" },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.lavender },
    notifContent: { flex: 1, gap: 2 },
    notifTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text },
    notifBody: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textMuted },
    notifDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: C.textMuted, marginTop: 4 },
    empty: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 16 },
    emptyText: { fontSize: 15, fontFamily: "Inter_500Medium", color: C.textMuted },
    logoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.error,
      marginTop: 8,
    },
    logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.error },
  });
}

export default function AccountScreen() {
  const t = useT();
  const C = useColors();
  const { user, lang, setLang, logout, favorites, favoriteVenues, notifications, markAllRead, removeNotification, unreadCount, isDark, themeMode, setThemeMode, locationNotificationsEnabled, setLocationNotificationsEnabled, selectedCity, nearbyEventsCount, apiEvents, refreshApiEvents, syncMyEventsFromBackend } = useApp();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("favorites");
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const styles = useMemo(() => makeStyles(C), [C]);

  // Recharge favoris/notifications quand l'écran reprend le focus
  // (notifs marquées lues sur l'autre appareil, nouvel event favori
  // synchronisé en arrière-plan, statut d'event mis à jour, etc.)
  useFocusEffect(useCallback(() => {
    refreshApiEvents();
    if (user) syncMyEventsFromBackend();
  }, [user]));

  const handleOpenDeletionPage = () => {
    const accountType = user?.role === "structure" ? "partner" : "user";
    const params = new URLSearchParams({
      email: user?.email || "",
      name: user?.name || "",
      type: accountType,
    });
    const url = `${WEB_BASE}/suppression-compte?${params.toString()}`;
    const title = lang === "fr" ? "Suppression de compte" : "Account deletion";
    const message = lang === "fr"
      ? "Vous allez être redirigé vers notre site web pour soumettre votre demande de suppression. Elle sera traitée sous 30 jours et toutes vos données seront définitivement effacées.\n\nContinuer ?"
      : "You will be redirected to our website to submit your deletion request. It will be processed within 30 days and all your data will be permanently erased.\n\nContinue?";

    const open = () => {
      if (Platform.OS === "web") {
        try { window.open(url, "_blank", "noopener,noreferrer"); return; } catch {}
      }
      Linking.openURL(url).catch(() =>
        Alert.alert(
          t("error"),
          lang === "fr" ? "Impossible d'ouvrir le navigateur." : "Could not open browser.",
        ),
      );
    };

    if (Platform.OS === "web") {
      // Alert.alert on react-native-web ignores the buttons array, so use window.confirm.
      const ok = typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`);
      if (ok) open();
      return;
    }

    Alert.alert(title, message, [
      { text: lang === "fr" ? "Annuler" : "Cancel", style: "cancel" },
      { text: lang === "fr" ? "Continuer" : "Continue", style: "destructive", onPress: open },
    ]);
  };

  const favoriteEvents = apiEvents
    .filter((e) => favorites.includes(String(e.id)))
    .map((e) => ({
      id: String(e.id),
      title: e.title || e.titleFr || "",
      titleFr: e.titleFr || e.title || "",
      date: e.date,
      time: e.time || "",
      venue: e.venue || "",
      city: e.city || "",
      category: e.category || "",
      imageUrl: e.imageUrl,
      price: typeof e.price === "number" ? e.price : 0,
      status: e.status || "approved",
    }));

  if (!user) {
    return (
      <View style={[styles.root, { paddingTop: topInset }]}>
        <View style={styles.authPrompt}>
          <Ionicons name="person-circle-outline" size={80} color={C.border} />
          <Text style={styles.authTitle}>{t("loginRequired")}</Text>
          <Text style={styles.authSub}>{t("noAccount")}</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => safePush("/auth")}>
            <Text style={styles.loginBtnText}>{t("login")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.registerBtn} onPress={() => safePush("/auth")}>
            <Text style={styles.registerBtnText}>{t("register")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topInset + 12, paddingBottom: Platform.OS === "web" ? 118 : 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile header */}
      {(() => {
        const rawAvatar = user.avatarUrl || (user as any).profileImage || "";
        const avatarUri = rawAvatar
          ? (rawAvatar.startsWith("http") || rawAvatar.startsWith("data:") ? rawAvatar : `${API_BASE}${rawAvatar.startsWith("/") ? "" : "/"}${rawAvatar}`)
          : "";
        return (
          <TouchableOpacity style={styles.profile} onPress={() => safePush("/edit-profile")} activeOpacity={0.85}>
            <View style={styles.avatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
              )}
            </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user.name}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user.role}</Text>
          </View>
        </View>
            <Ionicons name="chevron-forward" size={22} color={C.textMuted} />
          </TouchableOpacity>
        );
      })()}
      <TouchableOpacity
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: C.lavender }}
        onPress={() => safePush("/edit-profile")}
      >
        <Ionicons name="create-outline" size={18} color={C.lavender} />
        <Text style={{ color: C.lavender, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{t("editProfile")}</Text>
      </TouchableOpacity>

      {user.role === "user" && user.emailVerified === false ? (
        <TouchableOpacity
          onPress={() => safePush({ pathname: "/verify-email", params: { email: user.email, role: "user" } })}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: "#3a2a18", borderRadius: 12, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: "#f0a830" }}
        >
          <Ionicons name="mail-unread" size={22} color="#f0a830" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#f0a830", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
              {lang === "fr" ? "Vérifiez votre email" : "Verify your email"}
            </Text>
            <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>
              {lang === "fr" ? "Saisissez le code reçu par email" : "Enter the code we sent you"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={C.textMuted} />
        </TouchableOpacity>
      ) : null}

      {/* Settings card */}
      <View style={styles.card}>
        {/* Language */}
        <View style={[styles.settingRow, { flexDirection: "column", alignItems: "flex-start", gap: 10 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, alignSelf: "stretch" }}>
            <Ionicons name="language" size={20} color={C.lavender} />
            <Text style={styles.settingLabel}>{t("language")}</Text>
          </View>
          <View style={[styles.langToggle, { flexWrap: "wrap" }]}>
            {(Object.keys(LANG_LABELS) as Lang[]).map((code) => (
              <TouchableOpacity
                key={code}
                style={[styles.langBtn, lang === code && styles.langBtnActive]}
                onPress={() => setLang(code)}
              >
                <Text style={[styles.langBtnText, lang === code && styles.langBtnTextActive]}>
                  {LANG_LABELS[code]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.settingDivider} />

        {/* WhatsApp Support */}
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => Linking.openURL(SUPPORT_WHATSAPP_URL).catch(() => Alert.alert(t("error"), lang === "fr" ? "Impossible d'ouvrir WhatsApp." : "Could not open WhatsApp."))}
        >
          <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          <Text style={styles.settingLabel}>
            {lang === "fr" ? "Support WhatsApp" : "WhatsApp support"}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <View style={styles.settingDivider} />

        {/* Privacy policy */}
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => router.push("/legal/privacy")}
        >
          <Ionicons name="shield-checkmark-outline" size={20} color={C.lavender} />
          <Text style={styles.settingLabel}>
            {lang === "fr" ? "Politique de confidentialité" : "Privacy policy"}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <View style={styles.settingDivider} />

        {/* Terms of use */}
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => router.push("/legal/terms")}
        >
          <Ionicons name="document-text-outline" size={20} color={C.lavender} />
          <Text style={styles.settingLabel}>
            {lang === "fr" ? "Conditions d'utilisation" : "Terms of use"}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <View style={styles.settingDivider} />

        {/* Dark / Light mode */}
        <View style={styles.settingRow}>
          <Ionicons
            name={isDark ? "moon" : "sunny"}
            size={20}
            color={isDark ? C.lavender : C.gold}
          />
          <Text style={styles.settingLabel}>
            {isDark ? (lang === "fr" ? "Mode nuit" : "Night mode") : (lang === "fr" ? "Mode jour" : "Day mode")}
          </Text>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            {/* Three-way: system / dark / light */}
            <TouchableOpacity
              onPress={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
              style={{
                width: 52, height: 30, borderRadius: 15,
                backgroundColor: isDark ? C.lavender : C.gold,
                justifyContent: "center",
                paddingHorizontal: 3,
              }}
            >
              <View style={{
                width: 24, height: 24, borderRadius: 12,
                backgroundColor: C.bg,
                alignSelf: isDark ? "flex-end" : "flex-start",
              }} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.settingDivider} />

        {/* System mode toggle */}
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => setThemeMode(themeMode === "system" ? "dark" : "system")}
        >
          <Ionicons name="phone-portrait-outline" size={20} color={C.textMuted} />
          <Text style={styles.settingLabel}>
            {lang === "fr" ? "Suivre le système" : "Follow system"}
          </Text>
          <Switch
            value={themeMode === "system"}
            onValueChange={(v) => setThemeMode(v ? "system" : "dark")}
            thumbColor={C.card}
            trackColor={{ false: C.border, true: C.lavender }}
          />
        </TouchableOpacity>

        {user && user.role === "user" && (
          <>
            <View style={styles.settingDivider} />
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setLocationNotificationsEnabled(!locationNotificationsEnabled)}
            >
              <Ionicons
                name={locationNotificationsEnabled ? "location" : "location-outline"}
                size={20}
                color={locationNotificationsEnabled ? C.lavender : C.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>
                  {lang === "fr" ? "Alertes de proximité" : "Nearby alerts"}
                </Text>
                {selectedCity && nearbyEventsCount > 0 && locationNotificationsEnabled && (
                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: C.lavender, marginTop: 1 }}>
                    {lang === "fr"
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
              />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "favorites" && styles.tabBtnActive]}
          onPress={() => setTab("favorites")}
        >
          <Ionicons name="heart" size={16} color={tab === "favorites" ? C.lavender : C.textMuted} />
          <Text style={[styles.tabText, tab === "favorites" && styles.tabTextActive]}>
            {t("favorites")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "notifications" && styles.tabBtnActive]}
          onPress={() => { setTab("notifications"); markAllRead(); }}
        >
          <Ionicons name="notifications" size={16} color={tab === "notifications" ? C.lavender : C.textMuted} />
          <Text style={[styles.tabText, tab === "notifications" && styles.tabTextActive]}>
            {t("notifications")}
          </Text>
          {unreadCount > 0 && tab !== "notifications" && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Tab content */}
      {tab === "favorites" ? (
        favoriteEvents.length > 0 || favoriteVenues.length > 0 ? (
          <>
            {favoriteEvents.map((e) => (
              <EventCard key={e.id} event={e} onPress={() => safePush(`/event/${e.id}`)} />
            ))}
            {favoriteVenues.length > 0 && (
              <>
                <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: C.text, marginTop: 8 }}>
                  {t("favoriteVenues")}
                </Text>
                {favoriteVenues.map((vid) => {
                  const navId = vid.startsWith("api_") ? vid : `api_${vid}`;
                  return (
                    <TouchableOpacity
                      key={`fv_${vid}`}
                      style={[styles.notifCard, { alignItems: "center" }]}
                      onPress={() => safePush(`/venue/${navId}`)}
                    >
                      <Ionicons name="location" size={20} color={C.lavender} />
                      <Text style={[styles.notifTitle, { flex: 1 }]}>#{vid}</Text>
                      <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={48} color={C.border} />
            <Text style={styles.emptyText}>{t("noFavorites")}</Text>
          </View>
        )
      ) : (
        notifications.length > 0 ? (
          notifications.map((n) => (
            <View key={n.id} style={[styles.notifCard, !n.read && styles.notifUnread]}>
              <View style={styles.notifDot}>
                {!n.read && <View style={styles.dot} />}
              </View>
              <View style={styles.notifContent}>
                <Text style={styles.notifTitle}>{lang === "fr" ? n.titleFr : n.title}</Text>
                <Text style={styles.notifBody}>{lang === "fr" ? n.bodyFr : n.body}</Text>
                <Text style={styles.notifDate}>{formatDateTimeLocalized(n.createdAt, lang)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => removeNotification(n.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ padding: 4 }}
              >
                <Ionicons name="close-circle-outline" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.empty}>
            <Ionicons name="notifications-outline" size={48} color={C.border} />
            <Text style={styles.emptyText}>{t("noNotifications")}</Text>
          </View>
        )
      )}

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color={C.error} />
        <Text style={styles.logoutText}>{t("logout")}</Text>
      </TouchableOpacity>

      {/* Delete Account — redirige vers la page web /suppression-compte */}
      <TouchableOpacity
        style={[styles.logoutBtn, { borderColor: C.error, backgroundColor: C.error + "10", marginTop: 0 }]}
        onPress={handleOpenDeletionPage}
      >
        <Ionicons name="trash-outline" size={20} color={C.error} />
        <Text style={styles.logoutText}>{t("deleteAccount")}</Text>
        <Ionicons name="open-outline" size={16} color={C.error} style={{ marginLeft: 6 }} />
      </TouchableOpacity>
    </ScrollView>
  );
}
