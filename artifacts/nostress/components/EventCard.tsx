import React, { useMemo } from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useT, useApp, useColors } from "@/context/AppContext";
import { ColorPalette } from "@/constants/colors";
import { formatDateLocalized } from "@/lib/formatDate";

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
  price?: number | null;
  priceFCFA?: number | null;
  currency?: string | null;
  isSponsored?: boolean;
  status?: string;
  ticketTypes?: TicketType[];
}

interface EventCardProps {
  event: Event;
  onPress: () => void;
  horizontal?: boolean;
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
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
    sponsoredBadge: {
      position: "absolute",
      top: 10,
      left: 10,
      backgroundColor: C.gold,
      borderRadius: 8,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 4,
      gap: 4,
    },
    sponsoredText: { color: C.bg, fontSize: 10, fontFamily: "Inter_700Bold" },
    favBtn: {
      position: "absolute",
      top: 10,
      right: 10,
      backgroundColor: "rgba(0,0,0,0.5)",
      borderRadius: 20,
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    info: { padding: 12, gap: 4 },
    category: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: C.lavender, letterSpacing: 1 },
    title: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.text, marginTop: 2 },
    row: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
    meta: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textMuted, flexShrink: 1 },
    dot: { color: C.textMuted, fontSize: 12 },
    footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
    price: { fontSize: 14, fontFamily: "Inter_700Bold", color: C.gold },
  });
}

export function EventCard({ event, onPress, horizontal = false }: EventCardProps) {
  const t = useT();
  const C = useColors();
  const { lang, isFavorite, toggleFavorite } = useApp();
  const styles = useMemo(() => makeStyles(C), [C]);

  const safeTitle =
    (lang === "fr" ? event.titleFr || event.title : event.title || event.titleFr) || "";
  const rawPrice = (event.price ?? event.priceFCFA ?? 0) as number;
  const price = !rawPrice
    ? t("free")
    : `${Number(rawPrice).toLocaleString()} ${event.currency || "FCFA"}`;
  const safeCategory = (event.category || "").toUpperCase();
  const safeVenue = event.venue || "";
  const safeCity = event.city || "";
  const safeLocation = [safeVenue, safeCity].filter(Boolean).join(", ");

  const formattedDate = (() => {
    if (!event.date) return "";
    const d = new Date(event.date);
    if (isNaN(d.getTime())) return event.date;
    return formatDateLocalized(d, lang, { short: true });
  })();

  const fav = isFavorite(event.id);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, horizontal ? { width: CARD_WIDTH } : styles.fullCard]}
    >
      <View style={styles.imageContainer}>
        {event.imageUrl ? (
          <Image source={{ uri: event.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="musical-notes" size={32} color={C.lavender} />
          </View>
        )}
        <TouchableOpacity
          style={styles.favBtn}
          onPress={() => toggleFavorite(event.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={fav ? "heart" : "heart-outline"}
            size={20}
            color={fav ? "#E05C5C" : C.white}
          />
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
