import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { safeReplace } from "@/lib/navigation";
import { useApp, useColors } from "@/context/AppContext";
import { translations, Lang } from "@/constants/i18n";

const { width: SCREEN_W } = Dimensions.get("window");

// ─── Tour slide accents (slides 0-2) ────────────────────────────
const TOUR_ACCENTS = [
  { light: "#6650D8", dark: "#A898EC", deep: { light: "#4A3BB8", dark: "#7060C8" } },
  { light: "#C04070", dark: "#F47A95", deep: { light: "#9A2850", dark: "#C4476A" } },
  { light: "#1880A8", dark: "#5FD4F5", deep: { light: "#105E82", dark: "#3BA6C2" } },
];

const TOUR_ICONS: Array<keyof typeof Ionicons.glyphMap> = [
  "sparkles",
  "musical-notes",
  "location",
];

type TourSlideData = {
  key: string;
  isAuth: false;
  icon: keyof typeof Ionicons.glyphMap;
  accent: (typeof TOUR_ACCENTS)[0];
  titleKey: "onboarding1Title" | "onboarding2Title" | "onboarding3Title";
  subKey: "onboarding1Sub" | "onboarding2Sub" | "onboarding3Sub";
};
type AuthSlideData = { key: "auth"; isAuth: true };
type SlideData = TourSlideData | AuthSlideData;

const TOUR_SLIDES: TourSlideData[] = TOUR_ACCENTS.map((accent, i) => ({
  key: ["welcome", "events", "places"][i],
  isAuth: false as const,
  icon: TOUR_ICONS[i],
  accent,
  titleKey: (["onboarding1Title", "onboarding2Title", "onboarding3Title"] as const)[i],
  subKey: (["onboarding1Sub", "onboarding2Sub", "onboarding3Sub"] as const)[i],
}));

const SLIDES: SlideData[] = [...TOUR_SLIDES, { key: "auth", isAuth: true }];

