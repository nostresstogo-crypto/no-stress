import React, { useState } from "react";
import {
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
import { router } from "expo-router";

import { C } from "@/constants/colors";
import { useT, useApp } from "@/context/AppContext";
import { MOCK_EVENTS } from "@/constants/data";
import { EventCard } from "@/components/EventCard";

type Tab = "favorites" | "notifications";

export default function AccountScreen() {
  const t = useT();
  const { user, lang, setLang, logout, favorites, notifications, markAllRead, unreadCount } = useApp();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("favorites");
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const favoriteEvents = MOCK_EVENTS.filter((e) => favorites.includes(e.id));

  if (!user) {
    return (
      <View style={[styles.root, { paddingTop: topInset }]}>
        <View style={styles.authPrompt}>
          <Ionicons name="person-circle-outline" size={80} color={C.border} />
          <Text style={styles.authTitle}>{t("loginRequired")}</Text>
          <Text style={styles.authSub}>{t("noAccount")}</Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push("/auth")}
          >
            <Text style={styles.loginBtnText}>{t("login")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => router.push("/auth")}
          >
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
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user.name}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user.role}</Text>
          </View>
        </View>
      </View>

      {/* Settings */}
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <Ionicons name="language" size={20} color={C.lavender} />
          <Text style={styles.settingLabel}>{t("language")}</Text>
          <View style={styles.langToggle}>
            <TouchableOpacity
              style={[styles.langBtn, lang === "fr" && styles.langBtnActive]}
              onPress={() => setLang("fr")}
            >
              <Text style={[styles.langBtnText, lang === "fr" && styles.langBtnTextActive]}>FR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, lang === "en" && styles.langBtnActive]}
              onPress={() => setLang("en")}
            >
              <Text style={[styles.langBtnText, lang === "en" && styles.langBtnTextActive]}>EN</Text>
            </TouchableOpacity>
          </View>
        </View>
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
          onPress={() => {
            setTab("notifications");
            markAllRead();
          }}
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
        favoriteEvents.length > 0 ? (
          favoriteEvents.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              onPress={() => router.push(`/event/${e.id}`)}
            />
          ))
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
                <Text style={styles.notifTitle}>
                  {lang === "fr" ? n.titleFr : n.title}
                </Text>
                <Text style={styles.notifBody}>
                  {lang === "fr" ? n.bodyFr : n.body}
                </Text>
                <Text style={styles.notifDate}>
                  {new Date(n.createdAt).toLocaleDateString()}
                </Text>
              </View>
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
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={logout}
      >
        <Ionicons name="log-out-outline" size={20} color={C.error} />
        <Text style={styles.logoutText}>{t("logout")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  authPrompt: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  authTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: C.text,
    textAlign: "center",
  },
  authSub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    textAlign: "center",
  },
  loginBtn: {
    backgroundColor: C.lavender,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
  },
  loginBtnText: {
    color: C.bg,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  registerBtn: {
    borderWidth: 1,
    borderColor: C.lavender,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
  },
  registerBtnText: {
    color: C.lavender,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.lavender,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: C.bg,
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  roleBadge: {
    marginTop: 4,
    backgroundColor: C.card2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  roleText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: C.lavender,
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
  settingLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: C.text,
  },
  langToggle: {
    flexDirection: "row",
    backgroundColor: C.card2,
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  langBtnActive: {
    backgroundColor: C.lavender,
  },
  langBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: C.textMuted,
  },
  langBtnTextActive: {
    color: C.bg,
  },
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
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: C.card2,
  },
  tabText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
  },
  tabTextActive: {
    color: C.lavender,
    fontFamily: "Inter_600SemiBold",
  },
  badge: {
    backgroundColor: C.error,
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: C.white,
  },
  notifCard: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  notifUnread: {
    borderColor: C.lavender,
  },
  notifDot: {
    width: 10,
    paddingTop: 4,
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.lavender,
  },
  notifContent: {
    flex: 1,
    gap: 2,
  },
  notifTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  notifBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  notifDate: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    marginTop: 4,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
  },
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
  logoutText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.error,
  },
});
