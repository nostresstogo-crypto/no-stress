import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider, useApp, useColors } from "@/context/AppContext";
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
});

const LAVENDER = "#9B8FE8";
const GOLD = "#D4AF37";
const CORAL = "#FF6B8A";
const CYAN = "#00D4FF";
const BG = "#0E1120";

const FLOATING_ICONS = [
  { name: "musical-notes", x: 0.15, y: 0.18, size: 22, color: CORAL, delay: 200 },
  { name: "ticket", x: 0.82, y: 0.15, size: 20, color: GOLD, delay: 400 },
  { name: "location", x: 0.88, y: 0.72, size: 18, color: CYAN, delay: 600 },
  { name: "camera", x: 0.12, y: 0.75, size: 20, color: LAVENDER, delay: 300 },
  { name: "mic", x: 0.78, y: 0.42, size: 16, color: LAVENDER, delay: 500 },
  { name: "people", x: 0.22, y: 0.45, size: 17, color: CORAL, delay: 700 },
  { name: "star", x: 0.5, y: 0.08, size: 14, color: GOLD, delay: 350 },
  { name: "sparkles", x: 0.08, y: 0.35, size: 15, color: CYAN, delay: 450 },
  { name: "flame", x: 0.92, y: 0.55, size: 16, color: CORAL, delay: 550 },
  { name: "heart", x: 0.65, y: 0.82, size: 14, color: LAVENDER, delay: 650 },
] as const;

const EQ_BARS = 12;

function FloatingIcon({ icon, screenW, screenH }: { icon: typeof FLOATING_ICONS[number]; screenW: number; screenH: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0.35, duration: 600, useNativeDriver: false }),
        Animated.timing(translateY, { toValue: 0, duration: 600, useNativeDriver: false }),
      ]).start(() => {
        loopRef.current = Animated.loop(
          Animated.sequence([
            Animated.timing(translateY, { toValue: -8, duration: 1800, useNativeDriver: false }),
            Animated.timing(translateY, { toValue: 8, duration: 1800, useNativeDriver: false }),
          ])
        );
        loopRef.current.start();
      });
    }, icon.delay + 400);
    return () => { clearTimeout(timer); loopRef.current?.stop(); };
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: icon.x * screenW - icon.size / 2,
        top: icon.y * screenH - icon.size / 2,
        opacity,
        transform: [{ translateY }],
      }}
    >
      <Ionicons name={icon.name as any} size={icon.size} color={icon.color} />
    </Animated.View>
  );
}

function EqBar({ index, total }: { index: number; total: number }) {
  const height = useRef(new Animated.Value(4)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(height, { toValue: 8 + Math.random() * 28, duration: 300 + Math.random() * 200, useNativeDriver: false }),
          Animated.timing(height, { toValue: 4 + Math.random() * 8, duration: 300 + Math.random() * 200, useNativeDriver: false }),
        ])
      );
      loopRef.current.start();
    }, index * 80 + 800);
    return () => { clearTimeout(timer); loopRef.current?.stop(); };
  }, []);

  const center = total / 2;
  const dist = Math.abs(index - center) / center;
  const barColor = dist < 0.3 ? LAVENDER : dist < 0.6 ? CORAL : CYAN + "88";

  return (
    <Animated.View
      style={{
        width: 4,
        borderRadius: 2,
        backgroundColor: barColor,
        height,
        opacity: 0.7,
      }}
    />
  );
}

