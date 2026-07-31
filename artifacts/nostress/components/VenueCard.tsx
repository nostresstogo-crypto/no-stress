import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useT, useColors } from "@/context/AppContext";
import { thumbUrl } from "@/lib/imageUrl";
import { ColorPalette } from "@/constants/colors";
import { Fonts, FontSize, LetterSpacing } from "@/constants/typography";

interface Venue {
  id: string;
  name: string;
  type: string;
  city: string;
  address?: string;
  imageUrl?: string;
  blurhash?: string | null;
  description?: string;
  isVerified?: boolean;
}

export type VenueCardVariant = "default" | "compact" | "homePremium";

interface VenueCardProps {
  venue: Venue;
  onPress?: () => void;
  /** @deprecated Use variant="compact" instead */
  compact?: boolean;
  variant?: VenueCardVariant;
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    // ── default ───────────────────────────────────────────────────────────
    card: {
      backgroundColor: C.card,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 12,
    },
    compact: { flexDirection: "row", alignItems: "center", borderRadius: 12 },
    image: { width: "100%", height: 140 },
    compactImage: { width: 72, height: 72 },
    placeholder: { backgroundColor: C.card2, alignItems: "center", justifyContent: "center", gap: 6 },
    placeholderLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: C.textMuted, letterSpacing: 0.3 },
    info: { padding: 12, gap: 4 },
    compactInfo: { flex: 1, padding: 10 },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    name: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: C.text, flex: 1 },
    compactName: { fontSize: 14 },
    row: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
    meta: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textMuted },
    dot: { color: C.textMuted, fontSize: 12 },
    desc: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textMuted, marginTop: 4 },

    // ── homePremium ───────────────────────────────────────────────────────
    premiumCard: {
      width: 190,
      height: 200,
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: C.card2,
      borderWidth: 1,
      borderColor: C.border,
    },
    premiumImage: { ...StyleSheet.absoluteFillObject },
    premiumTypeBadge: {
      position: "absolute",
      top: 10,
      left: 10,
      borderRadius: 20,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    premiumTypeBadgeText: {
      fontFamily: Fonts.semiBold,
      fontSize: FontSize.xs,
      letterSpacing: LetterSpacing.widest,
    },
    premiumContent: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: 12,
      gap: 3,
    },
    premiumName: {
      fontFamily: Fonts.bold,
      fontSize: FontSize.base,
      color: "#fff",
      letterSpacing: LetterSpacing.tight,
    },
    premiumMetaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    premiumMeta: {
      fontFamily: Fonts.regular,
      fontSize: FontSize.xs,
      color: "rgba(255,255,255,0.75)",
    },
    premiumVerified: {
      position: "absolute",
      top: 10,
      right: 10,
      backgroundColor: "rgba(0,0,0,0.4)",
      borderRadius: 12,
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}

export function VenueCard({ venue, onPress, compact = false, variant }: VenueCardProps) {
  const t = useT();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);

  // Resolve variant: explicit wins, fallback to compact bool
  const resolvedVariant: VenueCardVariant =
    variant ?? (compact ? "compact" : "default");

  // ── homePremium variant ───────────────────────────────────────────────────
  if (resolvedVariant === "homePremium") {
    const imgUri = thumbUrl(venue.imageUrl, 380, 400) ?? venue.imageUrl ?? null;
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.88}
        style={styles.premiumCard}
        accessibilityRole="button"
        accessibilityLabel={venue.name}
        accessibilityHint={
          venue.city
            ? (venue.city + (venue.type ? ` · ${venue.type}` : ""))
            : undefined
        }
      >
        {/* Background image */}
        {imgUri ? (
          <Image
            source={{ uri: imgUri }}
            style={styles.premiumImage}
            contentFit="cover"
            cachePolicy="disk"
            transition={200}
            placeholder={venue.blurhash ? { blurhash: venue.blurhash } : undefined}
          />
        ) : (
          <View style={[styles.premiumImage, styles.placeholder]}>
            <Ionicons name="business-outline" size={36} color={C.textMuted} />
          </View>
        )}

        {/* Gradient overlay */}
        <LinearGradient
          colors={["transparent", "rgba(8,6,22,0.55)", "rgba(8,6,22,0.88)"]}
          locations={[0.3, 0.65, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Type badge */}
        {venue.type ? (
          <View style={[styles.premiumTypeBadge, { backgroundColor: C.lavender + "28", borderColor: C.lavender + "50" }]}>
            <Text style={[styles.premiumTypeBadgeText, { color: C.lavender }]}>
              {venue.type.toUpperCase()}
            </Text>
          </View>
        ) : null}

        {/* Verified badge */}
        {venue.isVerified ? (
          <View style={styles.premiumVerified}>
            <Ionicons name="checkmark-circle" size={14} color={C.lavender} />
          </View>
        ) : null}

        {/* Name + city */}
        <View style={styles.premiumContent}>
          <Text style={styles.premiumName} numberOfLines={1}>{venue.name}</Text>
          {venue.city ? (
            <View style={styles.premiumMetaRow}>
              <Ionicons name="location-outline" size={10} color="rgba(255,255,255,0.75)" />
              <Text style={styles.premiumMeta} numberOfLines={1}>{venue.city}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }

  // ── default / compact ─────────────────────────────────────────────────────
  const isCompact = resolvedVariant === "compact";
  const imgUri = thumbUrl(venue.imageUrl, isCompact ? 144 : 480, isCompact ? 144 : 280) ?? venue.imageUrl ?? null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, isCompact && styles.compact]}
      accessibilityRole="button"
      accessibilityLabel={venue.name}
    >
      {imgUri ? (
        <Image
          source={{ uri: imgUri }}
          style={isCompact ? styles.compactImage : styles.image}
          contentFit="cover"
          cachePolicy="disk"
          transition={200}
          placeholder={venue.blurhash ? { blurhash: venue.blurhash } : undefined}
        />
      ) : (
        <View style={[isCompact ? styles.compactImage : styles.image, styles.placeholder]}>
          <Ionicons name="business" size={isCompact ? 28 : 44} color={C.lavender} />
          {!isCompact && (
            <Text style={styles.placeholderLabel}>Aucune photo</Text>
          )}
        </View>
      )}
      <View style={[styles.info, isCompact && styles.compactInfo]}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, isCompact && styles.compactName]} numberOfLines={1}>
            {venue.name}
          </Text>
          {venue.isVerified && (
            <Ionicons name="checkmark-circle" size={14} color={C.lavender} />
          )}
        </View>
        <View style={styles.row}>
          <Ionicons name="business-outline" size={12} color={C.textMuted} />
          <Text style={styles.meta}>{venue.type}</Text>
          <Text style={styles.dot}>·</Text>
          <Ionicons name="location-outline" size={12} color={C.textMuted} />
          <Text style={styles.meta} numberOfLines={1}>{venue.city}</Text>
        </View>
        {!isCompact && venue.description && (
          <Text style={styles.desc} numberOfLines={2}>{venue.description}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
