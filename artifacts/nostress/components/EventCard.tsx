import React, { useMemo, useRef, useCallback } from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useT, useApp, useColors } from "@/context/AppContext";
import { ColorPalette } from "@/constants/colors";
import { formatDateLocalized } from "@/lib/formatDate";
import { Fonts, FontSize, LetterSpacing } from "@/constants/typography";
import { ResilientImage } from "@/components/common/ResilientImage";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.72;

interface TicketType {
  id: string;
  name: string;
  nameFr?: string;
  price: number;
  currency: string;
  available?: number;
}

interface Event {
  id: string;
  title?: string | null;
  titleFr?: string | null;
  date?: string | null;
  time?: string | null;
  venue?: string | null;
  city?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  blurhash?: string | null;
  price?: number | null;
  priceFCFA?: number | null;
  currency?: string | null;
  status?: string;
  ticketTypes?: TicketType[];
}

export type EventCardVariant = "default" | "horizontal" | "homeCompact";

interface EventCardProps {
  event: Event;
  onPress: () => void;
  /** @deprecated Use variant="horizontal" instead */
  horizontal?: boolean;
  variant?: EventCardVariant;
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    // ── default / horizontal ──────────────────────────────────────────────
    card: {
      backgroundColor: C.card,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: C.border,
    },
    fullCard: { marginBottom: 12 },
    imageContainer: { position: "relative", height: 160 },
    image: { width: "100%", height: "100%" },
    imagePlaceholder: {
      backgroundColor: C.card2,
      alignItems: "center",
      justifyContent: "center",
    },
    favBtn: {
      position: "absolute",
      top: 10,
      right: 10,
      padding: 6,
    },
    info: { padding: 12, gap: 4 },
    category: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: C.lavender, letterSpacing: 1 },
    title: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.text, marginTop: 2 },
    row: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
    meta: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textMuted, flexShrink: 1 },
    dot: { color: C.textMuted, fontSize: 12 },
    footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
    price: { fontSize: 14, fontFamily: "Inter_700Bold", color: C.gold },

    // ── homeCompact ───────────────────────────────────────────────────────
    compactCard: {
      backgroundColor: C.card,
      borderRadius: 14,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: C.border,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
      minHeight: 80,
    },
    compactImg: { width: 80, height: 80 },
    compactImgPlaceholder: {
      backgroundColor: C.card2,
      alignItems: "center",
      justifyContent: "center",
    },
    compactCatBadge: {
      position: "absolute",
      top: 6,
      left: 6,
      backgroundColor: "rgba(0,0,0,0.5)",
      borderRadius: 8,
      paddingHorizontal: 5,
      paddingVertical: 2,
    },
    compactCatText: {
      fontFamily: Fonts.semiBold,
      fontSize: 8,
      color: "#fff",
      letterSpacing: LetterSpacing.widest,
    },
    compactInfo: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 3 },
    compactTitle: {
      fontFamily: Fonts.semiBold,
      fontSize: FontSize.sm,
      color: C.text,
      lineHeight: FontSize.sm * 1.35,
    },
    compactRow: { flexDirection: "row", alignItems: "center", gap: 3, flexWrap: "wrap" },
    compactMeta: { fontFamily: Fonts.regular, fontSize: FontSize.xs, color: C.textMuted, flexShrink: 1 },
    compactFavBtn: {
      paddingHorizontal: 10,
      paddingVertical: 10,
      alignSelf: "center",
    },
  });
}

