import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useT, useColors } from "@/context/AppContext";
import { ColorPalette } from "@/constants/colors";
import { Fonts, FontSize, LetterSpacing } from "@/constants/typography";
import { ResilientImage } from "@/components/common/ResilientImage";

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

export type VenueCardVariant =
  | "default"
  | "compact"
  | "homePremium"
  | "venueList"
  | "venueFeatured";

interface VenueCardProps {
  venue: Venue;
  onPress?: () => void;
  /** @deprecated Use variant="compact" instead */
  compact?: boolean;
  variant?: VenueCardVariant;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
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

    // ── homePremium (horizontal scroll card) ─────────────────────────────
    premiumCard: {
      width: 190, height: 200, borderRadius: 18,
      overflow: "hidden", backgroundColor: C.card2,
      borderWidth: 1, borderColor: C.border,
    },
    premiumImage: { ...StyleSheet.absoluteFillObject },
    premiumTypeBadge: {
      position: "absolute", top: 10, left: 10,
      borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3,
    },
    premiumTypeBadgeText: {
      fontFamily: Fonts.semiBold, fontSize: FontSize.xs, letterSpacing: LetterSpacing.widest,
    },
    premiumContent: {
      position: "absolute", bottom: 0, left: 0, right: 0, padding: 12, gap: 3,
    },
    premiumName: { fontFamily: Fonts.bold, fontSize: FontSize.base, color: "#fff", letterSpacing: LetterSpacing.tight },
    premiumMetaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    premiumMeta: { fontFamily: Fonts.regular, fontSize: FontSize.xs, color: "rgba(255,255,255,0.75)" },
    premiumVerified: {
      position: "absolute", top: 10, right: 10,
      backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 12,
      width: 24, height: 24, alignItems: "center", justifyContent: "center",
    },

    // ── venueList (full-width premium list item) ──────────────────────────
    listCard: {
      flexDirection: "row",
      backgroundColor: C.card,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 10,
      alignItems: "center",
    },
    listImage: { width: 88, height: 88 },
    listPlaceholder: {
      backgroundColor: C.card2, alignItems: "center", justifyContent: "center",
    },
    listInfo: { flex: 1, paddingHorizontal: 13, paddingVertical: 11, gap: 4 },
    listNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    listName: {
      fontFamily: Fonts.semiBold, fontSize: FontSize.base, color: C.text,
      flex: 1, letterSpacing: LetterSpacing.tight,
    },
    listMeta: { fontFamily: Fonts.regular, fontSize: FontSize.xs, color: C.textMuted, flexShrink: 1 },
    listMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
    listTypePill: {
      borderRadius: 8, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2,
      borderColor: C.lavender + "40", backgroundColor: C.lavender + "10",
    },
    listTypeTxt: {
      fontFamily: Fonts.semiBold, fontSize: FontSize.xs - 1,
      color: C.lavender, letterSpacing: LetterSpacing.wide,
    },
    listChevron: { paddingHorizontal: 12, alignSelf: "center" },
    listRightActions: { flexDirection: "row", alignItems: "center" },
    listHeartBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

    // ── favorite heart button ─────────────────────────────────────────────
    heartBtn: {
      width: 30, height: 30,
      borderRadius: 15,
      backgroundColor: "rgba(0,0,0,0.30)",
      alignItems: "center", justifyContent: "center",
    },
    heartBtnLight: {
      backgroundColor: "rgba(255,255,255,0.12)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
    },

    // ── venueFeatured (large featured card, used in grid / top spot) ──────
    featuredCard: {
      borderRadius: 20, overflow: "hidden",
      backgroundColor: C.card2, borderWidth: 1, borderColor: C.border,
      height: 220,
    },
    featuredImage: { ...StyleSheet.absoluteFillObject },
    featuredBadge: {
      position: "absolute", top: 12, left: 12,
      flexDirection: "row", alignItems: "center", gap: 5,
      backgroundColor: "rgba(0,0,0,0.40)", borderRadius: 14,
      paddingHorizontal: 10, paddingVertical: 5,
    },
    featuredBadgeTxt: { fontFamily: Fonts.semiBold, fontSize: FontSize.xs, color: "#fff", letterSpacing: LetterSpacing.wide },
    featuredVerified: {
      position: "absolute", top: 12, right: 12,
      backgroundColor: C.lavender + "CC", borderRadius: 14,
      paddingHorizontal: 8, paddingVertical: 5,
      flexDirection: "row", alignItems: "center", gap: 4,
    },
    featuredVerifiedTxt: { fontFamily: Fonts.semiBold, fontSize: FontSize.xs, color: "#fff" },
    featuredContent: {
      position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, gap: 4,
    },
    featuredName: { fontFamily: Fonts.bold, fontSize: FontSize.lg, color: "#fff", letterSpacing: LetterSpacing.tight },
    featuredMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    featuredMeta: { fontFamily: Fonts.regular, fontSize: FontSize.sm, color: "rgba(255,255,255,0.80)" },
  });
}

