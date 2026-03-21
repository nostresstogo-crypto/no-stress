import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";

import { C } from "@/constants/colors";
import { useT, useApp } from "@/context/AppContext";
import { MOCK_EVENTS } from "@/constants/data";

const { height } = Dimensions.get("window");

export default function EventDetailScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lang, isFavorite, toggleFavorite } = useApp();
  const insets = useSafeAreaInsets();

  const event = MOCK_EVENTS.find((e) => e.id === id);
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  if (!event) {
    return (
      <View style={styles.notFound}>
        <Ionicons name="alert-circle-outline" size={48} color={C.border} />
        <Text style={styles.notFoundText}>{t("noData")}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>{t("back")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const title = lang === "fr" && event.titleFr ? event.titleFr : event.title;
  const description = lang === "fr" && event.descriptionFr ? event.descriptionFr : event.description;
  const fav = isFavorite(event.id);

  const formattedDate = (() => {
    const d = new Date(event.date);
    return d.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  })();

  const handleShare = async () => {
    try {
      await Share.share({
        title,
        message: `${title} - ${formattedDate} at ${event.venue}, ${event.city}`,
      });
    } catch {}
  };

  const price = event.price === 0
    ? t("free")
    : `${event.price.toLocaleString()} ${event.currency || "FCFA"}`;

  return (
    <View style={styles.root}>
      {/* Image hero */}
      <View style={styles.heroContainer}>
        {event.imageUrl ? (
          <Image source={{ uri: event.imageUrl }} style={styles.hero} resizeMode="cover" />
        ) : (
          <View style={[styles.hero, styles.heroPlaceholder]}>
            <Ionicons name="musical-notes" size={48} color={C.lavender} />
          </View>
        )}
        <View style={[styles.heroOverlay, StyleSheet.absoluteFill]} />

        {/* Back + actions */}
        <View style={[styles.heroActions, { top: (Platform.OS === "web" ? 67 : insets.top) + 12 }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <View style={styles.heroRightActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => toggleFavorite(event.id)}>
              <Ionicons name={fav ? "heart" : "heart-outline"} size={22} color={fav ? "#E05C5C" : C.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={22} color={C.white} />
            </TouchableOpacity>
          </View>
        </View>

        {event.isSponsored && (
          <View style={styles.sponsoredBadge}>
            <Ionicons name="star" size={10} color={C.bg} />
            <Text style={styles.sponsoredText}>{t("sponsored")}</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Category + Title */}
        <Text style={styles.category}>{event.category.toUpperCase()}</Text>
        <Text style={styles.title}>{title}</Text>

        {/* Date, time, venue */}
        <View style={styles.infoCard}>
          <InfoRow icon="calendar" text={formattedDate} />
          {event.time && <InfoRow icon="time" text={event.time} />}
          <InfoRow icon="location" text={`${event.venue}, ${event.city}`} />
        </View>

        {/* Description */}
        {description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("description")}</Text>
            <Text style={styles.description}>{description}</Text>
          </View>
        )}

        {/* Location map stub */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("location")}</Text>
          <View style={styles.mapStub}>
            <Ionicons name="map" size={32} color={C.lavender} />
            <Text style={styles.mapText}>{event.venue}</Text>
            <Text style={styles.mapAddr}>{event.city}</Text>
            {event.latitude && event.longitude && (
              <Text style={styles.mapCoords}>
                {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
              </Text>
            )}
          </View>
        </View>

        {/* Ticket types */}
        {event.ticketTypes && event.ticketTypes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("ticketTypes")}</Text>
            {event.ticketTypes.map((tt) => {
              const ttName = lang === "fr" && tt.nameFr ? tt.nameFr : tt.name;
              const ttPrice = tt.price === 0 ? t("free") : `${tt.price.toLocaleString()} ${tt.currency || "FCFA"}`;
              return (
                <View key={tt.id} style={styles.ticketTypeRow}>
                  <View>
                    <Text style={styles.ticketTypeName}>{ttName}</Text>
                    {tt.available !== undefined && (
                      <Text style={styles.ticketTypeAvail}>
                        {tt.available} {lang === "fr" ? "disponibles" : "available"}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.ticketTypePrice}>{ttPrice}</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Buy button */}
      <View style={[styles.buyBar, { paddingBottom: bottomInset + 12 }]}>
        <View style={styles.buyLeft}>
          <Text style={styles.buyFromLabel}>{lang === "fr" ? "À partir de" : "From"}</Text>
          <Text style={styles.buyPrice}>{price}</Text>
        </View>
        <TouchableOpacity
          style={styles.buyBtn}
          onPress={() => router.push(`/ticket/${event.id}`)}
        >
          <Text style={styles.buyBtnText}>{t("buyTicket")}</Text>
          <Ionicons name="arrow-forward" size={16} color={C.bg} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={infoStyles.row}>
      <View style={infoStyles.iconWrap}>
        <Ionicons name={icon as any} size={16} color={C.lavender} />
      </View>
      <Text style={infoStyles.text}>{text}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.lavender + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.text,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  heroContainer: {
    height: height * 0.38,
    position: "relative",
  },
  hero: {
    width: "100%",
    height: "100%",
  },
  heroPlaceholder: {
    backgroundColor: C.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  heroOverlay: {
    backgroundColor: "rgba(14,17,32,0.35)",
  },
  heroActions: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroRightActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  sponsoredBadge: {
    position: "absolute",
    bottom: 16,
    left: 20,
    backgroundColor: C.gold,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  sponsoredText: {
    color: C.bg,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  scroll: { flex: 1 },
  content: {
    padding: 20,
    gap: 16,
  },
  category: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: C.lavender,
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: C.text,
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  infoCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  section: { gap: 12 },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  description: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    lineHeight: 22,
  },
  mapStub: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 120,
    justifyContent: "center",
  },
  mapText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  mapAddr: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  mapCoords: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  ticketTypeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  ticketTypeName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  ticketTypeAvail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    marginTop: 2,
  },
  ticketTypePrice: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: C.gold,
  },
  buyBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 16,
  },
  buyLeft: { gap: 2 },
  buyFromLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  buyPrice: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: C.gold,
  },
  buyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.lavender,
    borderRadius: 14,
    paddingVertical: 14,
  },
  buyBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.bg,
  },
  notFound: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  notFoundText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
  },
  backLink: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.lavender,
  },
});