function CustomSplash() {
  const { width: screenW, height: screenH } = Dimensions.get("window");

  const flagOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.3)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandY = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(12)).current;
  const eqOpacity = useRef(new Animated.Value(0)).current;
  const mottoOpacity = useRef(new Animated.Value(0)).current;
  const mottoY = useRef(new Animated.Value(8)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const t = (v: Animated.Value, to: number, dur: number, native = false) =>
      Animated.timing(v, { toValue: to, duration: dur, useNativeDriver: native });

    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => t(flagOpacity, 1, 250).start(), 0));
    timers.push(setTimeout(() => { t(ringScale, 1, 500).start(); t(ringOpacity, 1, 400).start(); }, 250));
    timers.push(setTimeout(() => { t(brandOpacity, 1, 350).start(); t(brandY, 0, 350).start(); }, 700));
    timers.push(setTimeout(() => { t(taglineOpacity, 1, 300).start(); t(taglineY, 0, 300).start(); }, 1000));
    timers.push(setTimeout(() => {
      t(mottoOpacity, 1, 300).start();
      t(mottoY, 0, 300).start();
      t(eqOpacity, 1, 400).start();
      t(pulseOpacity, 0.3, 0).start();
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.parallel([t(pulseScale, 1.6, 1800), t(pulseOpacity, 0, 1800)]),
          Animated.parallel([t(pulseScale, 1, 0), t(pulseOpacity, 0.3, 0)]),
        ])
      );
      pulseLoopRef.current.start();
    }, 1300));

    return () => { timers.forEach(clearTimeout); pulseLoopRef.current?.stop(); };
  }, []);

  return (
    <View style={splash.root}>
      <Animated.View style={[splash.accentBar, { opacity: flagOpacity }]}>
        <View style={[splash.accentSegment, { backgroundColor: LAVENDER }]} />
        <View style={[splash.accentSegment, { backgroundColor: CORAL }]} />
        <View style={[splash.accentSegment, { backgroundColor: CYAN }]} />
      </Animated.View>

      <View style={splash.glowTop} />
      <View style={splash.glowBottom} />
      <View style={splash.glowCenter} />

      {FLOATING_ICONS.map((icon, i) => (
        <FloatingIcon key={i} icon={icon} screenW={screenW} screenH={screenH} />
      ))}

      <Animated.View
        style={[
          splash.pulseRing,
          { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
        ]}
      />

      <Animated.View
        style={[splash.logoWrap, { transform: [{ scale: ringScale }], opacity: ringOpacity }]}
      >
        <View style={splash.iconRing}>
          <View style={splash.iconInner}>
            <Text style={splash.iconText}>N</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={{ opacity: brandOpacity, transform: [{ translateY: brandY }] }}>
        <View style={splash.brandRow}>
          <Text style={splash.brandNo}>No</Text>
          <Text style={splash.brandStress}>Stress</Text>
        </View>
      </Animated.View>

      <Animated.View style={[splash.taglineRow, { opacity: taglineOpacity, transform: [{ translateY: taglineY }] }]}>
        <View style={splash.accentLine} />
        <Text style={splash.tagline}>ÉVÉNEMENTS DU TOGO</Text>
        <View style={splash.accentLine} />
      </Animated.View>

      <Animated.View style={[splash.mottoRow, { opacity: mottoOpacity, transform: [{ translateY: mottoY }] }]}>
        <Text style={splash.mottoWord}>Découvrez</Text>
        <View style={[splash.mottoDot, { backgroundColor: CORAL }]} />
        <Text style={[splash.mottoWord, { color: LAVENDER }]}>Vibrez</Text>
        <View style={[splash.mottoDot, { backgroundColor: CYAN }]} />
        <Text style={[splash.mottoWord, { color: GOLD }]}>Sans stress</Text>
      </Animated.View>

      <Animated.View style={[splash.eqWrap, { opacity: eqOpacity }]}>
        {Array.from({ length: EQ_BARS }).map((_, i) => (
          <EqBar key={i} index={i} total={EQ_BARS} />
        ))}
      </Animated.View>

      <Animated.View style={[splash.accentBarBottom, { opacity: flagOpacity }]}>
        <View style={[splash.accentSegment, { backgroundColor: LAVENDER }]} />
        <View style={[splash.accentSegment, { backgroundColor: CORAL }]} />
        <View style={[splash.accentSegment, { backgroundColor: CYAN }]} />
      </Animated.View>
    </View>
  );
}

function RootLayoutNav() {
  const { appReady, hasOnboarded, isDark, colors: C } = useApp();
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!appReady) return;
    const timer = setTimeout(() => {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }).start(() => {
        setShowSplash(false);
        if (!hasOnboarded) {
          router.replace("/onboarding");
        }
      });
    }, 2800);
    return () => clearTimeout(timer);
  }, [appReady, hasOnboarded]);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor={C.bg} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="event/[id]" options={{ headerShown: false, presentation: "card" }} />
        <Stack.Screen name="ticket/[eventId]" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="auth" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="create-event" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="venue/[id]" options={{ headerShown: false, presentation: "card" }} />
      </Stack>

      {showSplash && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: splashOpacity, zIndex: 999, pointerEvents: "none" as any }]}
        >
          <CustomSplash />
        </Animated.View>
      )}
    </>
  );
}

const splash = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  accentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    flexDirection: "row",
  },
  accentBarBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    flexDirection: "row",
  },
  accentSegment: {
    flex: 1,
    height: "100%",
  },
  glowTop: {
    position: "absolute",
    top: -100,
    left: "50%",
    marginLeft: -180,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: LAVENDER + "12",
  },
  glowBottom: {
    position: "absolute",
    bottom: 40,
    right: -100,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: GOLD + "0C",
  },
  glowCenter: {
    position: "absolute",
    top: "35%",
    left: "50%",
    marginLeft: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: LAVENDER + "08",
  },
  pulseRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: LAVENDER + "40",
  },
  logoWrap: {
    alignItems: "center",
  },
  iconRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2.5,
    borderColor: LAVENDER + "55",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: LAVENDER + "14",
  },
  iconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: LAVENDER,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 40,
    fontFamily: "Inter_700Bold",
    color: BG,
    lineHeight: 48,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  brandNo: {
    fontSize: 38,
    fontFamily: "Inter_700Bold",
    color: "#F0EDF8",
  },
  brandStress: {
    fontSize: 38,
    fontFamily: "Inter_700Bold",
    color: LAVENDER,
  },
  taglineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tagline: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#6B6D8A",
    letterSpacing: 2.5,
  },
  accentLine: {
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: GOLD + "88",
  },
  mottoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  mottoWord: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#F0EDF8",
  },
  mottoDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  eqWrap: {
    position: "absolute",
    bottom: 60,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 5,
    height: 40,
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    ...Ionicons.font,
    ...Feather.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AppProvider>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </AppProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
