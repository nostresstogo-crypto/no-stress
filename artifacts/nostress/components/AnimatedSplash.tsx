import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "@/context/AppContext";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

/* ── Light mode palette ──────────────────────────────────────── */
const L = {
  bgTop:       "#EAE5F8",
  bgMid:       "#F0EBF9",
  bgBot:       "#F7F5FD",
  logo1:       "#6650D8",
  logo2:       "#4A3BB8",
  logo3:       "#3A2CA0",
  ringA:       "#6650D8",
  ringB:       "#9A7010",
  glowPrim:    "#6650D8",
  glowGold:    "#C99820",
  textNo:      "#12102A",
  textStress:  "#6650D8",
  tagline:     "#7B78A0",
  taglineLine: "#9A701066",
  dotA:        "#6650D8",
  dotB:        "#9A7010",
  dotC:        "#4A3BB8",
  sparkle:     "#9A7010",
  sparkleInner:"#FFFFFF",
};

/* ── Dark mode palette ───────────────────────────────────────── */
const D = {
  bgTop:       "#12163A",
  bgMid:       "#0C0F22",
  bgBot:       "#060812",
  logo1:       "#A898EC",
  logo2:       "#7060C8",
  logo3:       "#5444B8",
  ringA:       "#A898EC",
  ringB:       "#DEB85C",
  glowPrim:    "#6050C0",
  glowGold:    "#DEB85C",
  textNo:      "#EDE9F8",
  textStress:  "#A898EC",
  tagline:     "#9490B8",
  taglineLine: "#DEB85C66",
  dotA:        "#A898EC",
  dotB:        "#DEB85C",
  dotC:        "#E06090",
  sparkle:     "#DEB85C",
  sparkleInner:"#0C0F22",
};

/* ── Expanding ring ──────────────────────────────────────────── */
function ExpandingRing({
  delay, color, size = 200, duration = 2800,
}: { delay: number; color: string; size?: number; duration?: number }) {
  const scale   = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.65, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.45, duration: duration * 0.18, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: duration * 0.82, useNativeDriver: true }),
          ]),
        ]),
        Animated.timing(scale, { toValue: 0.4, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        { width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, borderColor: color, transform: [{ scale }], opacity },
      ]}
    />
  );
}

/* ── Floating dot ────────────────────────────────────────────── */
function FloatingDot({ x, y, color, size, delay }: { x: number; y: number; color: string; size: number; delay: number }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 0.5, duration: 900, delay, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, { toValue: -10, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(translateY, { toValue:  10, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute", left: x, top: y, width: size, height: size,
        borderRadius: size / 2, backgroundColor: color,
        opacity, transform: [{ translateY }],
        shadowColor: color, shadowOpacity: 0.6, shadowRadius: size * 0.9, shadowOffset: { width: 0, height: 0 },
      }}
    />
  );
}

