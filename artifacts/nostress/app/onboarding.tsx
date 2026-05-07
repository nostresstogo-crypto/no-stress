import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { safeReplace } from "@/lib/navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { translations, Lang } from "@/constants/i18n";

const { width: SCREEN_W } = Dimensions.get("window");

const LAVENDER = "#9B8FE8";
const GOLD = "#D4AF37";
const CORAL = "#FF6B8A";
const CYAN = "#00D4FF";
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
    key: "welcome",
    icon: "sparkles",
    iconColor: LAVENDER,
    glowColor: LAVENDER,
    accentColor: LAVENDER,
    titleKey: "onboarding1Title",
    subKey: "onboarding1Sub",
  },
  {
    key: "concert",
    icon: "people",
    iconColor: CORAL,
    glowColor: CORAL,
    accentColor: CORAL,
    titleKey: "onboarding2Title",
    subKey: "onboarding2Sub",
  },
  /* Tickets onboarding slide hidden — ticketing disabled. */
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
    safeReplace("/(tabs)");
  }

  async function skip() {
    await finish();
  }

  const isLast = activeIdx === SLIDES.length - 1;
  const activeSlide = SLIDES[activeIdx];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.accentStripe}>
        <View style={[styles.accentSeg, { backgroundColor: LAVENDER }]} />
        <View style={[styles.accentSeg, { backgroundColor: CORAL }]} />
        <View style={[styles.accentSeg, { backgroundColor: CYAN }]} />
      </View>

      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={skip}>
          <Text style={styles.skipText}>{t("onboardingSkip")}</Text>
        </TouchableOpacity>
      )}

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
        <View style={[styles.glow, { backgroundColor: slide.glowColor + "18" }]} />

        {index === 1 ? (
          <View style={styles.concertImageWrap}>
            <Image
              source={require("@/assets/images/concert-crowd.png")}
              style={styles.concertImage}
              resizeMode="cover"
            />
            <View style={styles.concertOverlay} />
            <Ionicons name="musical-notes" size={48} color="#fff" style={styles.concertIcon} />
          </View>
        ) : (
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: slide.iconColor + "18", borderColor: slide.iconColor + "40" },
            ]}
          >
            <Ionicons name={slide.icon as any} size={72} color={slide.iconColor} />
          </View>
        )}

        {index === 0 && (
          <View style={styles.brandMark}>
            <Text style={styles.brandNo}>No</Text>
            <Text style={[styles.brandStress, { color: LAVENDER }]}>Stress</Text>
          </View>
        )}

        <Text style={styles.slideTitle}>{t(slide.titleKey)}</Text>
        <Text style={styles.slideSub}>{t(slide.subKey)}</Text>

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

        {index === 1 && (
          <View style={styles.vibeRow}>
            {[
              { label: "Concerts", icon: "mic" as const, color: CORAL },
              { label: "Festivals", icon: "bonfire" as const, color: GOLD },
              { label: lang === "fr" ? "Soirées" : "Parties", icon: "moon" as const, color: CYAN },
            ].map((v) => (
              <View key={v.label} style={[styles.vibePill, { borderColor: v.color + "55" }]}>
                <Ionicons name={v.icon} size={14} color={v.color} />
                <Text style={[styles.vibePillText, { color: v.color }]}>{v.label}</Text>
              </View>
            ))}
          </View>
        )}

        {index === 2 && (
          <View style={styles.featureList}>
            {[
              { icon: "flash" as const, label: lang === "fr" ? "Réservation instantanée" : "Instant booking", color: CYAN },
              { icon: "qr-code" as const, label: lang === "fr" ? "QR code sécurisé" : "Secure QR code", color: LAVENDER },
              { icon: "shield-checkmark" as const, label: lang === "fr" ? "Paiement sécurisé" : "Secure payment", color: CORAL },
            ].map((f) => (
              <View key={f.label} style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: f.color + "18" }]}>
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  accentStripe: {
    flexDirection: "row",
    height: 3,
  },
  accentSeg: {
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
  concertImageWrap: {
    width: 260,
    height: 180,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 8,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  concertImage: {
    width: "100%",
    height: "100%",
  },
  concertOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(14, 17, 32, 0.35)",
  },
  concertIcon: {
    position: "absolute",
    opacity: 0.9,
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
    borderColor: LAVENDER,
    backgroundColor: LAVENDER + "18",
  },
  langBtnActiveEN: {
    borderColor: CYAN,
    backgroundColor: CYAN + "18",
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
  vibeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  vibePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#161829",
    borderWidth: 1,
  },
  vibePillText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  featureList: {
    width: "100%",
    gap: 12,
    marginTop: 8,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#161829",
    borderWidth: 1,
    borderColor: "#2A2D45",
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
