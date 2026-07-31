/**
 * AIAssistantLogo
 *
 * Logo vectoriel premium de l'assistant IA.
 * SVG pur (react-native-svg) + animation Animated RN.
 *
 * Props
 * ─────
 * size   : number   — taille du carré conteneur (défaut 36)
 * color  : string   — couleur principale (or/brick orange de la plateforme)
 * bg     : string   — couleur de fond du cercle central (transparente par défaut)
 */

import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";
import Svg, {
  Circle,
  Path,
  Defs,
  LinearGradient,
  Stop,
  G,
} from "react-native-svg";

// Animated SVG Circle pour animer le halo via Animated.Value
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── Props ────────────────────────────────────────────────────────────────────
export interface AIAssistantLogoProps {
  size?: number;
  color?: string;
  bgColor?: string;
  /** Désactiver l'animation (perf) */
  noAnimation?: boolean;
}

export function AIAssistantLogo({
  size = 36,
  color = "#F59E0B",
  bgColor = "transparent",
  noAnimation = false,
}: AIAssistantLogoProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const haloOpacity = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    if (noAnimation) return;

    // Pulsation douce du halo
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );

    // Légère rotation de l'anneau extérieur
    const rotateLoop = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 12000,
        useNativeDriver: true,
      }),
    );

    // Clignotement doux du halo
    const haloLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(haloOpacity, {
          toValue: 0.45,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(haloOpacity, {
          toValue: 0.12,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    );

    pulseLoop.start();
    rotateLoop.start();
    haloLoop.start();

    return () => {
      pulseLoop.stop();
      rotateLoop.stop();
      haloLoop.stop();
    };
  }, [noAnimation]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  // Proportions basées sur `size`
  const outerRingR  = r * 0.88;     // anneau dégradé
  const midCircleR  = r * 0.64;     // cercle de fond central
  const nodeR       = r * 0.10;     // taille des nœuds
  const centerR     = r * 0.12;     // point central
  const strokeW     = Math.max(1, size * 0.04);

  // Positions des 3 nœuds (triangle)
  const nodeTop   = { x: cx,           y: cy - r * 0.38 };
  const nodeLeft  = { x: cx - r * 0.34, y: cy + r * 0.24 };
  const nodeRight = { x: cx + r * 0.34, y: cy + r * 0.24 };

  // Nœuds "satellites" sur l'anneau extérieur (décor)
  const sat1 = { x: cx + outerRingR * 0.71, y: cy - outerRingR * 0.71 };
  const sat2 = { x: cx - outerRingR * 0.71, y: cy + outerRingR * 0.71 };

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        transform: [{ scale }],
      }}
    >
      {/* Halo lumineux externe animé */}
      <Animated.View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1,
          borderColor: color,
          opacity: haloOpacity,
          transform: [{ scale: 1.15 }],
        }}
      />

      {/* SVG logo */}
      <Animated.View
        style={{
          width: size,
          height: size,
          transform: [{ rotate: spin }],
          position: "absolute",
        }}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={color} stopOpacity="0.9" />
              <Stop offset="50%" stopColor={color} stopOpacity="0.25" />
              <Stop offset="100%" stopColor={color} stopOpacity="0.7" />
            </LinearGradient>
          </Defs>
          {/* Anneau extérieur dégradé */}
          <Circle
            cx={cx}
            cy={cy}
            r={outerRingR}
            stroke="url(#ringGrad)"
            strokeWidth={strokeW}
            fill="none"
            strokeDasharray={`${outerRingR * 1.4} ${outerRingR * 0.5}`}
            strokeLinecap="round"
          />
          {/* Petits marqueurs satellites */}
          <Circle cx={sat1.x} cy={sat1.y} r={size * 0.025} fill={color} opacity={0.6} />
          <Circle cx={sat2.x} cy={sat2.y} r={size * 0.025} fill={color} opacity={0.4} />
        </Svg>
      </Animated.View>

      {/* Contenu central statique */}
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: "absolute" }}
      >
        <Defs>
          <LinearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.06" />
          </LinearGradient>
        </Defs>

        {/* Cercle de fond central */}
        <Circle
          cx={cx}
          cy={cy}
          r={midCircleR}
          fill={bgColor !== "transparent" ? bgColor : "url(#bgGrad)"}
        />

        {/* Contour du cercle central */}
        <Circle
          cx={cx}
          cy={cy}
          r={midCircleR}
          stroke={color}
          strokeWidth={strokeW * 0.6}
          fill="none"
          opacity={0.3}
        />

        {/* ── Réseau neuronal : lignes de connexion ── */}
        <G opacity={0.45} stroke={color} strokeWidth={strokeW * 0.55} strokeLinecap="round">
          {/* top → left */}
          <Path d={`M${nodeTop.x} ${nodeTop.y} L${nodeLeft.x} ${nodeLeft.y}`} />
          {/* top → right */}
          <Path d={`M${nodeTop.x} ${nodeTop.y} L${nodeRight.x} ${nodeRight.y}`} />
          {/* left → right */}
          <Path d={`M${nodeLeft.x} ${nodeLeft.y} L${nodeRight.x} ${nodeRight.y}`} />
          {/* top → center */}
          <Path d={`M${nodeTop.x} ${nodeTop.y} L${cx} ${cy}`} />
          {/* left → center */}
          <Path d={`M${nodeLeft.x} ${nodeLeft.y} L${cx} ${cy}`} />
          {/* right → center */}
          <Path d={`M${nodeRight.x} ${nodeRight.y} L${cx} ${cy}`} />
        </G>

        {/* ── Nœuds du réseau neuronal ── */}
        {/* Nœud haut */}
        <Circle cx={nodeTop.x}   cy={nodeTop.y}   r={nodeR}   fill={color} />
        {/* Nœud bas gauche */}
        <Circle cx={nodeLeft.x}  cy={nodeLeft.y}  r={nodeR}   fill={color} opacity={0.85} />
        {/* Nœud bas droite */}
        <Circle cx={nodeRight.x} cy={nodeRight.y} r={nodeR}   fill={color} opacity={0.85} />
        {/* Nœud central */}
        <Circle cx={cx}          cy={cy}           r={centerR} fill={color} />
        {/* Reflet sur le nœud central */}
        <Circle cx={cx - centerR * 0.3} cy={cy - centerR * 0.3} r={centerR * 0.4} fill="#fff" opacity={0.4} />
      </Svg>
    </Animated.View>
  );
}