// ─── Root component ──────────────────────────────────────────────
export default function OnboardingScreen() {
  const { setHasOnboarded, setLang, lang, isDark } = useApp();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const [activeIdx, setActiveIdx] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const t = (key: keyof typeof translations.fr) =>
    translations[lang][key] || translations.fr[key];

  const onViewChange = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) setActiveIdx(viewableItems[0].index ?? 0);
    },
  ).current;

  const isAuthGateway = activeIdx === 3;
  const isTourLast = activeIdx === 2;

  // Clamp to last tour slide for accent derivation
  const activeAccentIdx = Math.min(activeIdx, 2);
  const activeAccent = isDark
    ? TOUR_ACCENTS[activeAccentIdx].dark
    : TOUR_ACCENTS[activeAccentIdx].light;
  const activeAccentDeep = isDark
    ? TOUR_ACCENTS[activeAccentIdx].deep.dark
    : TOUR_ACCENTS[activeAccentIdx].deep.light;

  function scrollToIndex(index: number) {
    flatRef.current?.scrollToIndex({ index, animated: true });
    setActiveIdx(index);
  }

  function goNext() {
    scrollToIndex(Math.min(activeIdx + 1, 3));
  }

  // Skip the tour, land on auth gateway
  function goSkip() {
    scrollToIndex(3);
  }

  // Navigate to auth screen as modal, with tabs underneath
  async function goToAuth(mode: "login" | "register") {
    await setHasOnboarded();
    // Replace onboarding with tabs first, then push auth modal on top
    router.replace("/(tabs)" as any);
    setTimeout(() => {
      router.push({ pathname: "/auth", params: { mode } } as any);
    }, 80);
  }

  async function handleContinueGuest() {
    await setHasOnboarded();
    safeReplace("/(tabs)");
  }

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      {/* Animated gradient backdrop — only for tour slides 0-2 */}
      <TourBackdrop slides={TOUR_SLIDES} scrollX={scrollX} isDark={isDark} />

      {/* Auth gateway backdrop — fades in on slide 3 */}
      <AuthBackdrop scrollX={scrollX} isDark={isDark} />

      {/* ── Header (progress + skip) — hidden on auth gateway ── */}
      {!isAuthGateway && (
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.progressRow}>
            {TOUR_SLIDES.map((s, i) => {
              const ir = [(i - 1) * SCREEN_W, i * SCREEN_W, (i + 1) * SCREEN_W];
              const fillW = scrollX.interpolate({
                inputRange: ir,
                outputRange: ["0%", "100%", "100%"],
                extrapolate: "clamp",
              });
              const accent = isDark ? s.accent.dark : s.accent.light;
              return (
                <View key={s.key} style={[styles.progressSeg, { backgroundColor: C.border + "88" }]}>
                  <Animated.View style={[styles.progressFill, { width: fillW, backgroundColor: accent }]} />
                </View>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.skipBtn, { backgroundColor: C.card2 }]}
            onPress={goSkip}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel={lang === "fr" ? "Passer l'introduction" : "Skip intro"}
            accessibilityRole="button"
          >
            <Text style={[styles.skipText, { color: C.textMuted }]}>{t("onboardingSkip")}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Top safe area placeholder for auth gateway */}
      {isAuthGateway && <View style={{ height: insets.top + 8 }} />}

      {/* ── Slides ── */}
      <Animated.FlatList
        ref={flatRef as any}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onViewableItemsChanged={onViewChange}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        renderItem={({ item, index }) => {
          if (item.isAuth) {
            return (
              <AuthGatewaySlide
                C={C}
                isDark={isDark}
                lang={lang}
                t={t}
                insets={insets}
                onCreateAccount={() => goToAuth("register")}
                onSignIn={() => goToAuth("login")}
                onContinueGuest={handleContinueGuest}
              />
            );
          }
          return (
            <TourSlide
              slide={item}
              index={index}
              scrollX={scrollX}
              isDark={isDark}
              C={C}
              t={t}
              lang={lang}
              setLang={setLang}
            />
          );
        }}
      />

      {/* ── Bottom — dots + CTA (hidden on auth gateway) ── */}
      {!isAuthGateway && (
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.dots}>
            {TOUR_SLIDES.map((s, i) => {
              const ir = [(i - 1) * SCREEN_W, i * SCREEN_W, (i + 1) * SCREEN_W];
              const dotW = scrollX.interpolate({ inputRange: ir, outputRange: [8, 28, 8], extrapolate: "clamp" });
              const op = scrollX.interpolate({ inputRange: ir, outputRange: [0.3, 1, 0.3], extrapolate: "clamp" });
              const accent = isDark ? s.accent.dark : s.accent.light;
              return (
                <Animated.View key={s.key} style={[styles.dot, { width: dotW, opacity: op, backgroundColor: accent }]} />
              );
            })}
          </View>

          <TouchableOpacity
            onPress={goNext}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={isTourLast ? t("onboardingStart") : t("onboardingNext")}
          >
            <LinearGradient
              colors={[activeAccent, activeAccentDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.ctaBtn,
                isDark
                  ? { shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 }
                  : { shadowColor: activeAccent, shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
              ]}
            >
              <Text style={styles.ctaText}>
                {isTourLast ? t("onboardingStart") : t("onboardingNext")}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Animated gradient backdrop for tour slides ──────────────────
function TourBackdrop({
  slides, scrollX, isDark,
}: {
  slides: TourSlideData[];
  scrollX: Animated.Value;
  isDark: boolean;
}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {slides.map((s, i) => {
        const ir = [(i - 1) * SCREEN_W, i * SCREEN_W, (i + 1) * SCREEN_W];
        const opacity = scrollX.interpolate({ inputRange: ir, outputRange: [0, 1, 0], extrapolate: "clamp" });
        const accent = isDark ? s.accent.dark : s.accent.light;
        const deep = isDark ? s.accent.deep.dark : s.accent.deep.light;
        const gradColors: [string, string, string] = isDark
          ? [deep + "40", deep + "10", "transparent"]
          : [accent + "14", accent + "06", "transparent"];
        return (
          <Animated.View key={s.key} style={[StyleSheet.absoluteFill, { opacity }]}>
            <LinearGradient colors={gradColors} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
            <View style={[styles.bgGlow, styles.bgGlowTop, { backgroundColor: accent + (isDark ? "22" : "10") }]} />
            <View style={[styles.bgGlow, styles.bgGlowBot, { backgroundColor: deep + (isDark ? "18" : "0C") }]} />
          </Animated.View>
        );
      })}
    </View>
  );
}

// ─── Auth gateway backdrop (fades in as scrollX → 3*SCREEN_W) ───
function AuthBackdrop({ scrollX, isDark }: { scrollX: Animated.Value; isDark: boolean }) {
  const opacity = scrollX.interpolate({
    inputRange: [2 * SCREEN_W, 3 * SCREEN_W],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      <LinearGradient
        colors={isDark ? ["#7060C840", "#A898EC14", "transparent"] : ["#6650D818", "#A898EC08", "transparent"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.bgGlow, styles.bgGlowTop, { backgroundColor: isDark ? "#A898EC28" : "#6650D812" }]} />
      <View style={[styles.bgGlow, styles.bgGlowBot, { backgroundColor: isDark ? "#7060C820" : "#4A3BB80A" }]} />
    </Animated.View>
  );
}

// ─── Single tour slide ────────────────────────────────────────────
function TourSlide({
  slide, index, scrollX, isDark, C, t, lang, setLang,
}: {
  slide: TourSlideData;
  index: number;
  scrollX: Animated.Value;
  isDark: boolean;
  C: ReturnType<typeof useColors>;
  t: (k: keyof typeof translations.fr) => string;
  lang: Lang;
  setLang: (l: Lang) => void;
}) {
  const ir = [(index - 1) * SCREEN_W, index * SCREEN_W, (index + 1) * SCREEN_W];
  const heroScale   = scrollX.interpolate({ inputRange: ir, outputRange: [0.72, 1, 0.72],  extrapolate: "clamp" });
  const heroOpacity = scrollX.interpolate({ inputRange: ir, outputRange: [0.25, 1, 0.25], extrapolate: "clamp" });
  const textSlide   = scrollX.interpolate({ inputRange: ir, outputRange: [55, 0, -55],    extrapolate: "clamp" });

  const accent = isDark ? slide.accent.dark  : slide.accent.light;
  const deep   = isDark ? slide.accent.deep.dark : slide.accent.deep.light;

  return (
    <View style={[styles.slide, index === 0 && { gap: 10 }]}>
      {/* Hero */}
      <Animated.View
        style={[
          styles.heroWrap,
          index === 0 && { height: 190 },
          { opacity: heroOpacity, transform: [{ scale: heroScale }] },
        ]}
      >
        {index === 1 ? (
          /* Concert image */
          <View style={[styles.concertHero, { borderColor: accent + "30" }]}>
            <Image
              source={require("@/assets/images/concert-crowd.png")}
              style={styles.concertImg}
              contentFit="cover"
            />
            <LinearGradient
              colors={
                isDark
                  ? ["rgba(12,15,34,0)", "rgba(12,15,34,0.45)", "rgba(12,15,34,0.88)"]
                  : ["rgba(245,243,252,0)", "rgba(245,243,252,0.2)", "rgba(245,243,252,0.65)"]
              }
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.heroIconBubble, { backgroundColor: accent + "E8" }]}>
              <Ionicons name={slide.icon} size={34} color="#FFFFFF" />
            </View>
          </View>
        ) : (
          /* Icon rings */
          <View style={styles.iconHero}>
            <View style={[styles.iconHeroOuterRing, { borderColor: accent + "2A" }]} />
            <View style={[styles.iconHeroMidRing,   { borderColor: accent + "48" }]} />
            <LinearGradient
              colors={[accent, deep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.iconHeroCore,
                isDark
                  ? { shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 }
                  : { shadowColor: accent, shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
              ]}
            >
              <Ionicons name={slide.icon} size={62} color="#FFFFFF" />
            </LinearGradient>
          </View>
        )}
      </Animated.View>

      {/* Text + content */}
      <Animated.View style={[styles.body, { transform: [{ translateX: textSlide }] }]}>
        {/* Brand mark — slide 0 only */}
        {index === 0 && (
          <View style={styles.brandMark}>
            <Text style={[styles.brandNo, { color: C.text }]}>No</Text>
            <Text style={[styles.brandStress, { color: accent }]}>Stress</Text>
            <View style={[styles.brandDot, { backgroundColor: C.gold }]} />
          </View>
        )}

        <Text style={[styles.slideTitle, { color: C.text }]}>{t(slide.titleKey)}</Text>
        <Text style={[styles.slideSub, { color: C.textMuted }]}>{t(slide.subKey)}</Text>

        {/* Category pills — slide 1 */}
        {index === 1 && (
          <View style={styles.pillRow}>
            {[
              { label: "Concerts",  icon: "mic"    as const, color: accent },
              { label: "Festivals", icon: "bonfire" as const, color: C.gold },
              { label: lang === "fr" ? "Soirées" : "Parties", icon: "moon" as const, color: deep },
            ].map((v) => (
              <View key={v.label} style={[styles.pill, { borderColor: v.color + "44", backgroundColor: v.color + (isDark ? "14" : "0C") }]}>
                <Ionicons name={v.icon} size={14} color={v.color} />
                <Text style={[styles.pillText, { color: v.color }]}>{v.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Feature list — slide 2 */}
        {index === 2 && (
          <View style={styles.featureList}>
            {[
              { icon: "map-outline"  as const, label: lang === "fr" ? "Carte interactive"   : "Interactive map",   color: accent },
              { icon: "location"     as const, label: lang === "fr" ? "Lieux & itinéraires"  : "Places & routes",  color: deep },
            ].map((f) => (
              <View key={f.label} style={[styles.featureItem, { backgroundColor: f.color + (isDark ? "14" : "0A"), borderColor: f.color + "28" }]}>
                <View style={[styles.featureIcon, { backgroundColor: f.color + (isDark ? "28" : "18") }]}>
                  <Ionicons name={f.icon} size={18} color={f.color} />
                </View>
                <Text style={[styles.featureText, { color: C.text }]}>{f.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Language selector — slide 0 only, compact */}
        {index === 0 && (
          <View style={styles.langRow}>
            <LangChip flag="🇫🇷" label="Français" active={lang === "fr"} color={accent} C={C} onPress={() => setLang("fr")} />
            <LangChip flag="🇬🇧" label="English"  active={lang === "en"} color={accent} C={C} onPress={() => setLang("en")} />
          </View>
        )}
      </Animated.View>
    </View>
  );
}

// ─── Auth gateway slide ───────────────────────────────────────────
function AuthGatewaySlide({
  C, isDark, lang, t, insets,
  onCreateAccount, onSignIn, onContinueGuest,
}: {
  C: ReturnType<typeof useColors>;
  isDark: boolean;
  lang: Lang;
  t: (k: keyof typeof translations.fr) => string;
  insets: ReturnType<typeof import("react-native-safe-area-context").useSafeAreaInsets>;
  onCreateAccount: () => void;
  onSignIn: () => void;
  onContinueGuest: () => void;
}) {
  const LAVENDER      = isDark ? "#A898EC" : "#6650D8";
  const LAVENDER_DEEP = isDark ? "#7060C8" : "#4A3BB8";

  return (
    <View style={[gwStyles.root, { width: SCREEN_W, paddingBottom: insets.bottom + 32 }]}>
      {/* Brand mark */}
      <View style={gwStyles.brand}>
        <LinearGradient
          colors={[LAVENDER, LAVENDER_DEEP]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            gwStyles.logoCircle,
            isDark
              ? { shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 }
              : { shadowColor: LAVENDER, shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
          ]}
        >
          <Text style={gwStyles.logoLetter}>N</Text>
        </LinearGradient>
        <View style={gwStyles.wordmark}>
          <Text style={[gwStyles.wordmarkNo, { color: C.text }]}>No</Text>
          <Text style={[gwStyles.wordmarkStress, { color: LAVENDER }]}>Stress</Text>
          <View style={[gwStyles.wordmarkDot, { backgroundColor: C.gold }]} />
        </View>
      </View>

      {/* Headline */}
      <View style={gwStyles.headline}>
        <Text style={[gwStyles.title, { color: C.text }]}>{t("onboardingJoinTitle")}</Text>
        <Text style={[gwStyles.subtitle, { color: C.textMuted }]}>{t("onboardingJoinSub")}</Text>
      </View>

      {/* CTAs */}
      <View style={gwStyles.buttons}>
        {/* Primary — Create account */}
        <TouchableOpacity
          onPress={onCreateAccount}
          activeOpacity={0.88}
          style={gwStyles.primaryBtnWrap}
          accessibilityRole="button"
          accessibilityLabel={t("onboardingCreateAccount")}
        >
          <LinearGradient
            colors={[LAVENDER, LAVENDER_DEEP]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              gwStyles.primaryBtn,
              isDark
                ? { shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 6 }
                : { shadowColor: LAVENDER, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
            ]}
          >
            <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
            <Text style={gwStyles.primaryBtnText}>{t("onboardingCreateAccount")}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Secondary — Sign in */}
        <TouchableOpacity
          onPress={onSignIn}
          activeOpacity={0.88}
          style={[
            gwStyles.secondaryBtn,
            {
              borderColor: LAVENDER + "66",
              backgroundColor: LAVENDER + (isDark ? "12" : "09"),
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t("onboardingHaveAccount")}
        >
          <Ionicons name="log-in-outline" size={18} color={LAVENDER} />
          <Text style={[gwStyles.secondaryBtnText, { color: LAVENDER }]}>{t("onboardingHaveAccount")}</Text>
        </TouchableOpacity>
      </View>

      {/* Ghost link — continue as guest */}
      <TouchableOpacity
        onPress={onContinueGuest}
        activeOpacity={0.7}
        style={gwStyles.guestBtn}
        hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
        accessibilityRole="button"
        accessibilityLabel={t("onboardingGuest")}
        accessibilityHint={lang === "fr" ? "Continuer sans créer de compte" : "Continue without creating an account"}
      >
        <Text style={[gwStyles.guestText, { color: C.textMuted }]}>
          {t("onboardingGuest")}
        </Text>
        <Ionicons name="chevron-forward" size={13} color={C.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Language chip ────────────────────────────────────────────────
function LangChip({
  flag, label, active, color, C, onPress,
}: {
  flag: string;
  label: string;
  active: boolean;
  color: string;
  C: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={[
        styles.langChip,
        { borderColor: active ? color : C.border, backgroundColor: active ? color + "1E" : C.card },
      ]}
    >
      <Text style={styles.langFlag}>{flag}</Text>
      <Text style={[styles.langLabel, { color: active ? color : C.textMuted, fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Shared styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Header */
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    zIndex: 5,
  },
  progressRow: { flex: 1, flexDirection: "row", gap: 6, alignItems: "center" },
  progressSeg:  { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  skipBtn:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14 },
  skipText:     { fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },

  /* Backdrop glows */
  bgGlow:    { position: "absolute", borderRadius: 9999 },
  bgGlowTop: { width: 340, height: 340, top: -110, right: -120 },
  bgGlowBot: { width: 300, height: 300, bottom: -90, left: -100 },

  /* Tour slides */
  slide: { width: SCREEN_W, flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 26 },

  /* Hero */
  heroWrap:        { alignItems: "center", justifyContent: "center", height: 250 },
  iconHero:        { width: 230, height: 230, alignItems: "center", justifyContent: "center" },
  iconHeroOuterRing: { position: "absolute", width: 230, height: 230, borderRadius: 115, borderWidth: 1.5 },
  iconHeroMidRing:   { position: "absolute", width: 175, height: 175, borderRadius:  88, borderWidth: 1.5 },
  iconHeroCore:      { width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center" },
  concertHero:     { width: 290, height: 230, borderRadius: 28, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 1 },
  concertImg:      { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  heroIconBubble:  { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },

  /* Body */
  body:        { width: "100%", alignItems: "center", gap: 12 },
  brandMark:   { flexDirection: "row", alignItems: "baseline", gap: 2 },
  brandNo:     { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -0.8 },
  brandStress: { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -0.8 },
  brandDot:    { width: 6, height: 6, borderRadius: 3, marginLeft: 4, marginBottom: 4 },
  slideTitle:  { fontSize: 27, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.5 },
  slideSub:    { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 23, paddingHorizontal: 6 },

  /* Pills */
  pillRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 4 },
  pill:    { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 22, borderWidth: 1 },
  pillText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  /* Feature list */
  featureList: { width: "100%", gap: 9, marginTop: 4 },
  featureItem: { flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 16, borderWidth: 1 },
  featureIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  featureText: { fontSize: 15, fontFamily: "Inter_500Medium", flex: 1 },

  /* Language chips — slide 0 */
  langRow:  { flexDirection: "row", gap: 8, marginTop: 8 },
  langChip: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14, borderWidth: 1.5 },
  langFlag: { fontSize: 16 },
  langLabel: { fontSize: 13 },

  /* Bottom bar */
  bottom:  { paddingHorizontal: 24, gap: 20 },
  dots:    { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7 },
  dot:     { height: 8, borderRadius: 4 },
  ctaBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 17, borderRadius: 18 },
  ctaText: { fontSize: 17, fontFamily: "Inter_700Bold", letterSpacing: 0.3, color: "#FFFFFF" },
});

// ─── Auth gateway styles ──────────────────────────────────────────
const gwStyles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingTop: 32,
  },

  /* Brand section */
  brand: { alignItems: "center", gap: 16 },
  logoCircle: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  logoLetter: { fontSize: 38, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -1 },
  wordmark:      { flexDirection: "row", alignItems: "baseline", gap: 2 },
  wordmarkNo:    { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.8 },
  wordmarkStress: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.8 },
  wordmarkDot:   { width: 6, height: 6, borderRadius: 3, marginLeft: 3, marginBottom: 4 },

  /* Headline */
  headline: { alignItems: "center", gap: 10, paddingHorizontal: 8 },
  title:    { fontSize: 28, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.6 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },

  /* Buttons */
  buttons:       { width: "100%", gap: 12 },
  primaryBtnWrap: { width: "100%" },
  primaryBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18, borderRadius: 18 },
  primaryBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: 0.2 },
  secondaryBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 17, borderRadius: 18, borderWidth: 1.5 },
  secondaryBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", letterSpacing: 0.2 },

  /* Ghost link */
  guestBtn:  { flexDirection: "row", alignItems: "center", gap: 4 },
  guestText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
