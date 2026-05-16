import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { safeReplace } from "@/lib/navigation";
import { useApp } from "@/context/AppContext";
import { translations, Lang } from "@/constants/i18n";

const { width: SCREEN_W } = Dimensions.get("window");

const LAVENDER = "#B5A8F0";
const LAVENDER_DEEP = "#7A6BD8";
const GOLD = "#E5C46B";
const CORAL = "#F47A95";
const CYAN = "#5FD4F5";
const BG = "#0A0820";
const BG_TOP = "#15102E";

type Slide = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  accentDeep: string;
  gradient: [string, string, string];
  titleKey: keyof typeof translations.fr;
  subKey: keyof typeof translations.fr;
};

const SLIDES: Slide[] = [
  {
    key: "welcome",
    icon: "sparkles",
    accent: LAVENDER,
    accentDeep: LAVENDER_DEEP,
    gradient: ["#1A0F3D", "#0E0826", "#06030F"],
    titleKey: "onboarding1Title",
    subKey: "onboarding1Sub",
  },
  {
    key: "concert",
    icon: "musical-notes",
    accent: CORAL,
    accentDeep: "#C4476A",
    gradient: ["#3D0F26", "#260815", "#0F030A"],
    titleKey: "onboarding2Title",
    subKey: "onboarding2Sub",
  },
  {
    key: "ai",
    icon: "hardware-chip",
    accent: CYAN,
    accentDeep: "#3BA6C2",
    gradient: ["#0F2D3D", "#082026", "#03101A"],
    titleKey: "onboarding3Title",
    subKey: "onboarding3Sub",
  },
];

