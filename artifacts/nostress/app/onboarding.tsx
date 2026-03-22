import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TOGO_GREEN, TOGO_YELLOW, TOGO_RED } from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { translations, Lang } from "@/constants/i18n";

const { width: SCREEN_W } = Dimensions.get("window");

const LAVENDER = "#9B8FE8";
const GOLD = "#D4AF37";
const BG = "#0E1120";

type Slide = {
  key: string;
  icon: string;
  iconColor: string;
  glowColor: string;
  titleKey: keyof typeof translations.fr;
  subKey: keyof typeof translations.fr;
  accentColor: string;
};

const SLIDES: Slide[] = [
  {
    key: "lome",
    icon: "partly-sunny-outline",
    iconColor: TOGO_YELLOW,
    glowColor: TOGO_YELLOW,
    accentColor: TOGO_YELLOW,
    titleKey: "onboarding1Title",
    subKey: "onboarding1Sub",
  },
  {
    key: "tickets",
    icon: "ticket-outline",
    iconColor: GOLD,
    glowColor: GOLD,
    accentColor: GOLD,
    titleKey: "onboarding2Title",
    subKey: "onboarding2Sub",
  },
  {
    key: "cities",
    icon: "map-outline",
    iconColor: TOGO_GREEN,
    glowColor: TOGO_GREEN,
    accentColor: TOGO_GREEN,
    titleKey: "onboarding3Title",
    subKey: "onboarding3Sub",
  },
];

const TOGO_CITIES_ONBOARD = [
  { name: "Lomé", icon: "star" as const },
  { name: "Kpalimé", icon: "leaf" as const },
  { name: "Kara", icon: "flash" as const },
  { name: "Aného", icon: "water" as const },
  { name: "Sokodé", icon: "flame" as const },
  { name: "Atakpamé", icon: "sunny" as const },
];

