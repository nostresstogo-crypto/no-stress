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

import { safeReplace } from "@/lib/navigation";
import { useApp, useColors } from "@/context/AppContext";
import { translations, Lang } from "@/constants/i18n";

const { width: SCREEN_W } = Dimensions.get("window");

// Per-slide accent colors — work on both light & dark
const SLIDE_ACCENTS = [
  { light: "#6650D8", dark: "#A898EC", accentDeep: { light: "#4A3BB8", dark: "#7060C8" } },
  { light: "#C04070", dark: "#F47A95", accentDeep: { light: "#9A2850", dark: "#C4476A" } },
  { light: "#1880A8", dark: "#5FD4F5", accentDeep: { light: "#105E82", dark: "#3BA6C2" } },
];

const SLIDE_ICONS: Array<keyof typeof Ionicons.glyphMap> = [
  "sparkles",
  "musical-notes",
  "location",
];

const SLIDE_TITLE_KEYS: Array<keyof typeof translations.fr> = [
  "onboarding1Title",
  "onboarding2Title",
  "onboarding3Title",
];
const SLIDE_SUB_KEYS: Array<keyof typeof translations.fr> = [
  "onboarding1Sub",
  "onboarding2Sub",
  "onboarding3Sub",
];

const SLIDES = SLIDE_ACCENTS.map((a, i) => ({
  key: ["welcome", "events", "places"][i],
  icon: SLIDE_ICONS[i],
  accent: a,
  titleKey: SLIDE_TITLE_KEYS[i],
  subKey: SLIDE_SUB_KEYS[i],
}));

export default function OnboardingScreen() {
  const { setHasOnboarded, setLang, lang, themeMode, setThemeMode, isDark } = useApp();
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

  function goNext() {
    if (activeIdx < SLIDES.length - 1) {
      const next = activeIdx + 1;
      flatRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveIdx(next);
    } else {
      finish();
    }
  }

  async function finish() {
    await setHasOnboarded();
    safeReplace("/(tabs)");
  }

  const isLast     = activeIdx === SLIDES.length - 1;
  const activeSlide = SLIDES[activeIdx];
  const activeAccent = isDark ? activeSlide.accent.dark : activeSlide.accent.light;
  const activeAccentDeep = isDark ? activeSlide.accent.accentDeep.dark : activeSlide.accent.accentDeep.light;

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      {/* Per-slide animated gradient backdrop */}
      <SlideBackdrop slides={SLIDES} scrollX={scrollX} isDark={isDark} />

      {/* Header — progress + Skip */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.progressRow}>
          {SLIDES.map((s, i) => {
            const inputRange = [(i - 1) * SCREEN_W, i * SCREEN_W, (i + 1) * SCREEN_W];
            const fillW = scrollX.interpolate({ inputRange, outputRange: ["0%", "100%", "100%"], extrapolate: "clamp" });
            const accent = isDark ? s.accent.dark : s.accent.light;
            return (
              <View key={s.key} style={[styles.progressSeg, { backgroundColor: C.border + "88" }]}>
                <Animated.View style={[styles.progressFill, { width: fillW, backgroundColor: accent }]} />
              </View>
            );
          })}
        </View>
        {!isLast ? (
          <TouchableOpacity
            style={[styles.skipBtn, { backgroundColor: C.card2 }]}
            onPress={finish}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.skipText, { color: C.textMuted }]}>{t("onboardingSkip")}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
      </View>

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
        renderItem={({ item, index }) => (
          <SlideView
            slide={item}
            index={index}
            scrollX={scrollX}
            isDark={isDark}
            C={C}
            t={t}
            lang={lang}
            setLang={setLang}
            themeMode={themeMode}
            setThemeMode={setThemeMode}
          />
        )}
      />

      {/* Bottom CTA */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => {
            const inputRange = [(i - 1) * SCREEN_W, i * SCREEN_W, (i + 1) * SCREEN_W];
            const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 28, 8], extrapolate: "clamp" });
            const opacity  = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: "clamp" });
            const accent   = isDark ? s.accent.dark : s.accent.light;
            return (
              <Animated.View key={s.key} style={[styles.dot, { width: dotWidth, opacity, backgroundColor: accent }]} />
            );
          })}
        </View>

        <TouchableOpacity onPress={goNext} activeOpacity={0.85}>
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
            <Text style={[styles.ctaText, { color: "#FFFFFF" }]}>
              {isLast ? t("onboardingStart") : t("onboardingNext")}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ─── Animated per-slide backdrop ────────────────────────────── */
