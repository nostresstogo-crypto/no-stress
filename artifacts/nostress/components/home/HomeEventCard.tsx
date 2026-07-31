/**
 * HomeEventCard — Carte d'événement premium pour l'accueil.
 *
 * Variante "featured" : grande image, titre impactant, badge catégorie.
 * Rétrocompatible : EventCard dans les autres écrans n'est pas modifié.
 */
import React from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useApp, useColors } from "@/context/AppContext";
import { ColorPalette } from "@/constants/colors";
import { Fonts, FontSize, LetterSpacing, caption, bodySmall } from "@/constants/typography";
import { formatDateLocalized } from "@/lib/formatDate";
import { thumbUrl } from "@/lib/imageUrl";

const { width: SCREEN_W } = Dimensions.get("window");
const FEATURED_W = SCREEN_W * 0.78;
const COMPACT_W  = SCREEN_W * 0.60;

export type HomeEventVariant = "featured" | "compact";

export interface HomeEvent {
  id: string | number;
  title?: string | null;
  titleFr?: string | null;
  category?: string | null;
  date?: string | null;
  time?: string | null;
  venue?: string | null;
  city?: string | null;
  imageUrl?: string | null;
  priceFCFA?: number | null;
  isFree?: boolean;
}

interface Props {
  event: HomeEvent;
  variant?: HomeEventVariant;
  onPress: () => void;
}

export function HomeEventCard({ event, variant = "featured", onPress }: Props) {
  const C = useColors();
  const { lang, isFavorite, toggleFavorite } = useApp();

  const title = (lang === "fr" ? event.titleFr || event.title : event.title || event.titleFr) ?? "";
  const dateStr = event.date ? formatDateLocalized(event.date, lang === "fr" ? "fr" : "en", { short: true }) : "";
  const location = [event.venue, event.city].filter(Boolean).join(", ");
  const category = event.category?.toUpperCase() ?? "";
  const fav = isFavorite(String(event.id));

  const isFeatured = variant === "featured";
  const cardW = isFeatured ? FEATURED_W : COMPACT_W;
  const imgH = isFeatured ? 170 : 120;
  const imgUri = thumbUrl(event.imageUrl, Math.round(cardW), imgH) ?? event.imageUrl ?? null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={[styles.card, { width: cardW, backgroundColor: C.card, borderColor: C.border }]}
    >
      {/* Image */}
      <View style={[styles.imageWrap, { height: imgH }]}>
        {imgUri ? (
          <Image
            source={{ uri: imgUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="disk"
            transition={200}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: C.card2, alignItems: "center", justifyContent: "center" }]}>
            <Ionicons name="musical-notes" size={28} color={C.lavender} />
          </View>
        )}

        {/* Category badge */}
        {category ? (
          <View style={[styles.catBadge, { backgroundColor: C.lavender + "28", borderColor: C.lavender + "50" }]}>
            <Text style={[styles.catText, { color: C.lavender }]}>{category}</Text>
          </View>
        ) : null}

        {/* Fav button */}
        <TouchableOpacity
          style={styles.favBtn}
          onPress={() => toggleFavorite(String(event.id))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={fav ? "heart" : "heart-outline"}
            size={16}
            color={fav ? "#E05C5C" : "#fff"}
          />
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text
          style={[styles.title, { color: C.text, fontSize: isFeatured ? FontSize.md : FontSize.base }]}
          numberOfLines={2}
        >
          {title}
        </Text>

        {dateStr ? (
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={11} color={C.textMuted} />
            <Text style={[styles.meta, { color: C.textMuted }]}>{dateStr}</Text>
            {event.time ? (
              <>
                <Text style={[styles.dot, { color: C.textMuted }]}>·</Text>
                <Text style={[styles.meta, { color: C.textMuted }]}>{event.time}</Text>
              </>
            ) : null}
          </View>
        ) : null}

        {location ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={11} color={C.textMuted} />
            <Text style={[styles.meta, { color: C.textMuted }]} numberOfLines={1}>{location}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
  },
  imageWrap: {
    position: "relative",
  },
  catBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  catText: { ...caption, letterSpacing: LetterSpacing.widest },
  favBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 16,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { padding: 12, gap: 5 },
  title: {
    fontFamily: Fonts.semiBold,
    lineHeight: FontSize.md * 1.3,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  meta: { ...bodySmall, flexShrink: 1 },
  dot: { ...bodySmall },
});