export default function OnboardingScreen() {
  const { setHasOnboarded, setLang, lang, themeMode, setThemeMode } = useApp();
  const insets = useSafeAreaInsets();
  const [activeIdx, setActiveIdx] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const t = (key: keyof typeof translations.fr) =>
    translations[lang][key] || translations.fr[key];

  const onViewChange = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        const idx = viewableItems[0].index ?? 0;
        setActiveIdx(idx);
      }
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

  const isLast = activeIdx === SLIDES.length - 1;
  const activeSlide = SLIDES[activeIdx];

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      {/* Animated per-slide gradient backdrop */}
      <SlideBackdrop slides={SLIDES} scrollX={scrollX} />

      {/* Top header — progress segments + Skip, on the same row.
          Plus aucun chevauchement possible. */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.progressRow}>
          {SLIDES.map((s, i) => {
            const inputRange = [
              (i - 1) * SCREEN_W,
              i * SCREEN_W,
              (i + 1) * SCREEN_W,
            ];
            const fillW = scrollX.interpolate({
              inputRange,
              outputRange: ["0%", "100%", "100%"],
              extrapolate: "clamp",
            });
            return (
              <View key={s.key} style={styles.progressSeg}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    { width: fillW, backgroundColor: s.accent },
                  ]}
                />
              </View>
            );
          })}
        </View>

        {!isLast ? (
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={finish}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.skipText}>{t("onboardingSkip")}</Text>
          </TouchableOpacity>
        ) : (
          // placeholder pour garder l'alignement quand le bouton disparaît
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
            const inputRange = [
              (i - 1) * SCREEN_W,
              i * SCREEN_W,
              (i + 1) * SCREEN_W,
            ];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 28, 8],
              extrapolate: "clamp",
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.35, 1, 0.35],
              extrapolate: "clamp",
            });
            return (
              <Animated.View
                key={s.key}
                style={[
                  styles.dot,
                  { width: dotWidth, opacity, backgroundColor: s.accent },
                ]}
              />
            );
          })}
        </View>

        <TouchableOpacity onPress={goNext} activeOpacity={0.85}>
          <LinearGradient
            colors={[activeSlide.accent, activeSlide.accentDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaText}>
              {isLast ? t("onboardingStart") : t("onboardingNext")}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#0A0820" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ─── Per-slide animated gradient backdrop ───────────────────────────── */
function SlideBackdrop({
  slides,
  scrollX,
}: {
  slides: Slide[];
  scrollX: Animated.Value;
}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {slides.map((s, i) => {
        const inputRange = [
          (i - 1) * SCREEN_W,
          i * SCREEN_W,
          (i + 1) * SCREEN_W,
        ];
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0, 1, 0],
          extrapolate: "clamp",
        });
        return (
          <Animated.View
            key={s.key}
            style={[StyleSheet.absoluteFill, { opacity }]}
          >
            <LinearGradient
              colors={s.gradient}
              locations={[0, 0.55, 1]}
              style={StyleSheet.absoluteFill}
            />
            {/* Glow accent */}
            <View
              style={[
                styles.bgGlow,
                styles.bgGlowTop,
                { backgroundColor: s.accent + "26" },
              ]}
            />
            <View
              style={[
                styles.bgGlow,
                styles.bgGlowBot,
                { backgroundColor: s.accentDeep + "1F" },
              ]}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

/* ─── Single slide ───────────────────────────────────────────────────── */
type ThemeMode = "dark" | "light" | "system";

function SlideView({
  slide,
  index,
  scrollX,
  t,
  lang,
  setLang,
  themeMode,
  setThemeMode,
}: {
  slide: Slide;
  index: number;
  scrollX: Animated.Value;
  t: (key: keyof typeof translations.fr) => string;
  lang: Lang;
  setLang: (l: Lang) => void;
  themeMode: ThemeMode;
  setThemeMode: (m: ThemeMode) => void;
}) {
  const inputRange = [
    (index - 1) * SCREEN_W,
    index * SCREEN_W,
    (index + 1) * SCREEN_W,
  ];

  const heroScale = scrollX.interpolate({
    inputRange,
    outputRange: [0.7, 1, 0.7],
    extrapolate: "clamp",
  });
  const heroOpacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.3, 1, 0.3],
    extrapolate: "clamp",
  });
  const textTranslate = scrollX.interpolate({
    inputRange,
    outputRange: [60, 0, -60],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.slide}>
      {/* Hero visual */}
      <Animated.View
        style={[
          styles.heroWrap,
          { opacity: heroOpacity, transform: [{ scale: heroScale }] },
        ]}
      >
        {index === 1 ? (
          <View style={styles.concertHero}>
            <Image
              source={require("@/assets/images/concert-crowd.png")}
              style={styles.concertImg}
              resizeMode="cover"
            />
            <LinearGradient
              colors={[
                "rgba(10, 8, 32, 0)",
                "rgba(10, 8, 32, 0.45)",
                "rgba(10, 8, 32, 0.9)",
              ]}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.heroIconBubble, { backgroundColor: slide.accent + "DD" }]}>
              <Ionicons name={slide.icon} size={36} color="#FFFFFF" />
            </View>
          </View>
        ) : (
          <View style={styles.iconHero}>
            <View
              style={[
                styles.iconHeroOuterRing,
                { borderColor: slide.accent + "33" },
              ]}
            />
            <View
              style={[
                styles.iconHeroMidRing,
                { borderColor: slide.accent + "55" },
              ]}
            />
            <LinearGradient
              colors={[slide.accent, slide.accentDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconHeroCore}
            >
              <Ionicons name={slide.icon} size={64} color="#FFFFFF" />
            </LinearGradient>
          </View>
        )}
      </Animated.View>

      {/* Brand mark on slide 0 */}
      <Animated.View
        style={[styles.body, { transform: [{ translateX: textTranslate }] }]}
      >
        {index === 0 && (
          <View style={styles.brandMark}>
            <Text style={styles.brandNo}>No</Text>
            <Text style={[styles.brandStress, { color: slide.accent }]}>Stress</Text>
            <View style={[styles.brandDot, { backgroundColor: GOLD }]} />
          </View>
        )}

        <Text style={styles.slideTitle}>{t(slide.titleKey)}</Text>
        <Text style={styles.slideSub}>{t(slide.subKey)}</Text>

        {index === 0 && (
          <View style={styles.langRow}>
            <Text style={styles.langLabel}>{t("onboardingChooseLang")}</Text>
            <View style={styles.langBtns}>
              <LangChip
                flag="🇫🇷"
                label="Français"
                active={lang === "fr"}
                color={LAVENDER}
                onPress={() => setLang("fr")}
              />
              <LangChip
                flag="🇬🇧"
                label="English"
                active={lang === "en"}
                color={CYAN}
                onPress={() => setLang("en")}
              />
            </View>
          </View>
        )}

        {index === 0 && (
          <View style={styles.langRow}>
            <Text style={styles.langLabel}>{t("onboardingChooseTheme")}</Text>
            <View style={styles.langBtns}>
              <ThemeChip
                icon="moon"
                label={t("themeDark")}
                active={themeMode === "dark"}
                color={LAVENDER}
                onPress={() => setThemeMode("dark")}
              />
              <ThemeChip
                icon="sunny"
                label={t("themeLight")}
                active={themeMode === "light"}
                color={GOLD}
                onPress={() => setThemeMode("light")}
              />
              <ThemeChip
                icon="phone-portrait"
                label={t("themeSystem")}
                active={themeMode === "system"}
                color={CYAN}
                onPress={() => setThemeMode("system")}
              />
            </View>
          </View>
        )}

        {index === 1 && (
          <View style={styles.pillRow}>
            {[
              { label: "Concerts", icon: "mic" as const, color: CORAL },
              { label: "Festivals", icon: "bonfire" as const, color: GOLD },
              {
                label: lang === "fr" ? "Soirées" : "Parties",
                icon: "moon" as const,
                color: CYAN,
              },
            ].map((v) => (
              <View
                key={v.label}
                style={[styles.pill, { borderColor: v.color + "55" }]}
              >
                <Ionicons name={v.icon} size={14} color={v.color} />
                <Text style={[styles.pillText, { color: v.color }]}>{v.label}</Text>
              </View>
            ))}
          </View>
        )}

        {index === 2 && (
          <View style={styles.featureList}>
            {[
              {
                icon: "flash" as const,
                label: lang === "fr" ? "Réservation instantanée" : "Instant booking",
                color: CYAN,
              },
            ].map((f) => (
              <View key={f.label} style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: f.color + "20" }]}>
                  <Ionicons name={f.icon} size={18} color={f.color} />
                </View>
                <Text style={styles.featureText}>{f.label}</Text>
              </View>
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

function LangChip({
  flag,
  label,
  active,
  color,
  onPress,
}: {
  flag: string;
  label: string;
  active: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.langBtn,
        active && { borderColor: color, backgroundColor: color + "22" },
      ]}
    >
      <Text style={styles.langFlag}>{flag}</Text>
      <Text style={[styles.langText, active && { color: "#F0EDF8", fontFamily: "Inter_600SemiBold" }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ThemeChip({
  icon,
  label,
  active,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.langBtn,
        active && { borderColor: color, backgroundColor: color + "22" },
      ]}
    >
      <Ionicons name={icon} size={16} color={active ? color : "#7E7AA0"} />
      <Text style={[styles.langText, active && { color: "#F0EDF8", fontFamily: "Inter_600SemiBold" }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Header (progress + skip) */
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    zIndex: 5,
  },
  progressRow: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  progressSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  skipPlaceholder: { width: 56 },
  skipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#D7D3EC",
    letterSpacing: 0.4,
  },

  /* Backdrop glows */
  bgGlow: {
    position: "absolute",
    borderRadius: 9999,
  },
  bgGlowTop: {
    width: 360,
    height: 360,
    top: -120,
    right: -120,
  },
  bgGlowBot: {
    width: 320,
    height: 320,
    bottom: -100,
    left: -100,
  },

  /* Slide */
  slide: {
    width: SCREEN_W,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 28,
  },

  /* Hero */
  heroWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: 240,
  },
  iconHero: {
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  iconHeroOuterRing: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
  },
  iconHeroMidRing: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1.5,
  },
  iconHeroCore: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  concertHero: {
    width: 280,
    height: 220,
    borderRadius: 28,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  concertImg: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  heroIconBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },

  /* Body */
  body: {
    width: "100%",
    alignItems: "center",
    gap: 14,
  },
  brandMark: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  brandNo: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#F4F1FA",
    letterSpacing: -0.8,
  },
  brandStress: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.8,
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 4,
    marginBottom: 4,
  },
  slideTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#F4F1FA",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  slideSub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#A6A2C4",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },

  /* Lang chips */
  langRow: {
    width: "100%",
    marginTop: 6,
    gap: 10,
    alignItems: "center",
  },
  langLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#7E7AA0",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  langBtns: {
    flexDirection: "row",
    gap: 10,
  },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  langFlag: { fontSize: 18 },
  langText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#A6A2C4",
  },

  /* Pills */
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },

  /* Feature list */
  featureList: {
    width: "100%",
    gap: 10,
    marginTop: 6,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#F0EDF8",
  },

  /* Bottom */
  bottom: {
    paddingHorizontal: 24,
    gap: 22,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  ctaText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#0A0820",
    letterSpacing: 0.3,
  },
});
