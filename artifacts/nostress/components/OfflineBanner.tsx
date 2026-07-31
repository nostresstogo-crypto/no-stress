/**
 * OfflineBanner — bannière réseau discrète, multi-messages.
 *
 * Messages :
 *   offline      → rouge   "Hors ligne — dernières données disponibles"
 *   slow_auto    → ambre   "Connexion lente — économie de données activée"
 *   reconnected  → vert    "Connexion rétablie"
 *   null         → invisible
 *
 * La bannière se masque automatiquement quand l'état revient normal.
 * Elle disparaît après 3,5 s pour "reconnected".
 */

import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNetwork, type NetworkMessage } from "@/context/NetworkContext";

// ── Config par type de message ───────────────────────────────────────────────

type MessageConfig = {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  textEn: string;
  color: string;
};

const MESSAGE_CONFIG: Record<NonNullable<NetworkMessage>, MessageConfig> = {
  offline: {
    icon: "cloud-offline-outline",
    text: "Hors ligne — dernières données disponibles",
    textEn: "Offline — last available data shown",
    color: "#C0392B",
  },
  slow_auto: {
    icon: "cellular-outline",
    text: "Connexion lente — économie de données activée",
    textEn: "Slow connection — data saver enabled",
    color: "#B7730A",
  },
  reconnected: {
    icon: "checkmark-circle-outline",
    text: "Connexion rétablie",
    textEn: "Connection restored",
    color: "#1E8449",
  },
};

// ── Composant ────────────────────────────────────────────────────────────────

interface OfflineBannerProps {
  lang?: "fr" | "en";
}

export function OfflineBanner({ lang = "fr" }: OfflineBannerProps) {
  const { networkMessage } = useNetwork();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-80)).current;
  const [visible, setVisible] = useState(false);
  const [currentMsg, setCurrentMsg] = useState<NetworkMessage>(null);

  useEffect(() => {
    if (networkMessage !== null) {
      // Nouveau message → l'afficher
      setCurrentMsg(networkMessage);
      setVisible(true);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start();
    } else {
      // Pas de message → masquer
      Animated.timing(translateY, {
        toValue: -80,
        duration: 280,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setVisible(false);
          setCurrentMsg(null);
        }
      });
    }
  }, [networkMessage, translateY]);

  if (!visible || !currentMsg) return null;

  const cfg = MESSAGE_CONFIG[currentMsg];
  const text = lang === "fr" ? cfg.text : cfg.textEn;

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          paddingTop: insets.top + 6,
          backgroundColor: cfg.color,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.inner}>
        <Ionicons name={cfg.icon} size={15} color="#fff" />
        <Text style={styles.text} numberOfLines={1}>{text}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingBottom: 9,
    paddingHorizontal: 16,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  text: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
    flexShrink: 1,
  },
});