function SlideBackdrop({
  slides, scrollX, isDark,
}: {
  slides: typeof SLIDES;
  scrollX: Animated.Value;
  isDark: boolean;
}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {slides.map((s, i) => {
        const inputRange = [(i - 1) * SCREEN_W, i * SCREEN_W, (i + 1) * SCREEN_W];
        const opacity    = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: "clamp" });
        const accent     = isDark ? s.accent.dark : s.accent.light;
        const accentDeep = isDark ? s.accent.accentDeep.dark : s.accent.accentDeep.light;

        // Light: very subtle tinted gradient overlay
        // Dark: richer deep gradient
        const gradColors: [string, string, string] = isDark
          ? [accentDeep + "40", accentDeep + "10", "transparent"]
          : [accent + "14", accent + "06", "transparent"];

        return (
          <Animated.View key={s.key} style={[StyleSheet.absoluteFill, { opacity }]}>
            <LinearGradient colors={gradColors} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
            <View style={[styles.bgGlow, styles.bgGlowTop, { backgroundColor: accent + (isDark ? "22" : "10") }]} />
            <View style={[styles.bgGlow, styles.bgGlowBot, { backgroundColor: accentDeep + (isDark ? "18" : "0C") }]} />
          </Animated.View>
        );
      })}
    </View>
  );
}

/* ─── Single slide ────────────────────────────────────────────── */
type ThemeMode = "dark" | "light" | "system";