export function EventCard({ event, onPress, horizontal = false, variant }: EventCardProps) {
  const t = useT();
  const C = useColors();
  const { lang, isFavorite, toggleFavorite } = useApp();
  const styles = useMemo(() => makeStyles(C), [C]);

  // Resolve variant: explicit variant prop takes priority; fall back to horizontal bool for compat
  const resolvedVariant: EventCardVariant =
    variant ?? (horizontal ? "horizontal" : "default");

  const safeTitle =
    (lang === "fr" ? event.titleFr || event.title : event.title || event.titleFr) || "";
  const safeCategory = (event.category || "").toUpperCase();
  const safeVenue = event.venue || "";
  const safeCity = event.city || "";
  const safeLocation = [safeVenue, safeCity].filter(Boolean).join(", ");

  const formattedDate = (() => {
    if (!event.date) return "";
    return formatDateLocalized(event.date, lang === "fr" ? "fr" : "en", { short: true });
  })();

  const fav = isFavorite(event.id);

  const heartScale = useRef(new Animated.Value(1)).current;

  const handleToggleFavorite = useCallback(() => {
    if (!fav) {
      // Animate scale-up when adding to favorites
      Animated.sequence([
        Animated.spring(heartScale, {
          toValue: 1.4,
          useNativeDriver: true,
          speed: 40,
          bounciness: 12,
        }),
        Animated.spring(heartScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 30,
          bounciness: 6,
        }),
      ]).start();
    }
    toggleFavorite(event.id);
  }, [fav, heartScale, toggleFavorite, event.id]);

  // ── homeCompact variant ───────────────────────────────────────────────────
  if (resolvedVariant === "homeCompact") {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={styles.compactCard}
        accessibilityRole="button"
        accessibilityLabel={safeTitle}
      >
        {/* Image thumbnail */}
        <View style={styles.compactImg}>
          <ResilientImage
            uri={event.imageUrl}
            blurhash={event.blurhash}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            placeholderKind="event"
            fallbackIconSize={24}
            debugContext="EventCard.homeCompact"
          />
          {safeCategory ? (
            <View style={styles.compactCatBadge}>
              <Text style={styles.compactCatText}>{safeCategory}</Text>
            </View>
          ) : null}
        </View>

        {/* Info */}
        <View style={styles.compactInfo}>
          <Text style={styles.compactTitle} numberOfLines={2}>{safeTitle}</Text>
          {formattedDate ? (
            <View style={styles.compactRow}>
              <Ionicons name="calendar-outline" size={10} color={C.textMuted} />
              <Text style={styles.compactMeta}>{formattedDate}</Text>
              {event.time ? (
                <>
                  <Text style={[styles.compactMeta, { color: C.border }]}>·</Text>
                  <Text style={styles.compactMeta}>{event.time}</Text>
                </>
              ) : null}
            </View>
          ) : null}
          {safeLocation ? (
            <View style={styles.compactRow}>
              <Ionicons name="location-outline" size={10} color={C.textMuted} />
              <Text style={styles.compactMeta} numberOfLines={1}>{safeLocation}</Text>
            </View>
          ) : null}
        </View>

        {/* Fav */}
        <TouchableOpacity
          style={styles.compactFavBtn}
          onPress={handleToggleFavorite}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={fav
            ? (lang === "fr" ? "Retirer des favoris" : "Remove from favorites")
            : (lang === "fr" ? "Ajouter aux favoris" : "Add to favorites")}
          accessibilityRole="togglebutton"
          accessibilityState={{ checked: fav }}
        >
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Ionicons
              name={fav ? "heart" : "heart-outline"}
              size={18}
              color={fav ? "#E05C5C" : C.textMuted}
            />
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  // ── default / horizontal ──────────────────────────────────────────────────
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, resolvedVariant === "horizontal" ? { width: CARD_WIDTH } : styles.fullCard]}
      accessibilityRole="button"
      accessibilityLabel={safeTitle}
    >
      <View style={styles.imageContainer}>
        <ResilientImage
          uri={event.imageUrl}
          blurhash={event.blurhash}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          placeholderKind="event"
          fallbackIconSize={32}
          debugContext="EventCard.default"
        />
        <TouchableOpacity
          style={styles.favBtn}
          onPress={handleToggleFavorite}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={fav
            ? (lang === "fr" ? "Retirer des favoris" : "Remove from favorites")
            : (lang === "fr" ? "Ajouter aux favoris" : "Add to favorites")}
          accessibilityRole="togglebutton"
          accessibilityState={{ checked: fav }}
        >
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Ionicons
              name={fav ? "heart" : "heart-outline"}
              size={20}
              color={fav ? "#E05C5C" : C.white}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <View style={styles.info}>
        {safeCategory ? (
          <Text style={styles.category} numberOfLines={1}>
            {safeCategory}
          </Text>
        ) : null}
        <Text style={styles.title} numberOfLines={2}>{safeTitle}</Text>
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={12} color={C.textMuted} />
          <Text style={styles.meta}>{formattedDate}</Text>
          {event.time ? (
            <>
              <Text style={styles.dot}>·</Text>
              <Ionicons name="time-outline" size={12} color={C.textMuted} />
              <Text style={styles.meta}>{event.time}</Text>
            </>
          ) : null}
        </View>
        {safeLocation ? (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={12} color={C.textMuted} />
            <Text style={styles.meta} numberOfLines={1}>{safeLocation}</Text>
          </View>
        ) : null}
        {/* Price hidden by product decision. */}
      </View>
    </TouchableOpacity>
  );
}
