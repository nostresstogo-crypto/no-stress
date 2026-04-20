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

/* ── Tab icon with active glow indicator ──────────────────────────────── */
function TabIcon({
  focused,
  color,
  ionName,
  sfName,
  isIOS,
  glowColor,
}: {
  focused: boolean;
  color: string;
  ionName: keyof typeof Ionicons.glyphMap;
  sfName: string;
  isIOS: boolean;
  glowColor: string;
}) {
  return (
    <View style={tabIcon.wrap}>
      {focused && (
        <>
          <View
            style={[
              tabIcon.halo,
              {
                backgroundColor: glowColor + "26",
                shadowColor: glowColor,
              },
            ]}
            pointerEvents="none"
          />
          <View
            style={[tabIcon.dot, { backgroundColor: glowColor }]}
            pointerEvents="none"
          />
        </>
      )}
      {isIOS ? (
        <SymbolView name={sfName as any} tintColor={color} size={22} />
      ) : (
        <Ionicons name={ionName} size={22} color={color} />
      )}
    </View>
  );
}

const tabIcon = StyleSheet.create({
  wrap: {
    width: 44,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    top: 2,
    width: 38,
    height: 38,
    borderRadius: 19,
    shadowOpacity: 0.65,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  dot: {
    position: "absolute",
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

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
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              ionName="home"
              sfName="house.fill"
              isIOS={isIOS}
              glowColor={C.lavender}
            />
          ),
        }}
      />

      {/* 2 — Lieux */}
      <Tabs.Screen
        name="venues"
        options={{
          title: t("venues"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              ionName="business"
              sfName="building.2.fill"
              isIOS={isIOS}
              glowColor={C.lavender}
            />
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
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              ionName="bar-chart"
              sfName="chart.bar.fill"
              isIOS={isIOS}
              glowColor={C.lavender}
            />
          ),
        }}
      />

      {/* 5 — Mon Compte */}
      <Tabs.Screen
        name="account"
        options={{
          title: t("account"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              ionName="person"
              sfName="person.fill"
              isIOS={isIOS}
              glowColor={C.lavender}
            />
          ),
        }}
      />

      {/* Admin — hidden for non-admins */}
      <Tabs.Screen
        name="adminpanel"
        options={{
          title: t("admin"),
          tabBarItemStyle: isAdmin ? undefined : { display: "none" },
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              ionName="shield"
              sfName="shield.fill"
              isIOS={isIOS}
              glowColor={C.gold}
            />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return <ClassicTabLayout />;
}
