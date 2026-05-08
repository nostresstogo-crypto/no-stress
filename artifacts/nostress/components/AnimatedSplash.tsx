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

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const BG_TOP = "#1A0F3D";
const BG_MID = "#0E0A26";
const BG_BOT = "#06030F";
const LAVENDER = "#B5A8F0";
const LAVENDER_DEEP = "#7A6BD8";
const GOLD = "#E5C46B";
const CORAL = "#F47A95";
const CYAN = "#5FD4F5";

function ExpandingRing({
  delay,
  color,
  size = 200,
  duration = 2600,
}: {
  delay: number;
  color: string;
  size?: number;
  duration?: number;
}) {
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.6,
            duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.55,
              duration: duration * 0.2,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: duration * 0.8,
              useNativeDriver: true,
            }),
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
        {
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          borderColor: color,
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
}

function FloatingDot({
  x,
  y,
  color,
  size,
  delay,
}: {
  x: number;
  y: number;
  color: string;
  size: number;
  delay: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fadeIn = Animated.timing(opacity, {
      toValue: 0.6,
      duration: 800,
      delay,
      useNativeDriver: true,
    });
    const drift = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -10,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 10,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    fadeIn.start();
    drift.start();
    return () => {
      fadeIn.stop();
      drift.stop();
    };
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }],
        shadowColor: color,
        shadowOpacity: 0.8,
        shadowRadius: size,
        shadowOffset: { width: 0, height: 0 },
      }}
    />
  );
}

export default function AnimatedSplash() {
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandY = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(brandOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(brandY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(dotsOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const rot = Animated.loop(
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 16000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    rot.start();

    const bounce = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0,
            duration: 500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
    const b1 = bounce(dot1, 1600);
    const b2 = bounce(dot2, 1750);
    const b3 = bounce(dot3, 1900);
    b1.start();
    b2.start();
    b3.start();

    return () => {
      rot.stop();
      b1.stop();
      b2.stop();
      b3.stop();
    };
  }, []);

  const rotateInterp = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const dotTranslate = (v: Animated.Value) =>
    v.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[BG_TOP, BG_MID, BG_BOT]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Aurora glows */}
      <View style={[styles.glow, styles.glowTopLeft]} />
      <View style={[styles.glow, styles.glowTopRight]} />
      <View style={[styles.glow, styles.glowBottom]} />

      {/* Floating particles */}
      <FloatingDot x={SCREEN_W * 0.15} y={SCREEN_H * 0.18} size={4} color={LAVENDER} delay={300} />
      <FloatingDot x={SCREEN_W * 0.85} y={SCREEN_H * 0.15} size={5} color={GOLD} delay={500} />
      <FloatingDot x={SCREEN_W * 0.78} y={SCREEN_H * 0.32} size={3} color={CORAL} delay={700} />
      <FloatingDot x={SCREEN_W * 0.18} y={SCREEN_H * 0.38} size={4} color={CYAN} delay={400} />
      <FloatingDot x={SCREEN_W * 0.88} y={SCREEN_H * 0.68} size={3} color={LAVENDER} delay={600} />
      <FloatingDot x={SCREEN_W * 0.12} y={SCREEN_H * 0.72} size={4} color={GOLD} delay={800} />

      {/* Center column */}
      <View style={styles.center}>
        {/* Logo with concentric rings */}
        <View style={styles.logoBlock}>
          <View style={styles.ringHost} pointerEvents="none">
            <ExpandingRing delay={0} color={LAVENDER + "AA"} size={180} />
            <ExpandingRing delay={900} color={GOLD + "88"} size={180} />
            <ExpandingRing delay={1800} color={CORAL + "77"} size={180} />
          </View>

          <Animated.View
            style={[
              styles.logoOuter,
              { opacity: logoOpacity, transform: [{ scale: logoScale }, { rotate: rotateInterp }] },
            ]}
          >
            <LinearGradient
              colors={[LAVENDER, LAVENDER_DEEP, "#5444B8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            >
              {/* Counter-rotate so the icon stays upright */}
              <Animated.View
                style={{
                  transform: [
                    {
                      rotate: logoRotate.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "-360deg"],
                      }),
                    },
                  ],
                }}
              >
                <Ionicons name="musical-notes" size={44} color="#FFFFFF" />
              </Animated.View>
            </LinearGradient>
          </Animated.View>

          <View style={styles.sparkleBadge} pointerEvents="none">
            <Ionicons name="sparkles" size={14} color="#1A0F3D" />
          </View>
        </View>

        {/* Brand */}
        <Animated.View
          style={[
            styles.brandRow,
            { opacity: brandOpacity, transform: [{ translateY: brandY }] },
          ]}
        >
          <Text style={styles.brandNo}>No</Text>
          <Text style={styles.brandStress}>Stress</Text>
          <View style={styles.brandDot} />
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={[styles.taglineRow, { opacity: taglineOpacity }]}>
          <View style={styles.taglineLine} />
          <Text style={styles.tagline}>L'AGENDA DE VOS SOIRÉES</Text>
          <View style={styles.taglineLine} />
        </Animated.View>
      </View>

      {/* Loader dots */}
      <Animated.View style={[styles.loader, { opacity: dotsOpacity }]}>
        <Animated.View
          style={[styles.loaderDot, { backgroundColor: LAVENDER, transform: [{ translateY: dotTranslate(dot1) }] }]}
        />
        <Animated.View
          style={[styles.loaderDot, { backgroundColor: GOLD, transform: [{ translateY: dotTranslate(dot2) }] }]}
        />
        <Animated.View
          style={[styles.loaderDot, { backgroundColor: CORAL, transform: [{ translateY: dotTranslate(dot3) }] }]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_BOT,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    borderRadius: 9999,
  },
  glowTopLeft: {
    width: 320,
    height: 320,
    top: -100,
    left: -120,
    backgroundColor: LAVENDER_DEEP + "33",
  },
  glowTopRight: {
    width: 280,
    height: 280,
    top: -80,
    right: -100,
    backgroundColor: GOLD + "1A",
  },
  glowBottom: {
    width: 360,
    height: 360,
    bottom: -140,
    left: -80,
    backgroundColor: CORAL + "1F",
  },
  center: {
    alignItems: "center",
    gap: 24,
  },
  logoBlock: {
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  ringHost: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    top: "50%",
    left: "50%",
    borderRadius: 9999,
    borderWidth: 1.5,
  },
  logoOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: LAVENDER,
    shadowOpacity: 0.7,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  logoGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
  },
  sparkleBadge: {
    position: "absolute",
    top: 26,
    right: 26,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: BG_MID,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  brandNo: {
    fontSize: 44,
    fontFamily: "Inter_700Bold",
    color: "#F4F1FA",
    letterSpacing: -1.2,
  },
  brandStress: {
    fontSize: 44,
    fontFamily: "Inter_700Bold",
    color: LAVENDER,
    letterSpacing: -1.2,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GOLD,
    marginLeft: 5,
    marginBottom: 6,
  },
  taglineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tagline: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#A7A2C8",
    letterSpacing: 3,
  },
  taglineLine: {
    width: 22,
    height: 1,
    backgroundColor: GOLD + "88",
  },
  loader: {
    position: "absolute",
    bottom: 80,
    flexDirection: "row",
    gap: 10,
  },
  loaderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
