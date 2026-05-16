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
import { initSentry, captureException } from "@/lib/sentry";
import { setupNotificationResponseHandling } from "@/lib/pushNotifications";
import AnimatedSplash from "@/components/AnimatedSplash";
import { OfflineBanner } from "@/components/OfflineBanner";

initSentry();
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
});

const LAVENDER = "#B5A8F0";
const LAVENDER_DEEP = "#7A6BD8";
const GOLD = "#E5C46B";
const CORAL = "#F47A95";
const CYAN = "#5FD4F5";
const BG = "#070617";
const BG_TOP = "#13102E";

const FLOATING_ICONS = [
  { name: "musical-notes", x: 0.14, y: 0.16, size: 22, color: CORAL, delay: 200 },
  { name: "ticket", x: 0.84, y: 0.14, size: 20, color: GOLD, delay: 400 },
  { name: "pin", x: 0.88, y: 0.7, size: 18, color: CYAN, delay: 600 },
  { name: "camera", x: 0.12, y: 0.72, size: 20, color: LAVENDER, delay: 300 },
  { name: "mic", x: 0.8, y: 0.4, size: 16, color: LAVENDER, delay: 500 },
  { name: "people", x: 0.2, y: 0.42, size: 17, color: CORAL, delay: 700 },
  { name: "star", x: 0.5, y: 0.07, size: 14, color: GOLD, delay: 350 },
  { name: "sparkles", x: 0.08, y: 0.32, size: 15, color: CYAN, delay: 450 },
  { name: "flame", x: 0.92, y: 0.52, size: 16, color: CORAL, delay: 550 },
  { name: "heart", x: 0.7, y: 0.8, size: 14, color: LAVENDER, delay: 650 },
  { name: "wine", x: 0.32, y: 0.86, size: 16, color: GOLD, delay: 480 },
  { name: "headset", x: 0.6, y: 0.18, size: 16, color: CYAN, delay: 380 },
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

  const ringScale = useRef(new Animated.Value(0.3)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ringRotate = useRef(new Animated.Value(0)).current;
  const pulse1Scale = useRef(new Animated.Value(1)).current;
  const pulse1Opacity = useRef(new Animated.Value(0)).current;
  const pulse2Scale = useRef(new Animated.Value(1)).current;
  const pulse2Opacity = useRef(new Animated.Value(0)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandY = useRef(new Animated.Value(24)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(12)).current;
  const eqOpacity = useRef(new Animated.Value(0)).current;
  const progressW = useRef(new Animated.Value(0)).current;
  const progressOpacity = useRef(new Animated.Value(0)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  const loops = useRef<Animated.CompositeAnimation[]>([]).current;

  useEffect(() => {
    const t = (v: Animated.Value, to: number, dur: number, native = false) =>
      Animated.timing(v, { toValue: to, duration: dur, useNativeDriver: native });

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Logo entrance
    timers.push(setTimeout(() => {
      Animated.spring(ringScale, { toValue: 1, friction: 6, tension: 70, useNativeDriver: false }).start();
      t(ringOpacity, 1, 500).start();
      const rotateLoop = Animated.loop(
        Animated.timing(ringRotate, { toValue: 1, duration: 14000, useNativeDriver: false })
      );
      loops.push(rotateLoop);
      rotateLoop.start();
    }, 100));

    // Brand
    timers.push(setTimeout(() => { t(brandOpacity, 1, 400).start(); t(brandY, 0, 400).start(); }, 600));

    // Tagline
    timers.push(setTimeout(() => { t(taglineOpacity, 1, 300).start(); t(taglineY, 0, 300).start(); }, 950));

    // Bottom: equalizer + progress bar + pulses
    timers.push(setTimeout(() => {
      t(eqOpacity, 1, 400).start();
      t(progressOpacity, 1, 300).start();
      t(loadingOpacity, 1, 300).start();
      Animated.timing(progressW, { toValue: 1, duration: 1500, useNativeDriver: false }).start();

      const startPulse = (scaleV: Animated.Value, opV: Animated.Value, delay: number) => {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(scaleV, { toValue: 1.7, duration: 2000, useNativeDriver: false }),
              Animated.timing(opV, { toValue: 0, duration: 2000, useNativeDriver: false }),
            ]),
            Animated.parallel([
              Animated.timing(scaleV, { toValue: 1, duration: 0, useNativeDriver: false }),
              Animated.timing(opV, { toValue: 0.35, duration: 0, useNativeDriver: false }),
            ]),
          ])
        );
        loops.push(loop);
        loop.start();
      };
      startPulse(pulse1Scale, pulse1Opacity, 0);
      startPulse(pulse2Scale, pulse2Opacity, 1000);
    }, 1200));

    return () => {
      timers.forEach(clearTimeout);
      loops.forEach((l) => l.stop());
    };
  }, []);

  const rotateInterp = ringRotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const progressWidth = progressW.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={splash.root}>
      {/* Backdrop layered glows for radial-gradient feel */}
      <View style={splash.bgTopFill} />
      <View style={splash.glowTop} />
      <View style={splash.glowCenter} />
      <View style={splash.glowBottom} />
      <View style={splash.glowAccent} />

      {FLOATING_ICONS.map((icon, i) => (
        <FloatingIcon key={i} icon={icon} screenW={screenW} screenH={screenH} />
      ))}

      {/* Pulse rings */}
      <Animated.View style={[splash.pulseRing, { transform: [{ scale: pulse1Scale }], opacity: pulse1Opacity }]} />
      <Animated.View style={[splash.pulseRing, { transform: [{ scale: pulse2Scale }], opacity: pulse2Opacity, borderColor: GOLD + "55" }]} />

      {/* Logo: rotating dashed ring + inner badge with stacked icons */}
      <Animated.View style={[splash.logoWrap, { transform: [{ scale: ringScale }], opacity: ringOpacity }]}>
        <Animated.View style={[splash.outerDashRing, { transform: [{ rotate: rotateInterp }] }]}>
          {Array.from({ length: 12 }).map((_, i) => (
            <View
              key={i}
              style={[
                splash.dashTick,
                {
                  transform: [
                    { rotate: `${i * 30}deg` },
                    { translateY: -68 },
                  ],
                  backgroundColor: i % 3 === 0 ? GOLD : LAVENDER + "70",
                },
              ]}
            />
          ))}
        </Animated.View>

        <View style={splash.iconRingOuter}>
          <View style={splash.iconRing}>
            <View style={splash.iconInner}>
              <Ionicons name="musical-notes" size={34} color={BG} />
              <View style={splash.iconBadge}>
                <Ionicons name="sparkles" size={11} color={BG} />
              </View>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Brand */}
      <Animated.View style={{ opacity: brandOpacity, transform: [{ translateY: brandY }], alignItems: "center", gap: 6 }}>
        <View style={splash.brandRow}>
          <Text style={splash.brandNo}>No</Text>
          <Text style={splash.brandStress}>Stress</Text>
          <View style={splash.brandDot} />
        </View>
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={[splash.taglineRow, { opacity: taglineOpacity, transform: [{ translateY: taglineY }] }]}>
        <View style={splash.accentLine} />
        <Text style={[splash.tagline, { textAlign: "center" }]}>L'AGENDA DE VOS LIEUX{"\n"}ET ÉVÉNEMENTS</Text>
        <View style={splash.accentLine} />
      </Animated.View>

      {/* Equalizer */}
      <Animated.View style={[splash.eqWrap, { opacity: eqOpacity }]}>
        {Array.from({ length: EQ_BARS }).map((_, i) => (
          <EqBar key={i} index={i} total={EQ_BARS} />
        ))}
      </Animated.View>

      {/* Loading bar */}
      <View style={splash.loadingWrap}>
        <Animated.Text style={[splash.loadingLabel, { opacity: loadingOpacity }]}>
          Préparation de votre soirée…
        </Animated.Text>
        <Animated.View style={[splash.progressTrack, { opacity: progressOpacity }]}>
          <Animated.View style={[splash.progressFill, { width: progressWidth }]} />
        </Animated.View>
      </View>
    </View>
  );
}

