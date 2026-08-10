import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider, useApp, useColors } from "@/context/AppContext";
import { NetworkProvider } from "@/context/NetworkContext";
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
        <Stack.Screen name="reset-password" options={{ headerShown: false, presentation: "card", gestureEnabled: false }} />
        <Stack.Screen name="partner-pending" options={{ headerShown: false, presentation: "card", gestureEnabled: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="change-password" options={{ headerShown: false, presentation: "modal" }} />
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


function RootLayout() {
  // Mapping explicite des polices vectorielles : plus fiable en Expo Go + pnpm
  // que `...Ionicons.font` (qui peut ne pas résoudre les chemins .ttf à travers
  // les liens symboliques de pnpm). Les noms de famille DOIVENT correspondre à
  // ceux que @expo/vector-icons utilise en interne ("Ionicons", "Feather").
  const [fontsLoaded, fontError] = useFonts({
    // Inter — conservé pour les autres écrans (migration progressive)
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    // Plus Jakarta Sans — accueil premium & nouveaux composants
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    // Icônes vectorielles
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
          <NetworkProvider>
            <QueryClientProvider client={queryClient}>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </QueryClientProvider>
          </NetworkProvider>
        </AppProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

export default RootLayout;