export default function OnboardingScreen() {
  const { setHasOnboarded, setLang, lang } = useApp();
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
    }
  ).current;

  function goNext() {
    if (activeIdx < SLIDES.length - 1) {
      const next = activeIdx + 1;
      setActiveIdx(next);
      flatRef.current?.scrollToIndex({ index: next, animated: true });
    } else {
      finish();
    }
  }

  async function finish() {
    await setHasOnboarded();
    router.replace("/(tabs)");
  }

  async function skip() {
    await finish();
  }

  const isLast = activeIdx === SLIDES.length - 1;
  const activeSlide = SLIDES[activeIdx];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Togo flag accent stripe at top */}
      <View style={styles.flagStripe}>
        <View style={[styles.flagSegment, { backgroundColor: TOGO_GREEN }]} />
        <View style={[styles.flagSegment, { backgroundColor: TOGO_YELLOW }]} />
        <View style={[styles.flagSegment, { backgroundColor: TOGO_RED }]} />
      </View>

      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={skip}>
          <Text style={styles.skipText}>{t("onboardingSkip")}</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
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
          { useNativeDriver: false }
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
          />
        )}
      />

      {/* Bottom controls */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((s, i) => {
            const inputRange = [
              (i - 1) * SCREEN_W,
              i * SCREEN_W,
              (i + 1) * SCREEN_W,
            ];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: "clamp",
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.35, 1, 0.35],
              extrapolate: "clamp",
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity, backgroundColor: s.accentColor }]}
              />
            );
          })}
        </View>

        {/* CTA button */}
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: activeSlide.accentColor }]}
          onPress={goNext}
          activeOpacity={0.85}
        >
          {isLast ? (
            <>
              <Text style={styles.ctaText}>{t("onboardingStart")}</Text>
              <Ionicons name="arrow-forward" size={20} color={BG} />
            </>
          ) : (
            <>
              <Text style={styles.ctaText}>{t("onboardingNext")}</Text>
              <Ionicons name="chevron-forward" size={20} color={BG} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SlideView({
  slide,
  index,
  scrollX,
  t,
  lang,
  setLang,
}: {
  slide: Slide;
  index: number;
  scrollX: Animated.Value;
  t: (key: keyof typeof translations.fr) => string;
  lang: Lang;
  setLang: (l: Lang) => void;
}) {
  const inputRange = [
    (index - 1) * SCREEN_W,
    index * SCREEN_W,
    (index + 1) * SCREEN_W,
  ];

  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.88, 1, 0.88],
    extrapolate: "clamp",
  });
  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.5, 1, 0.5],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.slide}>
      <Animated.View style={[styles.slideInner, { transform: [{ scale }], opacity }]}>
        {/* Glow blob */}
        <View style={[styles.glow, { backgroundColor: slide.glowColor + "18" }]} />

        {/* Icon circle */}
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: slide.iconColor + "18", borderColor: slide.iconColor + "40" },
          ]}
        >
          <Ionicons name={slide.icon as any} size={72} color={slide.iconColor} />
        </View>

        {/* Brand mark on first slide */}
        {index === 0 && (
          <View style={styles.brandMark}>
            <Text style={styles.brandNo}>No</Text>
            <Text style={[styles.brandStress, { color: LAVENDER }]}>Stress</Text>
          </View>
        )}

        {/* Togo flag mini on first slide */}
        {index === 0 && (
          <View style={styles.togoFlag}>
            <View style={[styles.flagBand, { backgroundColor: TOGO_GREEN }]} />
            <View style={[styles.flagBand, { backgroundColor: TOGO_YELLOW }]} />
            <View style={[styles.flagBand, { backgroundColor: TOGO_RED }]} />
          </View>
        )}

        {/* Slide text */}
        <Text style={styles.slideTitle}>{t(slide.titleKey)}</Text>
        <Text style={styles.slideSub}>{t(slide.subKey)}</Text>

        {/* Language selector on first slide */}
        {index === 0 && (
          <View style={styles.langRow}>
            <Text style={styles.langLabel}>{t("onboardingChooseLang")}</Text>
            <View style={styles.langBtns}>
              <TouchableOpacity
                style={[styles.langBtn, lang === "fr" && styles.langBtnActiveFR]}
                onPress={() => setLang("fr")}
              >
                <Text style={styles.langFlag}>🇫🇷</Text>
                <Text style={[styles.langText, lang === "fr" && styles.langTextActive]}>
                  Français
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langBtn, lang === "en" && styles.langBtnActiveEN]}
                onPress={() => setLang("en")}
              >
                <Text style={styles.langFlag}>🇬🇧</Text>
                <Text style={[styles.langText, lang === "en" && styles.langTextActive]}>
                  English
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Payment methods on second slide */}
        {index === 1 && (
          <View style={styles.pillsRow}>
            {["Flooz", "T-Money", "MIX by YAS"].map((p) => (
              <View key={p} style={[styles.featurePill, { borderColor: GOLD + "55" }]}>
                <Ionicons name="phone-portrait-outline" size={13} color={GOLD} />
                <Text style={[styles.featurePillText, { color: GOLD }]}>{p}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Togo cities grid on third slide */}
        {index === 2 && (
          <View style={styles.cityGrid}>
            {TOGO_CITIES_ONBOARD.map((c) => (
              <View key={c.name} style={[styles.cityChip, { borderColor: TOGO_GREEN + "60" }]}>
                <Ionicons name={c.icon} size={11} color={TOGO_GREEN} />
                <Text style={[styles.cityChipText, { color: "#F0EDF8" }]}>{c.name}</Text>
              </View>
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  flagStripe: {
    flexDirection: "row",
    height: 5,
  },
  flagSegment: {
    flex: 1,
  },
  skipBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 36,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#8B89A6",
  },
  slide: {
    width: SCREEN_W,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  slideInner: {
    width: "100%",
    alignItems: "center",
    gap: 16,
  },
  glow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  brandMark: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: -8,
  },
  brandNo: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#F0EDF8",
  },
  brandStress: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
  },
  togoFlag: {
    flexDirection: "row",
    height: 4,
    width: 80,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 8,
  },
  flagBand: {
    flex: 1,
  },
  slideTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#F0EDF8",
    textAlign: "center",
  },
  slideSub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#8B89A6",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  langRow: {
    width: "100%",
    marginTop: 8,
    gap: 12,
    alignItems: "center",
  },
  langLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#8B89A6",
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
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#2A2D45",
    backgroundColor: "#161829",
  },
  langBtnActiveFR: {
    borderColor: TOGO_GREEN,
    backgroundColor: TOGO_GREEN + "18",
  },
  langBtnActiveEN: {
    borderColor: LAVENDER,
    backgroundColor: LAVENDER + "18",
  },
  langFlag: {
    fontSize: 18,
  },
  langText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#8B89A6",
  },
  langTextActive: {
    color: "#F0EDF8",
    fontFamily: "Inter_600SemiBold",
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  featurePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#161829",
    borderWidth: 1,
  },
  featurePillText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  cityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  cityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#161829",
    borderWidth: 1,
  },
  cityChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  bottom: {
    paddingHorizontal: 24,
    gap: 20,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  ctaText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: BG,
  },
});
