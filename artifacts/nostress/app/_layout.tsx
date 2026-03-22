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
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider, useApp, useColors } from "@/context/AppContext";
import { TOGO_GREEN, TOGO_YELLOW, TOGO_RED } from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
});

const TOGO_CITIES = ["Lomé", "Kpalimé", "Kara", "Aného", "Sokodé", "Atakpamé"];

function CustomSplash() {
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const flagOpacity = useRef(new Animated.Value(0)).current;
  const cityOpacity = useRef(new Animated.Value(0)).current;
  const [cityIdx, setCityIdx] = useState(0);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(flagOpacity, { toValue: 1, duration: 300, useNativeDriver: false }),
      Animated.parallel([
        Animated.timing(logoScale, { toValue: 1, duration: 600, useNativeDriver: false }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: false }),
      ]),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
      Animated.timing(cityOpacity, { toValue: 1, duration: 300, useNativeDriver: false }),
    ]).start();

    const interval = setInterval(() => {
      cityOpacity.setValue(0);
      setCityIdx((i) => (i + 1) % TOGO_CITIES.length);
      Animated.timing(cityOpacity, { toValue: 1, duration: 300, useNativeDriver: false }).start();
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={splash.root}>
      {/* Togo flag top bar */}
      <Animated.View style={[splash.flagBar, { opacity: flagOpacity }]}>
        <View style={[splash.flagStripe, { backgroundColor: TOGO_GREEN }]} />
        <View style={[splash.flagStripe, { backgroundColor: TOGO_YELLOW }]} />
        <View style={[splash.flagStripe, { backgroundColor: TOGO_RED }]} />
      </Animated.View>

      {/* Glow */}
      <View style={splash.glowTop} />
      <View style={splash.glowBottom} />

      {/* Logo */}
      <Animated.View
        style={[splash.logoWrap, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}
      >
        <View style={splash.iconRing}>
          <View style={splash.iconInner}>
            <Text style={splash.iconText}>N</Text>
          </View>
        </View>
        <View style={splash.brandRow}>
          <Text style={splash.brandNo}>No</Text>
          <Text style={splash.brandStress}>Stress</Text>
        </View>
      </Animated.View>

      {/* Tagline */}
      <Animated.Text style={[splash.tagline, { opacity: taglineOpacity }]}>
        Événements du Togo
      </Animated.Text>

      {/* Gold accent line */}
      <Animated.View style={[splash.accentLine, { opacity: taglineOpacity }]} />

      {/* Cycling city names */}
      <Animated.Text style={[splash.cityName, { opacity: cityOpacity }]}>
        {TOGO_CITIES[cityIdx]}
      </Animated.Text>

      {/* Togo flag bottom bar */}
      <Animated.View style={[splash.flagBarBottom, { opacity: flagOpacity }]}>
        <View style={[splash.flagStripe, { backgroundColor: TOGO_GREEN }]} />
        <View style={[splash.flagStripe, { backgroundColor: TOGO_YELLOW }]} />
        <View style={[splash.flagStripe, { backgroundColor: TOGO_RED }]} />
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
    }, 2200);
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
    backgroundColor: "#0E1120",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  flagBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    flexDirection: "row",
  },
  flagBarBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 6,
    flexDirection: "row",
  },
  flagStripe: {
    flex: 1,
    height: "100%",
  },
  glowTop: {
    position: "absolute",
    top: -80,
    left: "50%",
    marginLeft: -160,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "#9B8FE81A",
  },
  glowBottom: {
    position: "absolute",
    bottom: 60,
    right: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#D4AF3712",
  },
  logoWrap: {
    alignItems: "center",
    gap: 20,
  },
  iconRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "#9B8FE855",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#9B8FE812",
  },
  iconInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#9B8FE8",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 44,
    fontFamily: "Inter_700Bold",
    color: "#0E1120",
    lineHeight: 52,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  brandNo: {
    fontSize: 42,
    fontFamily: "Inter_700Bold",
    color: "#F0EDF8",
  },
  brandStress: {
    fontSize: 42,
    fontFamily: "Inter_700Bold",
    color: "#9B8FE8",
  },
  tagline: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#8B89A6",
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  accentLine: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#D4AF37",
  },
  cityName: {
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
    color: TOGO_YELLOW,
    letterSpacing: 0.5,
    marginTop: 4,
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
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
