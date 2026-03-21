import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { C } from "@/constants/colors";
import { useT, useApp } from "@/context/AppContext";
import { MOCK_EVENTS, MOCK_VENUES } from "@/constants/data";

type AdminTab = "events" | "venues";

export default function AdminPanelScreen() {
  const t = useT();
  const { user, lang } = useApp();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<AdminTab>("events");
  const [approvedEvents, setApprovedEvents] = useState<string[]>([]);
  const [rejectedEvents, setRejectedEvents] = useState<string[]>([]);
  const [verifiedVenues, setVerifiedVenues] = useState<string[]>([]);
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  if (!user || user.role !== "admin") {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center", paddingTop: topInset }]}>
        <Ionicons name="shield-outline" size={64} color={C.border} />
        <Text style={styles.noAccessText}>{t("loginRequired")}</Text>
      </View>
    );
  }

  const pendingEvents = MOCK_EVENTS.filter(
    (e) => e.status === "pending" || (!approvedEvents.includes(e.id) && !rejectedEvents.includes(e.id))
  );
  const pendingVenues = MOCK_VENUES.filter(
    (v) => !v.isVerified && !verifiedVenues.includes(v.id)
  );

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Text style={styles.headerTitle}>{t("adminPanel")}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pendingEvents.length}</Text>
            <Text style={styles.statLabel}>{t("pendingEvents")}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pendingVenues.length}</Text>
            <Text style={styles.statLabel}>{t("pendingVenues")}</Text>
          </View>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "events" && styles.tabBtnActive]}
            onPress={() => setTab("events")}
          >
            <Ionicons name="calendar" size={16} color={tab === "events" ? C.lavender : C.textMuted} />
            <Text style={[styles.tabText, tab === "events" && styles.tabTextActive]}>
              {t("pendingEvents")}
            </Text>
            {pendingEvents.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingEvents.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "venues" && styles.tabBtnActive]}
            onPress={() => setTab("venues")}
          >
            <Ionicons name="business" size={16} color={tab === "venues" ? C.lavender : C.textMuted} />
            <Text style={[styles.tabText, tab === "venues" && styles.tabTextActive]}>
              {t("pendingVenues")}
            </Text>
            {pendingVenues.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingVenues.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === "web" ? 118 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {tab === "events" && (
          <>
            {pendingEvents.map((event) => {
              const isApproved = approvedEvents.includes(event.id);
              const isRejected = rejectedEvents.includes(event.id);
              return (
                <View key={event.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {lang === "fr" && event.titleFr ? event.titleFr : event.title}
                    </Text>
                    {(isApproved || isRejected) && (
                      <View style={[styles.statusBadge, {
                        backgroundColor: isApproved ? C.success + "22" : C.error + "22",
                        borderColor: isApproved ? C.success : C.error,
                      }]}>
                        <Text style={[styles.statusText, { color: isApproved ? C.success : C.error }]}>
                          {isApproved ? t("approved") : t("rejected")}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardMeta}>{event.date} · {event.city}</Text>
                  <Text style={styles.cardMeta}>{event.category} · {event.price.toLocaleString()} FCFA</Text>

                  {!isApproved && !isRejected && (
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={styles.rejectBtn}
                        onPress={() => setRejectedEvents((prev) => [...prev, event.id])}
                      >
                        <Ionicons name="close" size={16} color={C.error} />
                        <Text style={styles.rejectBtnText}>{t("reject")}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => setApprovedEvents((prev) => [...prev, event.id])}
                      >
                        <Ionicons name="checkmark" size={16} color={C.bg} />
                        <Text style={styles.approveBtnText}>{t("approve")}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
            {pendingEvents.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="checkmark-circle-outline" size={48} color={C.success} />
                <Text style={styles.emptyText}>
                  {lang === "fr" ? "Tout est approuvé!" : "All caught up!"}
                </Text>
              </View>
            )}
          </>
        )}

        {tab === "venues" && (
          <>
            {pendingVenues.map((venue) => {
              const isVerified = verifiedVenues.includes(venue.id);
              return (
                <View key={venue.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{venue.name}</Text>
                    {isVerified && (
                      <View style={[styles.statusBadge, { backgroundColor: C.success + "22", borderColor: C.success }]}>
                        <Text style={[styles.statusText, { color: C.success }]}>
                          {t("verified")}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardMeta}>{venue.type} · {venue.city}</Text>
                  {venue.address && <Text style={styles.cardMeta}>{venue.address}</Text>}

                  {!isVerified && (
                    <TouchableOpacity
                      style={styles.verifyBtn}
                      onPress={() => setVerifiedVenues((prev) => [...prev, venue.id])}
                    >
                      <Ionicons name="shield-checkmark" size={16} color={C.bg} />
                      <Text style={styles.verifyBtnText}>{t("verify")}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
            {pendingVenues.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="shield-checkmark-outline" size={48} color={C.success} />
                <Text style={styles.emptyText}>
                  {lang === "fr" ? "Tous les lieux sont vérifiés!" : "All venues verified!"}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    backgroundColor: C.bg,
    paddingHorizontal: 20,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 14,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 2,
  },
  statValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 4,
    gap: 4,
    marginBottom: 4,
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
  tabBtnActive: { backgroundColor: C.card2 },
  tabText: {
    fontSize: 12,
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
  content: { padding: 20, gap: 12 },
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  cardMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.error,
  },
  rejectBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: C.error,
  },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.success,
  },
  approveBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: C.bg,
  },
  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.lavender,
    marginTop: 8,
  },
  verifyBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: C.bg,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
  },
  noAccessText: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: C.textMuted,
    marginTop: 16,
  },
});