export function VenueCard({ venue, onPress, compact = false, variant, isFavorite = false, onToggleFavorite }: VenueCardProps) {
  const t = useT();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);

  const resolvedVariant: VenueCardVariant =
    variant ?? (compact ? "compact" : "default");

  // ── homePremium ───────────────────────────────────────────────────────────
  if (resolvedVariant === "homePremium") {
    return (
      <TouchableOpacity
        onPress={onPress} activeOpacity={0.88}
        style={styles.premiumCard}
        accessibilityRole="button" accessibilityLabel={venue.name}
        accessibilityHint={venue.city ? `${venue.city}${venue.type ? ` · ${venue.type}` : ""}` : undefined}
      >
        <ResilientImage
          uri={venue.imageUrl}
          blurhash={venue.blurhash}
          style={styles.premiumImage}
          contentFit="cover"
          placeholderKind="venue"
          fallbackIconSize={36}
          noSkeleton
          debugContext="VenueCard.homePremium"
        />
        <LinearGradient
          colors={["transparent", "rgba(8,6,22,0.55)", "rgba(8,6,22,0.90)"]}
          locations={[0.3, 0.65, 1]}
          style={StyleSheet.absoluteFill}
        />
        {venue.type ? (
          <View style={[styles.premiumTypeBadge, { backgroundColor: C.lavender + "28", borderColor: C.lavender + "50" }]}>
            <Text style={[styles.premiumTypeBadgeText, { color: C.lavender }]}>
              {venue.type.toUpperCase()}
            </Text>
          </View>
        ) : null}
        {onToggleFavorite ? (
          <TouchableOpacity
            onPress={onToggleFavorite}
            hitSlop={8}
            style={styles.premiumVerified}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={14}
              color={isFavorite ? "#E05C5C" : "rgba(255,255,255,0.9)"}
            />
          </TouchableOpacity>
        ) : venue.isVerified ? (
          <View style={styles.premiumVerified}>
            <Ionicons name="checkmark-circle" size={14} color={C.lavender} />
          </View>
        ) : null}
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

  // ── venueList ─────────────────────────────────────────────────────────────
  if (resolvedVariant === "venueList") {
    return (
      <TouchableOpacity
        onPress={onPress} activeOpacity={0.84}
        style={styles.listCard}
        accessibilityRole="button" accessibilityLabel={venue.name}
      >
        <ResilientImage
          uri={venue.imageUrl}
          blurhash={venue.blurhash}
          style={styles.listImage}
          contentFit="cover"
          placeholderKind="venue"
          fallbackIconSize={28}
          debugContext="VenueCard.venueList"
        />

        {/* Info */}
        <View style={styles.listInfo}>
          <View style={styles.listNameRow}>
            <Text style={styles.listName} numberOfLines={1}>{venue.name}</Text>
            {venue.isVerified && (
              <Ionicons name="checkmark-circle" size={14} color={C.lavender} />
            )}
          </View>
          {venue.type ? (
            <View style={styles.listTypePill}>
              <Text style={styles.listTypeTxt}>{venue.type.toUpperCase()}</Text>
            </View>
          ) : null}
          {(venue.city || venue.address) && (
            <View style={styles.listMetaRow}>
              <Ionicons name="location-outline" size={11} color={C.textMuted} />
              <Text style={styles.listMeta} numberOfLines={1}>
                {[venue.address, venue.city].filter(Boolean).join(", ")}
              </Text>
            </View>
          )}
        </View>

        {/* Right: J'aime + chevron */}
        <View style={styles.listRightActions}>
          {onToggleFavorite ? (
            <TouchableOpacity
              onPress={onToggleFavorite}
              hitSlop={8}
              style={styles.listHeartBtn}
              accessibilityRole="button"
              accessibilityLabel={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={18}
                color={isFavorite ? "#E05C5C" : C.textMuted}
              />
            </TouchableOpacity>
          ) : null}
          <View style={styles.listChevron}>
            <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ── venueFeatured ────────────────────────────────────────────────────────
  if (resolvedVariant === "venueFeatured") {
    return (
      <TouchableOpacity
        onPress={onPress} activeOpacity={0.88}
        style={styles.featuredCard}
        accessibilityRole="button" accessibilityLabel={venue.name}
      >
        <ResilientImage
          uri={venue.imageUrl}
          blurhash={venue.blurhash}
          style={styles.featuredImage}
          contentFit="cover"
          placeholderKind="venue"
          fallbackIconSize={52}
          noSkeleton
          debugContext="VenueCard.venueFeatured"
        />
        <LinearGradient
          colors={["transparent", "rgba(6,4,18,0.45)", "rgba(6,4,18,0.92)"]}
          locations={[0.25, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Type badge */}
        {venue.type ? (
          <View style={styles.featuredBadge}>
            <Ionicons name="business-outline" size={12} color="#fff" />
            <Text style={styles.featuredBadgeTxt}>{venue.type.toUpperCase()}</Text>
          </View>
        ) : null}
        {/* Verified */}
        {venue.isVerified ? (
          <View style={styles.featuredVerified}>
            <Ionicons name="checkmark-circle" size={12} color="#fff" />
            <Text style={styles.featuredVerifiedTxt}>Vérifié</Text>
          </View>
        ) : null}
        {/* Bottom content */}
        <View style={styles.featuredContent}>
          <Text style={styles.featuredName} numberOfLines={1}>{venue.name}</Text>
          <View style={styles.featuredMetaRow}>
            {venue.city ? (
              <>
                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.80)" />
                <Text style={styles.featuredMeta} numberOfLines={1}>{venue.city}</Text>
              </>
            ) : null}
            {venue.address ? (
              <>
                <Text style={styles.featuredMeta}>·</Text>
                <Text style={styles.featuredMeta} numberOfLines={1}>{venue.address}</Text>
              </>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ── default / compact ─────────────────────────────────────────────────────
  const isCompact = resolvedVariant === "compact";

  return (
    <TouchableOpacity
      onPress={onPress} activeOpacity={0.85}
      style={[styles.card, isCompact && styles.compact]}
      accessibilityRole="button" accessibilityLabel={venue.name}
    >
      <ResilientImage
        uri={venue.imageUrl}
        blurhash={venue.blurhash}
        style={isCompact ? styles.compactImage : styles.image}
        contentFit="cover"
        placeholderKind="venue"
        fallbackIconSize={isCompact ? 28 : 44}
        debugContext={isCompact ? "VenueCard.compact" : "VenueCard.default"}
      />
      <View style={[styles.info, isCompact && styles.compactInfo]}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, isCompact && styles.compactName, { flex: 1 }]} numberOfLines={1}>
            {venue.name}
          </Text>
          {venue.isVerified && (
            <Ionicons name="checkmark-circle" size={14} color={C.lavender} />
          )}
          {onToggleFavorite ? (
            <TouchableOpacity
              onPress={onToggleFavorite}
              hitSlop={8}
              style={{ padding: 4 }}
              accessibilityRole="button"
              accessibilityLabel={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={16}
                color={isFavorite ? "#E05C5C" : C.textMuted}
              />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.row}>
          <Ionicons name="business-outline" size={12} color={C.textMuted} />
          <Text style={styles.meta}>{venue.type}</Text>
          {venue.city ? (
            <>
              <Text style={styles.dot}>·</Text>
              <Ionicons name="location-outline" size={12} color={C.textMuted} />
              <Text style={styles.meta} numberOfLines={1}>{venue.city}</Text>
            </>
          ) : null}
        </View>
        {!isCompact && venue.description && (
          <Text style={styles.desc} numberOfLines={2}>{venue.description}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
