import React, { useState } from "react";
import {
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

import { C } from "@/constants/colors";
import { useT, useApp } from "@/context/AppContext";
import { MOCK_EVENTS, MOCK_VENUES, MOCK_SUBSCRIPTION_PLANS } from "@/constants/data";

type DashTab = "events" | "venues" | "plan";

export default function DashboardScreen() {
  const t = useT();
  const { user, lang } = useApp();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<DashTab>("events");
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  if (!user) {
    return (
      <View style={[styles.root, { paddingTop: topInset }]}>
        <View style={styles.authPrompt}>
          <Ionicons name="business-outline" size={64} color={C.border} />
          <Text style={styles.authTitle}>{t("loginRequired")}</Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push("/auth")}
          >
            <Text style={styles.loginBtnText}>{t("login")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const myEvents = MOCK_EVENTS.filter((e) => e.venueId === "v1");
  const myVenues = MOCK_VENUES.filter((v) => v.ownerId === "u1");
  const activePlan = MOCK_SUBSCRIPTION_PLANS[1];

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerSub}>{t("dashboard")}</Text>
            <Text style={styles.headerName}>{user.name}</Text>
          </View>
          <View style={[styles.planBadge, { backgroundColor: C.gold + "22", borderColor: C.gold }]}>
            <Ionicons name="star" size={12} color={C.gold} />
            <Text style={styles.planBadgeText}>{activePlan.name}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard icon="calendar" value={myEvents.length} label={t("myEvents")} />
          <StatCard icon="business" value={myVenues.length} label={t("myVenues")} />
          <StatCard icon="people" value={320} label="Participants" />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(["events", "venues", "plan"] as DashTab[]).map((dt) => {
            const labels: Record<DashTab, string> = {
              events: t("myEvents"),
              venues: t("myVenues"),
              plan: t("myPlan"),
            };
            return (
              <TouchableOpacity
                key={dt}
                style={[styles.tabBtn, tab === dt && styles.tabBtnActive]}
                onPress={() => setTab(dt)}
              >
                <Text style={[styles.tabText, tab === dt && styles.tabTextActive]}>
                  {labels[dt]}
                </Text>
              </TouchableOpacity>
            );
          })}
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
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => {}}
            >
              <Ionicons name="add-circle" size={20} color={C.bg} />
              <Text style={styles.createBtnText}>{t("createEvent")}</Text>
            </TouchableOpacity>
            {myEvents.map((event) => (
              <View key={event.id} style={styles.eventRow}>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>
                    {lang === "fr" && event.titleFr ? event.titleFr : event.title}
                  </Text>
                  <Text style={styles.eventMeta}>{event.date} · {event.city}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(event.status || "pending") + "22", borderColor: getStatusColor(event.status || "pending") }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(event.status || "pending") }]}>
                    {t(event.status as "pending" | "approved" | "rejected" || "pending")}
                  </Text>
                </View>
              </View>
            ))}
            {myEvents.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="calendar-outline" size={40} color={C.border} />
                <Text style={styles.emptyText}>{t("noEvents")}</Text>
              </View>
            )}
          </>
        )}

        {tab === "venues" && (
          <>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => {}}
            >
              <Ionicons name="add-circle" size={20} color={C.bg} />
              <Text style={styles.createBtnText}>{t("createVenue")}</Text>
            </TouchableOpacity>
            {myVenues.map((venue) => (
              <View key={venue.id} style={styles.eventRow}>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{venue.name}</Text>
                  <Text style={styles.eventMeta}>{venue.type} · {venue.city}</Text>
                </View>
                <View style={[styles.statusBadge, {
                  backgroundColor: venue.isVerified ? C.success + "22" : C.textMuted + "22",
                  borderColor: venue.isVerified ? C.success : C.textMuted
                }]}>
                  <Text style={[styles.statusText, { color: venue.isVerified ? C.success : C.textMuted }]}>
                    {venue.isVerified ? t("verified") : t("pending")}
                  </Text>
                </View>
              </View>
            ))}
            {myVenues.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="business-outline" size={40} color={C.border} />
                <Text style={styles.emptyText}>{t("noVenues")}</Text>
              </View>
            )}
          </>
        )}

        {tab === "plan" && (
          <>
            <Text style={styles.planTitle}>{t("choosePlan")}</Text>
            {MOCK_SUBSCRIPTION_PLANS.map((plan) => {
              const isCurrent = plan.id === activePlan.id;
              const name = lang === "fr" ? plan.nameFr : plan.name;
              const features = lang === "fr" ? plan.featuresFr : plan.features;
              return (
                <View
                  key={plan.id}
                  style={[
                    styles.planCard,
                    isCurrent && styles.planCardActive,
                    plan.isPopular && styles.planCardPopular,
                  ]}
                >
                  {plan.isPopular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>Popular</Text>
                    </View>
                  )}
                  <Text style={styles.planName}>{name}</Text>
                  <View style={styles.planPriceRow}>
                    <Text style={styles.planPrice}>
                      {plan.monthlyPriceFCFA === 0 ? t("free") : `${plan.monthlyPriceFCFA.toLocaleString()} FCFA`}
                    </Text>
                    {plan.monthlyPriceFCFA > 0 && (
                      <Text style={styles.planPeriod}>{t("perMonth")}</Text>
                    )}
                  </View>
                  {features.map((feature, i) => (
                    <View key={i} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={16} color={isCurrent ? C.bg : C.success} />
                      <Text style={[styles.featureText, isCurrent && { color: C.bg }]}>{feature}</Text>
                    </View>
                  ))}
                  {!isCurrent && (
                    <TouchableOpacity style={styles.upgradeBtn}>
                      <Text style={styles.upgradeBtnText}>{t("upgrade")} {name}</Text>
                    </TouchableOpacity>
                  )}
                  {isCurrent && (
                    <View style={styles.currentBadge}>
                      <Ionicons name="checkmark" size={14} color={C.bg} />
                      <Text style={styles.currentBadgeText}>{t("currentPlan")}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <View style={statStyles.card}>
      <Ionicons name={icon as any} size={20} color={C.lavender} />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  value: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    textAlign: "center",
  },
});

function getStatusColor(status: string): string {
  switch (status) {
    case "approved": return C.success;
    case "rejected": return C.error;
    default: return C.gold;
  }
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
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  headerName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  planBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: C.gold,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
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
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
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
  content: { padding: 20, gap: 12 },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.lavender,
    borderRadius: 12,
    paddingVertical: 14,
  },
  createBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.bg,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  eventInfo: { flex: 1, gap: 2 },
  eventTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  eventMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
  },
  planTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: C.text,
    marginBottom: 4,
  },
  planCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
    position: "relative",
    overflow: "hidden",
  },
  planCardActive: {
    backgroundColor: C.lavender,
    borderColor: C.lavender,
  },
  planCardPopular: {
    borderColor: C.gold,
  },
  popularBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: C.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  popularText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: C.bg,
  },
  planName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  planPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  planPrice: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: C.gold,
  },
  planPeriod: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.text,
  },
  upgradeBtn: {
    backgroundColor: C.lavender,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  upgradeBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.bg,
  },
  currentBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 4,
  },
  currentBadgeText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.bg,
  },
  authPrompt: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  authTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: C.text,
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
});
