/**
 * PremiumMediaGallery
 *
 * Galerie swipeable horizontale pour les photos d'un lieu ou d'un événement.
 *
 * Props
 * ─────
 * images        : string[]    — URLs des images (peut être vide)
 * blurhash      : string|null — blurhash de la première image (placeholder)
 * height        : number      — hauteur de la galerie (défaut 300)
 * onBack        : () => void  — bouton retour en haut à gauche
 * isFavorite    : boolean     — état cœur
 * onToggleFav   : () => void  — toggle favori (non rendu si absent)
 * onShare       : () => void  — partage (non rendu si absent)
 * showFavorite  : boolean     — afficher le bouton favori
 * isVerified    : boolean     — badge vérifié
 * lowData       : boolean     — mode économique (charge 1 image seulement)
 * lang          : "fr"|"en"
 */

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PremiumMediaGalleryProps {
  images: string[];
  blurhash?: string | null;
  height?: number;
  onBack: () => void;
  isFavorite?: boolean;
  onToggleFav?: () => void;
  onShare?: () => void;
  showFavorite?: boolean;
  isVerified?: boolean;
  lowData?: boolean;
  lang?: "fr" | "en" | string;
  /** Extra content rendered over the gradient at the bottom of the gallery */
  bottomOverlay?: React.ReactNode;
}

const { width: SCREEN_W } = Dimensions.get("window");
const MAX_DOTS = 7; // beyond this, show counter only

// ─── Main component ───────────────────────────────────────────────────────────
export function PremiumMediaGallery({
  images,
  blurhash,
  height = 300,
  onBack,
  isFavorite = false,
  onToggleFav,
  onShare,
  showFavorite = false,
  isVerified = false,
  lowData = false,
  lang = "fr",
  bottomOverlay,
}: PremiumMediaGalleryProps) {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomUri, setZoomUri] = useState<string | null>(null);
  const flatRef = useRef<FlatList>(null);

  const topOffset = Platform.OS === "web" ? 67 : insets.top;

  // In low-data mode, show only first image
  const displayImages = useMemo(
    () => (lowData ? images.slice(0, 1) : images),
    [images, lowData],
  );

  const hasImages = displayImages.length > 0;
  const showDots = displayImages.length > 1 && displayImages.length <= MAX_DOTS;
  const showCounter = displayImages.length > 1;

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
      if (idx !== activeIndex) setActiveIndex(idx);
    },
    [activeIndex],
  );

  return (
    <View style={{ width: SCREEN_W, height }}>
      {/* ── Gallery list ── */}
      {hasImages ? (
        <FlatList
          ref={flatRef}
          data={displayImages}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          onScroll={onScroll}
          scrollEventThrottle={16}
          removeClippedSubviews
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={() => setZoomUri(item)}
              accessibilityRole="imagebutton"
              accessibilityLabel={
                lang === "fr"
                  ? `Photo ${index + 1} sur ${displayImages.length}`
                  : `Photo ${index + 1} of ${displayImages.length}`
              }
            >
              <Image
                source={{ uri: item }}
                style={{ width: SCREEN_W, height }}
                contentFit="cover"
                transition={200}
                placeholder={index === 0 && blurhash ? { blurhash } : undefined}
                priority={index === 0 ? "high" : "low"}
                cachePolicy="memory-disk"
              />
            </TouchableOpacity>
          )}
        />
      ) : (
        /* Placeholder */
        <View style={[gal.placeholder, { height }]}>
          <Ionicons name="business" size={72} color="#9ca3af" />
        </View>
      )}

      {/* ── Bottom gradient overlay ── */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.55)"]}
        locations={[0.5, 1.0]}
        style={[gal.gradient, { height: height * 0.5 }]}
        pointerEvents="none"
      />

      {/* ── Top actions (back, fav, share) ── */}
      <View style={[gal.topRow, { top: topOffset + 10 }]}>
        {/* Back */}
        <TouchableOpacity
          style={gal.iconBtn}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={lang === "fr" ? "Retour" : "Back"}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        {/* Right actions */}
        <View style={gal.rightActions}>
          {showFavorite && onToggleFav && (
            <TouchableOpacity
              style={gal.iconBtn}
              onPress={onToggleFav}
              accessibilityRole="button"
              accessibilityLabel={
                isFavorite
                  ? (lang === "fr" ? "Retirer des favoris" : "Remove from favorites")
                  : (lang === "fr" ? "Ajouter aux favoris" : "Add to favorites")
              }
              hitSlop={8}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={22}
                color={isFavorite ? "#E05C5C" : "#fff"}
              />
            </TouchableOpacity>
          )}
          {onShare && (
            <TouchableOpacity
              style={gal.iconBtn}
              onPress={onShare}
              accessibilityRole="button"
              accessibilityLabel={lang === "fr" ? "Partager" : "Share"}
              hitSlop={8}
            >
              <Ionicons name="share-outline" size={22} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Counter (top right) ── */}
      {showCounter && !showDots && (
        <View style={gal.counter}>
          <Text style={gal.counterText}>
            {activeIndex + 1}/{displayImages.length}
          </Text>
        </View>
      )}

      {/* ── Dots ── */}
      {showDots && (
        <View style={gal.dotsRow}>
          {displayImages.map((_, i) => (
            <View
              key={i}
              style={[
                gal.dot,
                i === activeIndex ? gal.dotActive : gal.dotInactive,
              ]}
            />
          ))}
        </View>
      )}

      {/* ── Verified badge ── */}
      {isVerified && (
        <View style={gal.verifiedBadge}>
          <Ionicons name="checkmark-circle" size={13} color="#F59E0B" />
          <Text style={gal.verifiedText}>
            {lang === "fr" ? "Vérifié" : "Verified"}
          </Text>
        </View>
      )}

      {/* ── Bottom overlay slot ── */}
      {bottomOverlay && (
        <View style={gal.bottomSlot}>{bottomOverlay}</View>
      )}

      {/* ── Fullscreen zoom modal ── */}
      <Modal
        visible={!!zoomUri}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomUri(null)}
        statusBarTranslucent
      >
        <Pressable
          style={gal.zoomBackdrop}
          onPress={() => setZoomUri(null)}
        >
          {zoomUri ? (
            <Image
              source={{ uri: zoomUri }}
              style={gal.zoomImage}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          ) : null}
          <TouchableOpacity
            style={[gal.zoomClose, { top: Math.max(topOffset, 16) }]}
            onPress={() => setZoomUri(null)}
            accessibilityRole="button"
            accessibilityLabel={lang === "fr" ? "Fermer" : "Close"}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const gal = StyleSheet.create({
  placeholder: {
    width: SCREEN_W,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  topRow: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.38)",
    alignItems: "center",
    justifyContent: "center",
  },
  rightActions: {
    flexDirection: "row",
    gap: 10,
  },
  counter: {
    position: "absolute",
    top: 14,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  counterText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  dotsRow: {
    position: "absolute",
    bottom: 14,
    alignSelf: "center",
    flexDirection: "row",
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: "#fff",
    width: 16,
  },
  dotInactive: {
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 14,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  verifiedText: {
    color: "#F59E0B",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  bottomSlot: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  zoomBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomImage: {
    width: "100%",
    height: "100%",
  },
  zoomClose: {
    position: "absolute",
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
});