function SlideView({
  slide, index, scrollX, isDark, C, t, lang, setLang, themeMode, setThemeMode,
}: {
  slide: typeof SLIDES[number];
  index: number;
  scrollX: Animated.Value;
  isDark: boolean;
  C: ReturnType<typeof useColors>;
  t: (key: keyof typeof translations.fr) => string;
  lang: Lang;
  setLang: (l: Lang) => void;
  themeMode: ThemeMode;
  setThemeMode: (m: ThemeMode) => void;
}) {
  const inputRange = [(index - 1) * SCREEN_W, index * SCREEN_W, (index + 1) * SCREEN_W];
  const heroScale    = scrollX.interpolate({ inputRange, outputRange: [0.72, 1, 0.72], extrapolate: "clamp" });
  const heroOpacity  = scrollX.interpolate({ inputRange, outputRange: [0.25, 1, 0.25], extrapolate: "clamp" });
  const textTranslate = scrollX.interpolate({ inputRange, outputRange: [55, 0, -55], extrapolate: "clamp" });

  const accent     = isDark ? slide.accent.dark : slide.accent.light;
  const accentDeep = isDark ? slide.accent.accentDeep.dark : slide.accent.accentDeep.light;

  return (
    <View style={[styles.slide, index === 0 && { gap: 12 }]}>
      {/* Hero visual */}
      <Animated.View
        style={[styles.heroWrap, index === 0 && { height: 170 }, { opacity: heroOpacity, transform: [{ scale: heroScale }] }]}
      >
        {index === 1 ? (
          /* Concert image slide */
          <View style={[styles.concertHero, { borderColor: accent + "30" }]}>
            <Image
              source={require("@/assets/images/concert-crowd.png")}
              style={styles.concertImg}
              contentFit="cover"
            />
            <LinearGradient
              colors={isDark ? ["rgba(12,15,34,0)", "rgba(12,15,34,0.5)", "rgba(12,15,34,0.92)"] : ["rgba(245,243,252,0)", "rgba(245,243,252,0.25)", "rgba(245,243,252,0.7)"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.heroIconBubble, { backgroundColor: accent + "E8" }]}>
              <Ionicons name={slide.icon} size={34} color="#FFFFFF" />
            </View>
          </View>
        ) : (
          /* Icon hero */
          <View style={styles.iconHero}>
            <View style={[styles.iconHeroOuterRing, { borderColor: accent + "2A" }]} />
            <View style={[styles.iconHeroMidRing,  { borderColor: accent + "48" }]} />
            <LinearGradient
              colors={[accent, accentDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.iconHeroCore,
                isDark
                  ? { shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 }
                  : { shadowColor: accent,  shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8  },
              ]}
            >
              <Ionicons name={slide.icon} size={62} color="#FFFFFF" />
            </LinearGradient>
          </View>
        )}
      </Animated.View>

      {/* Body */}
      <Animated.View style={[styles.body, { transform: [{ translateX: textTranslate }] }]}>
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

        {/* Language selector — slide 0 */}
        {index === 0 && (
          <View style={styles.selRow}>
            <Text style={[styles.selLabel, { color: C.textMuted }]}>{t("onboardingChooseLang")}</Text>
            <View style={styles.selBtns}>
              <LangChip flag="🇫🇷" label="Français" active={lang === "fr"} color={accent} C={C} onPress={() => setLang("fr")} />
              <LangChip flag="🇬🇧" label="English"  active={lang === "en"} color={accent} C={C} onPress={() => setLang("en")} />
            </View>
          </View>
        )}

        {/* Theme selector — slide 0 */}
        {index === 0 && (
          <View style={styles.selRow}>
            <Text style={[styles.selLabel, { color: C.textMuted }]}>{t("onboardingChooseTheme")}</Text>
            <View style={styles.selBtns}>
              <ThemeChip icon="sunny"          label={t("themeLight")}  active={themeMode === "light"}  color={SLIDE_ACCENTS[0].light} C={C} onPress={() => setThemeMode("light")}  />
              <ThemeChip icon="moon"           label={t("themeDark")}   active={themeMode === "dark"}   color={SLIDE_ACCENTS[0].dark}  C={C} onPress={() => setThemeMode("dark")}   />
              <ThemeChip icon="phone-portrait" label={t("themeSystem")} active={themeMode === "system"} color={C.textMuted}            C={C} onPress={() => setThemeMode("system")} />
            </View>
          </View>
        )}

        {/* Category pills — slide 1 */}
        {index === 1 && (
          <View style={styles.pillRow}>
            {[
              { label: "Concerts", icon: "mic"    as const, color: accent },
              { label: "Festivals", icon: "bonfire" as const, color: C.gold },
              { label: lang === "fr" ? "Soirées" : "Parties", icon: "moon" as const, color: accentDeep },
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
              { icon: "location"      as const, label: lang === "fr" ? "Lieux & itinéraires" : "Places & routes",    color: accent },
              { icon: "map-outline"   as const, label: lang === "fr" ? "Carte interactive"   : "Interactive map",    color: accentDeep },
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
      </Animated.View>
    </View>
  );
}

/* ─── Chip components ─────────────────────────────────────────── */
function LangChip({ flag, label, active, color, C, onPress }: {
  flag: string; label: string; active: boolean; color: string;
  C: ReturnType<typeof useColors>; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={[
        styles.selBtn,
        { borderColor: active ? color : C.border, backgroundColor: active ? color + "1E" : C.card },
      ]}
    >
      <Text style={styles.selFlag}>{flag}</Text>
      <Text style={[styles.selText, { color: active ? color : C.textMuted, fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium" }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ThemeChip({ icon, label, active, color, C, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; color: string;
  C: ReturnType<typeof useColors>; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={[
        styles.selBtn,
        { borderColor: active ? color : C.border, backgroundColor: active ? color + "1E" : C.card },
      ]}
    >
      <Ionicons name={icon} size={15} color={active ? color : C.textMuted} />
      <Text style={[styles.selText, { color: active ? color : C.textMuted, fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium" }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* ─── Styles ──────────────────────────────────────────────────── */
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

  skipBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14 },
  skipPlaceholder: { width: 56 },
  skipText: { fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },

  /* Slide */
  slide: { width: SCREEN_W, flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 26 },

  /* Backdrop glows */
  bgGlow:    { position: "absolute", borderRadius: 9999 },
  bgGlowTop: { width: 340, height: 340, top: -110, right: -120 },
  bgGlowBot: { width: 300, height: 300, bottom:  -90, left: -100 },

  /* Hero */
  heroWrap: { alignItems: "center", justifyContent: "center", height: 250 },
  iconHero: { width: 230, height: 230, alignItems: "center", justifyContent: "center" },
  iconHeroOuterRing: { position: "absolute", width: 230, height: 230, borderRadius: 115, borderWidth: 1.5 },
  iconHeroMidRing:   { position: "absolute", width: 175, height: 175, borderRadius:  88, borderWidth: 1.5 },
  iconHeroCore: { width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center" },

  concertHero: {
    width: 290, height: 230, borderRadius: 28, overflow: "hidden",
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  concertImg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  heroIconBubble: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },

  /* Body */
  body: { width: "100%", alignItems: "center", gap: 12 },
  brandMark: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  brandNo:     { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -0.8 },
  brandStress: { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -0.8 },
  brandDot:    { width: 6, height: 6, borderRadius: 3, marginLeft: 4, marginBottom: 4 },

  slideTitle: { fontSize: 27, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.5 },
  slideSub:   { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 23, paddingHorizontal: 6 },

  /* Selector chips */
  selRow:  { width: "100%", marginTop: 4, gap: 10, alignItems: "center" },
  selLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.5, textTransform: "uppercase" },
  selBtns: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  selBtn:  {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14, borderWidth: 1.5,
  },
  selFlag: { fontSize: 17 },
  selText: { fontSize: 13 },

  /* Pills */
  pillRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 4 },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 22, borderWidth: 1,
  },
  pillText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  /* Feature list */
  featureList: { width: "100%", gap: 9, marginTop: 4 },
  featureItem: {
    flexDirection: "row", alignItems: "center", gap: 13,
    paddingHorizontal: 14, paddingVertical: 11, borderRadius: 16, borderWidth: 1,
  },
  featureIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  featureText: { fontSize: 15, fontFamily: "Inter_500Medium", flex: 1 },

  /* Bottom */
  bottom: { paddingHorizontal: 24, gap: 20 },
  dots:   { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7 },
  dot:    { height: 8, borderRadius: 4 },
  ctaBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 17, borderRadius: 18,
  },
  ctaText: { fontSize: 17, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
});
