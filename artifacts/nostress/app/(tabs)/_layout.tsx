import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SymbolView } from "expo-symbols";
import { C } from "@/constants/colors";
import { useApp, useT, useColors } from "@/context/AppContext";

/* ── Custom centre "Carte" button ──────────────────────────────────────── */
function MapTabButton({
  onPress,
  accessibilityState,
  children,
}: {
  onPress?: () => void;
  accessibilityState?: { selected?: boolean };
  children?: React.ReactNode;
}) {
  const isSelected = accessibilityState?.selected;

  return (
    <TouchableOpacity
      style={centerBtn.wrap}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
    >
      <View style={[centerBtn.circle, isSelected && centerBtn.circleActive]}>
        <Ionicons
          name="map"
          size={26}
          color={isSelected ? C.bg : C.bg}
        />
      </View>
      <Text style={[centerBtn.label, isSelected && centerBtn.labelActive]}>
        Carte
      </Text>
    </TouchableOpacity>
  );
}

const centerBtn = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: Platform.OS === "ios" ? 6 : 8,
  },
  circle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    marginTop: -34,
    /* iOS shadow */
    shadowColor: C.gold,
    shadowOpacity: 0.75,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    /* Android elevation */
    elevation: 14,
    /* subtle ring */
    borderWidth: 3,
    borderColor: C.bg,
  },
  circleActive: {
    backgroundColor: C.goldDim,
    shadowOpacity: 0.9,
    elevation: 14,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
  },
  labelActive: {
    color: C.gold,
    fontFamily: "Inter_600SemiBold",
  },
});

/* ── Tab layout ─────────────────────────────────────────────────────────── */
function ClassicTabLayout() {
  const t = useT();
  const { user, isDark } = useApp();
  const C = useColors();
  const isAdmin = user?.role === "admin";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.lavender,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : C.card,
          borderTopWidth: 1,
          borderTopColor: C.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: C.card }]} />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
        },
      }}
    >
      {/* 1 — Accueil */}
      <Tabs.Screen
        name="index"
        options={{
          title: t("home"),
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house.fill" tintColor={color} size={22} />
            ) : (
              <Ionicons name="home" size={22} color={color} />
            ),
        }}
      />

      {/* 2 — Lieux */}
      <Tabs.Screen
        name="venues"
        options={{
          title: t("venues"),
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="building.2.fill" tintColor={color} size={22} />
            ) : (
              <Ionicons name="business" size={22} color={color} />
            ),
        }}
      />

      {/* 3 — Carte (centre, bouton doré surélevé) */}
      <Tabs.Screen
        name="map"
        options={{
          title: "Carte",
          tabBarButton: (props) => <MapTabButton {...(props as any)} />,
        }}
      />

      {/* 4 — Tableau de bord */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t("dashboard"),
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="chart.bar.fill" tintColor={color} size={22} />
            ) : (
              <Ionicons name="bar-chart" size={22} color={color} />
            ),
        }}
      />

      {/* 5 — Mon Compte */}
      <Tabs.Screen
        name="account"
        options={{
          title: t("account"),
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.fill" tintColor={color} size={22} />
            ) : (
              <Ionicons name="person" size={22} color={color} />
            ),
        }}
      />

      {/* Admin — hidden for non-admins */}
      <Tabs.Screen
        name="adminpanel"
        options={{
          title: t("admin"),
          tabBarItemStyle: isAdmin ? undefined : { display: "none" },
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="shield.fill" tintColor={color} size={22} />
            ) : (
              <Ionicons name="shield" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return <ClassicTabLayout />;
}
