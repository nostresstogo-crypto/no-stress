/**
 * ResilientImage — composant d'image centralisé et robuste.
 *
 * Fonctionnalités :
 *   - Chargement progressif avec placeholder blurhash
 *   - Skeleton animé pendant le chargement
 *   - Retry automatique limité (max 2 tentatives, backoff 1 s → 3 s)
 *   - Placeholder premium thématisé en cas d'échec définitif
 *   - Normalisation des URLs via imageUrl.ts
 *   - Cache disque expo-image
 *   - Accessible (accessibilityLabel)
 *   - Compatible Jour / Nuit
 *   - Jamais de grand espace blanc
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
  type ImageStyle,
} from "react-native";
import { Image, type ImageContentFit } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "@/context/AppContext";
import { normalizeImageUrl } from "@/lib/imageUrl";

// ── Constantes ────────────────────────────────────────────────────────────────
const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [1000, 3000]; // backoff progressif
const __DEV__ = process.env.NODE_ENV !== "production";

// ── Types ────────────────────────────────────────────────────────────────────
export type ImagePlaceholderKind = "event" | "venue" | "avatar" | "gallery" | "generic";

interface ResilientImageProps {
  /** URL brute (absolue, relative, locale ou null) */
  uri: string | null | undefined;
  /** Blurhash à afficher pendant le chargement */
  blurhash?: string | null;
  /** Style de la vue conteneur */
  style?: StyleProp<ViewStyle>;
  /** Style appliqué directement à l'image */
  imageStyle?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  /** Type de placeholder selon le contexte */
  placeholderKind?: ImagePlaceholderKind;
  /** Label accessibilité */
  accessibilityLabel?: string;
  /** Désactive le skeleton de chargement */
  noSkeleton?: boolean;
  /** Désactive le retry */
  noRetry?: boolean;
  /** Contexte pour les logs DEV */
  debugContext?: string;
  /** Taille de l'icône de fallback (px) */
  fallbackIconSize?: number;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const C = useColors();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] });

  return (
    <Animated.View
      style={[s.skeleton, { backgroundColor: C.card2 }, { opacity }, style]}
    />
  );
}

// ── Icône selon le contexte ───────────────────────────────────────────────────
function placeholderIcon(kind: ImagePlaceholderKind): keyof typeof Ionicons.glyphMap {
  switch (kind) {
    case "event":   return "calendar-outline";
    case "venue":   return "business-outline";
    case "avatar":  return "person-circle-outline";
    case "gallery": return "images-outline";
    default:        return "image-outline";
  }
}

// ── Composant principal ───────────────────────────────────────────────────────
export function ResilientImage({
  uri,
  blurhash,
  style,
  imageStyle,
  contentFit = "cover",
  placeholderKind = "generic",
  accessibilityLabel,
  noSkeleton = false,
  noRetry = false,
  debugContext,
  fallbackIconSize = 28,
}: ResilientImageProps) {
  const C = useColors();

  // Normaliser l'URL au premier rendu et quand l'URI change
  const normalized = React.useMemo(
    () => normalizeImageUrl(uri),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uri],
  );

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    normalized ? "loading" : "error",
  );
  const [retryKey, setRetryKey] = useState(0);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Réinitialiser si l'URI change
  useEffect(() => {
    if (normalized) {
      setStatus("loading");
      retryCount.current = 0;
    } else {
      setStatus("error");
    }
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [normalized]);

  const handleLoad = useCallback(() => {
    setStatus("success");
  }, []);

  const handleError = useCallback(
    (err?: { error?: string }) => {
      if (__DEV__) {
        console.warn(
          `[ResilientImage]${debugContext ? ` [${debugContext}]` : ""} erreur URL=${normalized?.slice(0, 80)} err=${err?.error ?? "inconnu"} retry=${retryCount.current}/${MAX_RETRIES}`,
        );
      }

      if (!noRetry && retryCount.current < MAX_RETRIES) {
        const delay = RETRY_DELAYS_MS[retryCount.current] ?? 3000;
        retryCount.current += 1;
        retryTimer.current = setTimeout(() => {
          setRetryKey((k) => k + 1);
        }, delay);
      } else {
        setStatus("error");
      }
    },
    [normalized, noRetry, debugContext],
  );

  // ── Rendu sans URL valide ─────────────────────────────────────────────────
  if (!normalized) {
    return (
      <View
        style={[s.container, { backgroundColor: C.card2 }, style]}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="image"
      >
        <Ionicons
          name={placeholderIcon(placeholderKind)}
          size={fallbackIconSize}
          color={C.textMuted}
        />
      </View>
    );
  }

  // ── Rendu erreur définitive ───────────────────────────────────────────────
  if (status === "error") {
    return (
      <View
        style={[s.container, { backgroundColor: C.card2 }, style]}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="image"
      >
        <Ionicons
          name={placeholderIcon(placeholderKind)}
          size={fallbackIconSize}
          color={C.textMuted}
        />
      </View>
    );
  }

  // ── Rendu normal (loading → success) ─────────────────────────────────────
  return (
    <View
      style={[s.container, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
    >
      {/* Skeleton affiché jusqu'au chargement de l'image */}
      {status === "loading" && !noSkeleton && (
        <Skeleton style={StyleSheet.absoluteFill} />
      )}

      <Image
        key={`img-${retryKey}`}
        source={{ uri: normalized }}
        style={[StyleSheet.absoluteFill, imageStyle]}
        contentFit={contentFit}
        cachePolicy="disk"
        transition={status === "success" ? 0 : 200}
        placeholder={
          status === "loading" && blurhash
            ? { blurhash }
            : undefined
        }
        onLoad={handleLoad}
        onError={handleError}
        accessible={false} // parent view handles accessibility
      />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  skeleton: {
    ...StyleSheet.absoluteFillObject,
  },
});
