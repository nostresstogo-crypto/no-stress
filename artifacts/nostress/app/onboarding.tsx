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

import { C } from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { translations, Lang } from "@/constants/i18n";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

type Slide = {
  key: string;
  icon: string;
  iconColor: string;
  glowColor: string;
  titleKey: keyof typeof translations.fr;
  subKey: keyof typeof translations.fr;
};

const SLIDES: Slide[] = [
  {
    key: "welcome",
    icon: "globe-outline",
    iconColor: C.lavender,
    glowColor: C.lavender,
    titleKey: "onboarding1Title",
    subKey: "onboarding1Sub",
  },
  {
    key: "tickets",
    icon: "ticket-outline",
    iconColor: C.gold,
    glowColor: C.gold,
    titleKey: "onboarding2Title",
    subKey: "onboarding2Sub",
  },
  {
    key: "cities",
    icon: "location-outline",
    iconColor: "#4CAF82",
    glowColor: "#4CAF82",
    titleKey: "onboarding3Title",
    subKey: "onboarding3Sub",
  },
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

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
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
          {SLIDES.map((_, i) => {
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
                style={[styles.dot, { width: dotWidth, opacity }]}
              />
            );
          })}
        </View>

        {/* CTA button */}
        <TouchableOpacity
          style={[styles.ctaBtn, isLast && styles.ctaBtnLast]}
          onPress={goNext}
          activeOpacity={0.85}
        >
          {isLast ? (
            <>
              <Text style={styles.ctaText}>{t("onboardingStart")}</Text>
              <Ionicons name="arrow-forward" size={20} color={C.bg} />
            </>
          ) : (
            <>
              <Text style={styles.ctaText}>{t("onboardingNext")}</Text>
              <Ionicons name="chevron-forward" size={20} color={C.bg} />
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
        <View
          style={[
            styles.glow,
            { backgroundColor: slide.glowColor + "18" },
          ]}
        />

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
            <Text style={styles.brandStress}>Stress</Text>
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
                style={[styles.langBtn, lang === "fr" && styles.langBtnActive]}
                onPress={() => setLang("fr")}
              >
                <Text style={styles.langFlag}>🇫🇷</Text>
                <Text style={[styles.langText, lang === "fr" && styles.langTextActive]}>
                  Français
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langBtn, lang === "en" && styles.langBtnActive]}
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

        {/* Feature pills on second slide */}
        {index === 1 && (
          <View style={styles.pillsRow}>
            {["Flooz", "T-Money", "MIX by YAS"].map((p) => (
              <View key={p} style={styles.featurePill}>
                <Ionicons name="phone-portrait-outline" size={13} color={C.gold} />
                <Text style={styles.featurePillText}>{p}</Text>
              </View>
            ))}
          </View>
        )}

        {/* City grid on third slide */}
        {index === 2 && (
          <View style={styles.cityGrid}>
            {["Abidjan", "Dakar", "Lagos", "Lomé", "Accra", "Nairobi"].map((c) => (
              <View key={c} style={styles.cityChip}>
                <Ionicons name="location" size={11} color="#4CAF82" />
                <Text style={styles.cityChipText}>{c}</Text>
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
    backgroundColor: C.bg,
  },
  skipBtn: {
    position: "absolute",
    top: Platform.OS === "web" ? 20 : 56,
    right: 24,
    zIndex: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  skipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
  },
  slide: {
    width: SCREEN_W,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  slideInner: {
    alignItems: "center",
    gap: 20,
    width: "100%",
  },
  glow: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -60,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  brandMark: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 0,
    marginTop: -8,
  },
  brandNo: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  brandStress: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: C.lavender,
  },
  slideTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: C.text,
    textAlign: "center",
    lineHeight: 34,
  },
  slideSub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 24,
  },
  langRow: {
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    width: "100%",
  },
  langLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
  },
  langBtns: {
    flexDirection: "row",
    gap: 12,
  },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  langBtnActive: {
    borderColor: C.lavender,
    backgroundColor: C.lavender + "18",
  },
  langFlag: {
    fontSize: 20,
  },
  langText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
  },
  langTextActive: {
    color: C.lavender,
    fontFamily: "Inter_600SemiBold",
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginTop: 4,
  },
  featurePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.gold + "15",
    borderWidth: 1,
    borderColor: C.gold + "44",
  },
  featurePillText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: C.gold,
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
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#4CAF8215",
    borderWidth: 1,
    borderColor: "#4CAF8240",
  },
  cityChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#4CAF82",
  },
  bottom: {
    paddingHorizontal: 24,
    gap: 20,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: C.lavender,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.lavender,
    borderRadius: 16,
    paddingVertical: 16,
    width: "100%",
  },
  ctaBtnLast: {
    backgroundColor: C.gold,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: C.bg,
  },
});
