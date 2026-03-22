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
import { AppProvider, useApp } from "@/context/AppContext";
import { C } from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
});

function CustomSplash() {
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false,
        }),
      ]),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, { toValue: 1, duration: 500, useNativeDriver: false }),
          Animated.timing(dotAnim, { toValue: 0, duration: 500, useNativeDriver: false }),
        ]),
        { iterations: 3 }
      ),
    ]).start();
  }, []);

  return (
    <View style={splash.root}>
      {/* Background glow */}
      <View style={splash.glowTop} />
      <View style={splash.glowBottom} />

      {/* Logo */}
      <Animated.View style={[splash.logoWrap, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
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
        Événements pan-africains
      </Animated.Text>

      {/* Gold accent line */}
      <Animated.View style={[splash.accentLine, { opacity: taglineOpacity }]} />

      {/* Loader dots */}
      <Animated.View style={[splash.loaderRow, { opacity: taglineOpacity }]}>
        {[0, 1, 2].map((i) => {
          const dotOpacity = dotAnim.interpolate({
            inputRange: [0, 0.33 * (i + 1), 1],
            outputRange: [0.2, 1, 0.2],
            extrapolate: "clamp",
          });
          return (
            <Animated.View key={i} style={[splash.loaderDot, { opacity: dotOpacity }]} />
          );
        })}
      </Animated.View>
    </View>
  );
}

function RootLayoutNav() {
  const { appReady, hasOnboarded } = useApp();
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
    }, 2000);
    return () => clearTimeout(timer);
  }, [appReady, hasOnboarded]);

  return (
    <>
      <StatusBar style="light" backgroundColor={C.bg} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="event/[id]" options={{ headerShown: false, presentation: "card" }} />
        <Stack.Screen name="ticket/[eventId]" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="auth" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="create-event" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="venue/[id]" options={{ headerShown: false, presentation: "card" }} />
      </Stack>

      {/* Custom animated splash overlay */}
      {showSplash && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { opacity: splashOpacity, zIndex: 999 }]}
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
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  glowTop: {
    position: "absolute",
    top: -80,
    left: "50%",
    marginLeft: -160,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: C.lavender + "1A",
  },
  glowBottom: {
    position: "absolute",
    bottom: 60,
    right: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: C.gold + "12",
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
    borderColor: C.lavender + "55",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.lavender + "12",
  },
  iconInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: C.lavender,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 44,
    fontFamily: "Inter_700Bold",
    color: C.bg,
    lineHeight: 52,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  brandNo: {
    fontSize: 42,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  brandStress: {
    fontSize: 42,
    fontFamily: "Inter_700Bold",
    color: C.lavender,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  accentLine: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: C.gold,
  },
  loaderRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 24,
  },
  loaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.lavender,
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
