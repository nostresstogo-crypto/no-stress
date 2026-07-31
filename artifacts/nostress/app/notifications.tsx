import React, { useCallback } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, useColors } from "@/context/AppContext";
import { safePush } from "@/lib/navigation";

// ── Relative time helper ─────────────────────────────────────────────────────
function formatRelative(dateStr: string, lang: "fr" | "en"): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMs / 3600000);
  const diffD   = Math.floor(diffMs / 86400000);

  if (lang === "fr") {
    if (diffMin < 2) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffH < 24) return `Il y a ${diffH} h`;
    if (diffD < 7) return `Il y a ${diffD} j`;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  }
  if (diffMin < 2) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ── Icon per notification type ────────────────────────────────────────────────
function notifIcon(type?: string): { name: keyof typeof Ionicons.glyphMap; color: string } {
  switch (type) {
    case "event":       return { name: "calendar",              color: "#6650D8" };
    case "reminder":    return { name: "alarm",                 color: "#A898EC" };
    case "venue":       return { name: "location",              color: "#9A7010" };
    case "favorite":    return { name: "heart",                 color: "#E05C5C" };
    case "cancel":      return { name: "close-circle",          color: "#E06060" };
    case "announce":    return { name: "megaphone",             color: "#36B870" };
    case "account":     return { name: "person-circle",         color: "#A898EC" };
    default:            return { name: "notifications",         color: "#A898EC" };
  }
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const C      = useColors();
  const insets = useSafeAreaInsets();
  const { lang, notifications, markAllRead, removeNotification, unreadCount } = useApp();

  const topPad    = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 40 : insets.bottom + 20;

  const handleMarkAll = useCallback(() => { markAllRead(); }, [markAllRead]);

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <View style={[s.header, { paddingTop: topPad + 8, backgroundColor: C.bg, borderBottomColor: C.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[s.backBtn, { backgroundColor: C.card, borderColor: C.border }]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={lang === "fr" ? "Retour" : "Back"}
        >
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>

        <Text style={[s.headerTitle, { color: C.text }]}>
          {lang === "fr" ? "Notifications" : "Notifications"}
        </Text>

        {unreadCount > 0 ? (
          <TouchableOpacity
            onPress={handleMarkAll}
            style={[s.markAllBtn, { backgroundColor: C.lavender + "18", borderColor: C.lavender + "40" }]}
            accessibilityRole="button"
          >
            <Text style={[s.markAllText, { color: C.lavender }]}>
              {lang === "fr" ? "Tout lu" : "Mark all"}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={s.markAllBtn} />
        )}
      </View>

      {/* ── List ──────────────────────────────────────────────────────── */}
      {notifications.length === 0 ? (
        <View style={s.emptyWrap}>
          <View style={[s.emptyIcon, { backgroundColor: C.card2 }]}>
            <Ionicons name="notifications-off-outline" size={40} color={C.textMuted} />
          </View>
          <Text style={[s.emptyTitle, { color: C.text }]}>
            {lang === "fr" ? "Aucune notification" : "No notifications"}
          </Text>
          <Text style={[s.emptySub, { color: C.textMuted }]}>
            {lang === "fr"
              ? "Vous verrez ici les mises à jour importantes."
              : "You'll see important updates here."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          contentContainerStyle={[s.listContent, { paddingBottom: bottomPad + 16 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: n }) => {
            const icon = notifIcon((n as any).type);
            const title = lang === "fr" ? n.titleFr : n.title;
            const body  = lang === "fr" ? n.bodyFr  : n.body;
            const relTime = formatRelative(n.createdAt, lang);

            return (
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => {
                  if (!n.read) markAllRead(); // simplified: mark all when opening
                  const dest = (n as any).destination;
                  if (dest) safePush(dest);
                }}
                style={[
                  s.notifCard,
                  {
                    backgroundColor: n.read ? C.card : C.card2,
                    borderColor: n.read ? C.border : C.lavender + "30",
                  },
                ]}
              >
                {/* Icon */}
                <View style={[s.notifIconWrap, { backgroundColor: icon.color + "18" }]}>
                  <Ionicons name={icon.name} size={20} color={icon.color} />
                </View>

                {/* Content */}
                <View style={s.notifContent}>
                  <View style={s.notifTopRow}>
                    <Text style={[s.notifTitle, { color: C.text }]} numberOfLines={1}>{title}</Text>
                    {!n.read && <View style={[s.unreadDot, { backgroundColor: C.lavender }]} />}
                  </View>
                  <Text style={[s.notifBody, { color: C.textMuted }]} numberOfLines={2}>{body}</Text>
                  {relTime ? (
                    <Text style={[s.notifTime, { color: C.textMuted }]}>{relTime}</Text>
                  ) : null}
                </View>

                {/* Remove */}
                <TouchableOpacity
                  onPress={() => removeNotification(n.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={s.removeBtn}
                  accessibilityLabel={lang === "fr" ? "Supprimer" : "Dismiss"}
                  accessibilityRole="button"
                >
                  <Ionicons name="close" size={16} color={C.textMuted} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  markAllBtn: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 14, borderWidth: 1,
  },
  markAllText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  /* Empty */
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 14 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },

  /* List */
  listContent: { paddingHorizontal: 16, paddingTop: 14 },

  /* Card */
  notifCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  notifIconWrap: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  notifContent: { flex: 1, gap: 3 },
  notifTopRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  notifTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  notifBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  notifTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  removeBtn: { padding: 4, alignSelf: "flex-start" },
});