/* ── Main component ──────────────────────────────────────────── */
export default function AnimatedSplash() {
  const { isDark } = useApp();
  const P = isDark ? D : L;

  const logoScale   = useRef(new Animated.Value(0.55)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate  = useRef(new Animated.Value(0)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandY       = useRef(new Animated.Value(18)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const dotsOpacity    = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale,   { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 550, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(brandOpacity, { toValue: 1, duration: 480, useNativeDriver: true }),
        Animated.timing(brandY,       { toValue: 0, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(dotsOpacity,    { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.timing(logoRotate, { toValue: 1, duration: 18000, easing: Easing.linear, useNativeDriver: true }),
    ).start();

    const bounce = (v: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 520, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 520, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
    bounce(dot1, 1700).start();
    bounce(dot2, 1850).start();
    bounce(dot3, 2000).start();
  }, []);

  const rotateInterp = logoRotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const dotTranslate = (v: Animated.Value) => v.interpolate({ inputRange: [0, 1], outputRange: [0, -9] });

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[P.bgTop, P.bgMid, P.bgBot]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient glows */}
      <View style={[styles.glow, styles.glowTopLeft,  { backgroundColor: P.glowPrim + (isDark ? "2A" : "1A") }]} />
      <View style={[styles.glow, styles.glowTopRight, { backgroundColor: P.glowGold + (isDark ? "18" : "12") }]} />
      <View style={[styles.glow, styles.glowBottom,   { backgroundColor: P.glowPrim + (isDark ? "20" : "14") }]} />

      {/* Floating particles */}
      <FloatingDot x={SCREEN_W * 0.14} y={SCREEN_H * 0.17} size={4} color={P.dotA} delay={300} />
      <FloatingDot x={SCREEN_W * 0.84} y={SCREEN_H * 0.14} size={5} color={P.dotB} delay={500} />
      <FloatingDot x={SCREEN_W * 0.77} y={SCREEN_H * 0.31} size={3} color={P.dotC} delay={700} />
      <FloatingDot x={SCREEN_W * 0.19} y={SCREEN_H * 0.37} size={4} color={P.dotA} delay={420} />
      <FloatingDot x={SCREEN_W * 0.87} y={SCREEN_H * 0.67} size={3} color={P.dotB} delay={620} />
      <FloatingDot x={SCREEN_W * 0.11} y={SCREEN_H * 0.71} size={4} color={P.dotC} delay={820} />

      {/* Center */}
      <View style={styles.center}>
        {/* Logo with expanding rings */}
        <View style={styles.logoBlock}>
          <View style={styles.ringHost} pointerEvents="none">
            <ExpandingRing delay={0}    color={P.ringA + "90"} size={190} />
            <ExpandingRing delay={940}  color={P.ringB + "70"} size={190} />
            <ExpandingRing delay={1880} color={P.ringA + "55"} size={190} />
          </View>

          <Animated.View
            style={[
              styles.logoOuter,
              { opacity: logoOpacity, transform: [{ scale: logoScale }, { rotate: rotateInterp }] },
              isDark
                ? { shadowColor: P.ringA, shadowOpacity: 0.65, shadowRadius: 26, shadowOffset: { width: 0, height: 6 }, elevation: 12 }
                : { shadowColor: P.logo1, shadowOpacity: 0.30, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
            ]}
          >
            <LinearGradient
              colors={[P.logo1, P.logo2, P.logo3]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            >
              <Animated.View
                style={{
                  transform: [{
                    rotate: logoRotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-360deg"] }),
                  }],
                }}
              >
                <Ionicons name="musical-notes" size={44} color="#FFFFFF" />
              </Animated.View>
            </LinearGradient>
          </Animated.View>

          <View style={[styles.sparkleBadge, { backgroundColor: P.sparkle, borderColor: isDark ? P.bgMid : P.bgBot }]}>
            <Ionicons name="sparkles" size={13} color={P.sparkleInner} />
          </View>
        </View>

        {/* Brand name */}
        <Animated.View style={[styles.brandRow, { opacity: brandOpacity, transform: [{ translateY: brandY }] }]}>
          <Text style={[styles.brandNo, { color: P.textNo }]}>No</Text>
          <Text style={[styles.brandStress, { color: P.textStress }]}>Stress</Text>
          <View style={[styles.brandDot, { backgroundColor: P.dotB }]} />
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={[styles.taglineRow, { opacity: taglineOpacity }]}>
          <View style={[styles.taglineLine, { backgroundColor: P.taglineLine }]} />
          <Text style={[styles.tagline, { color: P.tagline }]}>L'AGENDA DE VOS SOIRÉES</Text>
          <View style={[styles.taglineLine, { backgroundColor: P.taglineLine }]} />
        </Animated.View>
      </View>

      {/* Loader dots */}
      <Animated.View style={[styles.loader, { opacity: dotsOpacity }]}>
        <Animated.View style={[styles.loaderDot, { backgroundColor: P.dotA, transform: [{ translateY: dotTranslate(dot1) }] }]} />
        <Animated.View style={[styles.loaderDot, { backgroundColor: P.dotB, transform: [{ translateY: dotTranslate(dot2) }] }]} />
        <Animated.View style={[styles.loaderDot, { backgroundColor: P.dotC, transform: [{ translateY: dotTranslate(dot3) }] }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },

  glow: { position: "absolute", borderRadius: 9999 },
  glowTopLeft:  { width: 320, height: 320, top: -110, left: -130 },
  glowTopRight: { width: 260, height: 260, top:  -80, right: -100 },
  glowBottom:   { width: 380, height: 380, bottom: -150, left: -90 },

  center: { alignItems: "center", gap: 26 },

  logoBlock: { width: 190, height: 190, alignItems: "center", justifyContent: "center" },
  ringHost:  { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", top: "50%", left: "50%", borderRadius: 9999, borderWidth: 1.5 },

  logoOuter: {
    width: 112, height: 112, borderRadius: 56,
    alignItems: "center", justifyContent: "center",
  },
  logoGradient: {
    width: "100%", height: "100%", borderRadius: 56,
    alignItems: "center", justifyContent: "center",
  },

  sparkleBadge: {
    position: "absolute", top: 28, right: 28,
    width: 26, height: 26, borderRadius: 13,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2.5,
  },

  brandRow: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  brandNo:     { fontSize: 44, fontFamily: "Inter_700Bold", letterSpacing: -1.2 },
  brandStress: { fontSize: 44, fontFamily: "Inter_700Bold", letterSpacing: -1.2 },
  brandDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 5, marginBottom: 6 },

  taglineRow:  { flexDirection: "row", alignItems: "center", gap: 12 },
  tagline:     { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 3 },
  taglineLine: { width: 22, height: 1 },

  loader: { position: "absolute", bottom: 82, flexDirection: "row", gap: 10 },
  loaderDot: { width: 10, height: 10, borderRadius: 5 },
});
