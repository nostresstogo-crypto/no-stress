import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import type { ColorPalette } from "@/constants/colors";
import { useApp, useT, useColors } from "@/context/AppContext";
import { safePush } from "@/lib/navigation";

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
  C,
}: {
  onPress?: () => void;
  accessibilityState?: { selected?: boolean };
  children?: React.ReactNode;
  C: ColorPalette;
}) {
  const isSelected = accessibilityState?.selected;
  const styles = makeCenterBtnStyles(C);

  return (
    <TouchableOpacity
      style={styles.wrap}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
    >
      <View style={[styles.circle, isSelected && styles.circleActive]}>
        <Ionicons name="map" size={26} color={C.isDark ? C.bg : C.text} />
      </View>
      <Text style={[styles.label, isSelected && styles.labelActive]}>
        Carte
      </Text>
    </TouchableOpacity>
  );
}

const makeCenterBtnStyles = (C: ColorPalette) =>
  StyleSheet.create({
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
      shadowColor: C.gold,
      shadowOpacity: C.isDark ? 0.75 : 0.45,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: -4 },
      elevation: 14,
      borderWidth: 3,
      borderColor: C.bg,
    },
    circleActive: {
      backgroundColor: C.goldDim,
      shadowOpacity: C.isDark ? 0.9 : 0.55,
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

/* ── AI Floating Button ──────────────────────────────────────────────── */
function AIFloatingButton() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(1)).current;
  const wave = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;

  /* Glow pulse — continu */
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  /* Salutation — joue au démarrage puis toutes les 6 secondes */
  useEffect(() => {
    function greet() {
      Animated.sequence([
        /* légère élévation */
        Animated.timing(bounce, { toValue: -6, duration: 180, useNativeDriver: true }),
        /* balancement : droite → gauche → droite → gauche → centre */
        Animated.timing(wave, { toValue: 18, duration: 140, useNativeDriver: true }),
        Animated.timing(wave, { toValue: -14, duration: 130, useNativeDriver: true }),
        Animated.timing(wave, { toValue: 16, duration: 130, useNativeDriver: true }),
        Animated.timing(wave, { toValue: -10, duration: 130, useNativeDriver: true }),
        Animated.timing(wave, { toValue: 8, duration: 120, useNativeDriver: true }),
        Animated.timing(wave, { toValue: 0, duration: 160, useNativeDriver: true }),
        /* retour au sol */
        Animated.timing(bounce, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }

    /* premier salut après 600 ms (app bien chargée) */
    const first = setTimeout(greet, 600);
    /* saluts périodiques toutes les 6 s */
    const interval = setInterval(greet, 6000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [wave, bounce]);

  const rotate = wave.interpolate({
    inputRange: [-20, 0, 20],
    outputRange: ["-20deg", "0deg", "20deg"],
  });

  const TAB_H = Platform.OS === "ios" ? 82 : 64;
  const bottom = insets.bottom + TAB_H + 12;

  return (
    <TouchableOpacity
      onPress={() => safePush("/ai-assistant")}
      activeOpacity={0.82}
      accessibilityLabel="Assistant IA"
      style={[fabStyles.wrap, { bottom, right: 18 }]}
    >
      {/* Anneau de lueur pulsant */}
      <Animated.View
        style={[fabStyles.glow, { backgroundColor: C.lavender + "28", transform: [{ scale: pulse }] }]}
        pointerEvents="none"
      />

      {/* Cercle + robot animé */}
      <Animated.View style={{ transform: [{ translateY: bounce }] }}>
        <LinearGradient
          colors={["#1A1040", "#2D1F6E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={fabStyles.circle}
        >
          <Animated.Image
            source={require("@/assets/images/ai-mascot.png")}
            style={[fabStyles.mascot, { transform: [{ rotate }] }]}
            resizeMode="contain"
          />
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

const fabStyles = StyleSheet.create({
  wrap: {
    position: "absolute",
    zIndex: 9000,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  circle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#5A46C0",
    shadowOpacity: 0.7,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 5 },
    elevation: 14,
    overflow: "hidden",
  },
  mascot: {
    width: 54,
    height: 54,
    marginBottom: -4,
  },
});

/* ── Tab layout ─────────────────────────────────────────────────────────── */
function ClassicTabLayout() {
  const t = useT();
  const { user, isDark } = useApp();
  const C = useColors();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <View style={{ flex: 1 }}>
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
          tabBarButton: (props) => <MapTabButton {...(props as any)} C={C} />,
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

    </Tabs>
    <AIFloatingButton />
    </View>
  );
}

export default function TabLayout() {
  return <ClassicTabLayout />;
}