function RootLayoutNav() {
  const { appReady, hasOnboarded, isDark, colors: C } = useApp();
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  // Tap sur une notification push/locale → ouvre l'event ou le lieu concerné
  useEffect(() => {
    const cleanup = setupNotificationResponseHandling();
    return cleanup;
  }, []);

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
        <Stack.Screen name="auth" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="create-event" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="venue/[id]" options={{ headerShown: false, presentation: "card" }} />
        <Stack.Screen name="legal/terms" options={{ headerShown: false, presentation: "card" }} />
        <Stack.Screen name="legal/privacy" options={{ headerShown: false, presentation: "card" }} />
        <Stack.Screen name="set-venue-location" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="verify-email" options={{ headerShown: false, presentation: "card", gestureEnabled: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false, presentation: "card" }} />
        <Stack.Screen name="partner-pending" options={{ headerShown: false, presentation: "card", gestureEnabled: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false, presentation: "modal" }} />
      </Stack>

      {showSplash && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: splashOpacity, zIndex: 999, pointerEvents: "none" as any }]}
        >
          <AnimatedSplash />
        </Animated.View>
      )}

      <OfflineBanner />
    </>
  );
}

const splash = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  bgTopFill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "55%",
    backgroundColor: BG_TOP,
    opacity: 0.55,
  },
  glowTop: {
    position: "absolute",
    top: -160,
    left: "50%",
    marginLeft: -220,
    width: 440,
    height: 440,
    borderRadius: 220,
    backgroundColor: LAVENDER + "1A",
  },
  glowBottom: {
    position: "absolute",
    bottom: -120,
    right: -140,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: GOLD + "10",
  },
  glowCenter: {
    position: "absolute",
    top: "30%",
    left: "50%",
    marginLeft: -140,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: LAVENDER_DEEP + "18",
  },
  glowAccent: {
    position: "absolute",
    bottom: "26%",
    left: -90,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: CORAL + "0E",
  },
  pulseRing: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: LAVENDER + "55",
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 160,
    height: 160,
  },
  outerDashRing: {
    position: "absolute",
    width: 150,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  dashTick: {
    position: "absolute",
    width: 3,
    height: 9,
    borderRadius: 2,
  },
  iconRingOuter: {
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 1,
    borderColor: LAVENDER + "33",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BG_TOP + "AA",
  },
  iconRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 2,
    borderColor: LAVENDER + "66",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: LAVENDER + "1A",
  },
  iconInner: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: LAVENDER,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: LAVENDER,
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  iconBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: BG,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  brandNo: {
    fontSize: 42,
    fontFamily: "Inter_700Bold",
    color: "#F4F1FA",
    letterSpacing: -1,
  },
  brandStress: {
    fontSize: 42,
    fontFamily: "Inter_700Bold",
    color: LAVENDER,
    letterSpacing: -1,
  },
  brandDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: GOLD,
    marginLeft: 4,
    marginBottom: 4,
  },
  taglineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: -4,
  },
  tagline: {
    fontSize: 10.5,
    fontFamily: "Inter_600SemiBold",
    color: "#9C97BD",
    letterSpacing: 2.8,
  },
  accentLine: {
    width: 26,
    height: 1,
    backgroundColor: GOLD + "77",
  },
  eqWrap: {
    position: "absolute",
    bottom: 130,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 5,
    height: 36,
  },
  loadingWrap: {
    position: "absolute",
    bottom: 56,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 10,
  },
  loadingLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#7B7798",
    letterSpacing: 1.4,
  },
  progressTrack: {
    width: 140,
    height: 3,
    borderRadius: 2,
    backgroundColor: LAVENDER + "1A",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: LAVENDER,
  },
});

function RootLayout() {
  // Mapping explicite des polices vectorielles : plus fiable en Expo Go + pnpm
  // que `...Ionicons.font` (qui peut ne pas résoudre les chemins .ttf à travers
  // les liens symboliques de pnpm). Les noms de famille DOIVENT correspondre à
  // ceux que @expo/vector-icons utilise en interne ("Ionicons", "Feather").
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Ionicons: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf"),
    Feather: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf"),
  });

  useEffect(() => {
    if (fontError) {
      console.warn("[fonts] erreur de chargement", fontError);
      try {
        captureException(fontError);
      } catch {}
    }
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

export default RootLayout;
