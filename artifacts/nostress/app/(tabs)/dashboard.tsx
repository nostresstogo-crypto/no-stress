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
import { router } from "expo-router";

import { C } from "@/constants/colors";
import { useT, useApp } from "@/context/AppContext";
import { MOCK_SUBSCRIPTION_PLANS } from "@/constants/data";

type DashTab = "events" | "venues" | "plan";

export default function DashboardScreen() {
  const t = useT();
  const { user, lang, myEvents } = useApp();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<DashTab>("events");
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  /* ── Not logged in ── */
  if (!user) {
    return (
      <View style={[styles.root, { paddingTop: topInset }]}>
        <View style={styles.gateBox}>
          <View style={[styles.gateIcon, { backgroundColor: C.lavender + "18" }]}>
            <Ionicons name="lock-closed-outline" size={40} color={C.lavender} />
          </View>
          <Text style={styles.gateTitle}>{t("loginRequired")}</Text>
          <Text style={styles.gateSub}>
            {lang === "fr"
              ? "Connectez-vous pour accéder à votre espace."
              : "Sign in to access your space."}
          </Text>
          <TouchableOpacity style={styles.gateBtn} onPress={() => router.push("/auth")}>
            <Ionicons name="log-in-outline" size={18} color={C.bg} />
            <Text style={styles.gateBtnText}>{t("login")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ── Regular user (not a partner) ── */
  if (user.role === "user") {
    return (
      <View style={[styles.root, { paddingTop: topInset }]}>
        <View style={styles.gateBox}>
          <View style={[styles.gateIcon, { backgroundColor: C.gold + "18" }]}>
            <Ionicons name="business-outline" size={40} color={C.gold} />
          </View>
          <Text style={styles.gateTitle}>{t("partnerOnly")}</Text>
          <Text style={styles.gateSub}>{t("partnerOnlyDesc")}</Text>

          <TouchableOpacity
            style={[styles.gateBtn, { backgroundColor: C.gold }]}
            onPress={() => router.push("/auth")}
          >
            <Ionicons name="add-circle-outline" size={18} color={C.bg} />
            <Text style={styles.gateBtnText}>{t("partnerOnlyCreate")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gateBtnSecondary}
            onPress={() => router.push("/auth")}
          >
            <Text style={styles.gateBtnSecondaryText}>{t("partnerOnlyLogin")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ── Partner or Admin ── */
  const activePlan = MOCK_SUBSCRIPTION_PLANS[0]; // Free plan by default

  const tabLabels: Record<DashTab, string> = {
    events: t("myEvents"),
    venues: t("myVenues"),
    plan: t("myPlan"),
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerSub}>{t("dashboard")}</Text>
            <Text style={styles.headerName}>{user.name}</Text>
          </View>
          <View style={[styles.planBadge, {
            backgroundColor: user.role === "admin" ? C.error + "22" : C.gold + "22",
            borderColor: user.role === "admin" ? C.error : C.gold,
          }]}>
            <Ionicons
              name={user.role === "admin" ? "shield" : "star"}
              size={12}
              color={user.role === "admin" ? C.error : C.gold}
            />
            <Text style={[styles.planBadgeText, { color: user.role === "admin" ? C.error : C.gold }]}>
              {user.role === "admin" ? "Admin" : activePlan.name}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard icon="calendar" value={myEvents.length} label={t("myEvents")} color={C.lavender} />
          <StatCard icon="business" value={0} label={t("myVenues")} color={C.gold} />
          <StatCard icon="people" value={0} label="Participants" color={C.success} />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(["events", "venues", "plan"] as DashTab[]).map((dt) => (
            <TouchableOpacity
              key={dt}
              style={[styles.tabBtn, tab === dt && styles.tabBtnActive]}
              onPress={() => setTab(dt)}
            >
              <Text style={[styles.tabText, tab === dt && styles.tabTextActive]}>
                {tabLabels[dt]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === "web" ? 118 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Events tab ── */}
        {tab === "events" && (
          <>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => router.push("/create-event")}
            >
              <Ionicons name="add-circle" size={20} color={C.bg} />
              <Text style={styles.createBtnText}>{t("createEvent")}</Text>
            </TouchableOpacity>

            {myEvents.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="calendar-outline" size={44} color={C.border} />
                <Text style={styles.emptyTitle}>{t("noEvents")}</Text>
                <Text style={styles.emptySub}>
                  {lang === "fr"
                    ? "Créez votre premier événement pour commencer."
                    : "Create your first event to get started."}
                </Text>
              </View>
            ) : (
              myEvents.map((event) => (
                <View key={event.id} style={styles.eventRow}>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>
                      {lang === "fr" && event.titleFr ? event.titleFr : event.titleEn || event.titleFr}
                    </Text>
                    <Text style={styles.eventMeta}>
                      {event.date} · {event.city}
                    </Text>
                    <Text style={styles.eventPrice}>
                      {event.isFree
                        ? t("free")
                        : `${event.priceFCFA.toLocaleString()} FCFA`}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(event.status) + "22", borderColor: getStatusColor(event.status) }
                  ]}>
                    <Text style={[styles.statusText, { color: getStatusColor(event.status) }]}>
                      {t(event.status)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* ── Venues tab ── */}
        {tab === "venues" && (
          <>
            <TouchableOpacity style={styles.createBtn} onPress={() => {}}>
              <Ionicons name="add-circle" size={20} color={C.bg} />
              <Text style={styles.createBtnText}>{t("createVenue")}</Text>
            </TouchableOpacity>
            <View style={styles.empty}>
              <Ionicons name="business-outline" size={44} color={C.border} />
              <Text style={styles.emptyTitle}>{t("noVenues")}</Text>
              <Text style={styles.emptySub}>
                {lang === "fr"
                  ? "Ajoutez votre premier lieu pour le référencer sur NoStress."
                  : "Add your first venue to list it on NoStress."}
              </Text>
            </View>
          </>
        )}

        {/* ── Plan tab ── */}
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

function StatCard({ icon, value, label, color }: { icon: string; value: number; label: string; color: string }) {
  return (
    <View style={statStyles.card}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case "approved": return C.success;
    case "rejected": return C.error;
    default: return C.gold;
  }
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  /* Gate screens */
  gateBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  gateIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  gateTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: C.text,
    textAlign: "center",
  },
  gateSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  gateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.lavender,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: "100%",
    justifyContent: "center",
    marginTop: 4,
  },
  gateBtnText: {
    color: C.bg,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  gateBtnSecondary: {
    paddingVertical: 12,
    alignItems: "center",
    width: "100%",
  },
  gateBtnSecondaryText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: C.lavender,
  },

  /* Header */
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
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 20,
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
  eventInfo: { flex: 1, gap: 3 },
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
  eventPrice: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: C.gold,
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

  /* Plans */
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
  planCardActive: { backgroundColor: C.lavender, borderColor: C.lavender },
  planCardPopular: { borderColor: C.gold },
  popularBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: C.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  popularText: { fontSize: 11, fontFamily: "Inter_700Bold", color: C.bg },
  planName: { fontSize: 20, fontFamily: "Inter_700Bold", color: C.text },
  planPriceRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  planPrice: { fontSize: 26, fontFamily: "Inter_700Bold", color: C.gold },
  planPeriod: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textMuted },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.text },
  upgradeBtn: {
    backgroundColor: C.lavender,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  upgradeBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.bg },
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
  currentBadgeText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.bg },
});
