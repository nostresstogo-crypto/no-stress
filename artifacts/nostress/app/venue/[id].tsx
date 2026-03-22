import React from "react";
import {
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { C } from "@/constants/colors";
import { useT, useApp } from "@/context/AppContext";
import { MOCK_VENUES, MOCK_EVENTS } from "@/constants/data";

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const { lang } = useApp();
  const insets = useSafeAreaInsets();

  const venue = MOCK_VENUES.find((v) => v.id === id);
  const venueEvents = MOCK_EVENTS.filter((e) => e.venueId === id);

  if (!venue) {
    return (
      <View style={[styles.root, styles.center]}>
        <Ionicons name="business-outline" size={48} color={C.border} />
        <Text style={styles.emptyText}>
          {lang === "fr" ? "Lieu introuvable" : "Venue not found"}
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>
            {lang === "fr" ? "Retour" : "Go back"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const openMaps = () => {
    const query = encodeURIComponent(`${venue.name}, ${venue.address}`);
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${venue.latitude},${venue.longitude}`
      )}`,
    });
    Linking.openURL(url);
  };

  const typeIcon = getTypeIcon(venue.type);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero image */}
        <View style={styles.hero}>
          {venue.imageUrl ? (
            <Image
              source={{ uri: venue.imageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <Ionicons name="business" size={64} color={C.lavender} />
            </View>
          )}

          {/* Dark gradient overlay bottom */}
          <LinearGradient
            colors={["transparent", C.bg]}
            locations={[0.5, 1.0]}
            style={styles.heroOverlay}
          />

          {/* Back button */}
          <TouchableOpacity
            style={[styles.navBtn, { top: (insets.top || 20) + 8 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>

          {/* Verified badge on hero */}
          {venue.isVerified && (
            <View style={styles.verifiedHero}>
              <Ionicons name="checkmark-circle" size={14} color={C.gold} />
              <Text style={styles.verifiedHeroText}>
                {lang === "fr" ? "Vérifié" : "Verified"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          {/* Name + type */}
          <View style={styles.titleRow}>
            <View style={styles.typeIconWrap}>
              <Ionicons name={typeIcon as any} size={20} color={C.lavender} />
            </View>
            <View style={styles.titleInfo}>
              <Text style={styles.typePill}>{venue.type}</Text>
              <Text style={styles.venueName}>{venue.name}</Text>
            </View>
          </View>

          {/* Address row */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="location" size={16} color={C.gold} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>
                {lang === "fr" ? "Adresse" : "Address"}
              </Text>
              <Text style={styles.infoValue}>{venue.address}</Text>
            </View>
          </View>

          {/* City row */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="map" size={16} color={C.lavender} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>
                {lang === "fr" ? "Ville" : "City"}
              </Text>
              <Text style={styles.infoValue}>{venue.city} · Togo</Text>
            </View>
          </View>

          {/* Description */}
          {venue.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {lang === "fr" ? "À propos" : "About"}
              </Text>
              <Text style={styles.description}>{venue.description}</Text>
            </View>
          )}

          {/* Open in maps button */}
          <TouchableOpacity style={styles.mapsBtn} onPress={openMaps}>
            <Ionicons name="navigate" size={18} color={C.bg} />
            <Text style={styles.mapsBtnText}>
              {lang === "fr" ? "Ouvrir dans Maps" : "Open in Maps"}
            </Text>
          </TouchableOpacity>

          {/* Events at this venue */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {lang === "fr"
                ? `Événements ici (${venueEvents.length})`
                : `Events here (${venueEvents.length})`}
            </Text>
            {venueEvents.length === 0 ? (
              <View style={styles.emptyEvents}>
                <Ionicons name="calendar-outline" size={32} color={C.border} />
                <Text style={styles.emptyEventsText}>
                  {lang === "fr"
                    ? "Aucun événement prévu"
                    : "No upcoming events"}
                </Text>
              </View>
            ) : (
              venueEvents.map((event) => {
                const title =
                  lang === "fr" && event.titleFr ? event.titleFr : event.title;
                const isFree = event.price === 0;
                return (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.eventRow}
                    onPress={() => router.push(`/event/${event.id}` as any)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.eventDateBox}>
                      <Text style={styles.eventDay}>
                        {event.date.split("-")[2]}
                      </Text>
                      <Text style={styles.eventMonth}>
                        {getMonthShort(event.date, lang)}
                      </Text>
                    </View>
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventTitle} numberOfLines={1}>
                        {title}
                      </Text>
                      <Text style={styles.eventTime}>
                        {event.time}
                        {event.isSponsored
                          ? ` · ${lang === "fr" ? "Sponsorisé" : "Sponsored"}`
                          : ""}
                      </Text>
                    </View>
                    <View style={styles.eventPriceWrap}>
                      {isFree ? (
                        <View style={styles.freeBadge}>
                          <Text style={styles.freeBadgeText}>{t("free")}</Text>
                        </View>
                      ) : (
                        <Text style={styles.eventPrice}>
                          {event.price.toLocaleString()}
                          {"\n"}
                          <Text style={styles.eventPriceSub}>FCFA</Text>
                        </Text>
                      )}
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color={C.textMuted}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function getTypeIcon(type: string): string {
  switch (type) {
    case "Nightclub": return "wine";
    case "Bar": return "beer";
    case "Restaurant": return "restaurant";
    case "Concert Hall": return "musical-notes";
    case "Beach Club": return "sunny";
    case "Cinema": return "film";
    case "Hotel": return "bed";
    case "Stadium": return "football";
    case "Cultural Center": return "library";
    case "Comedy Club": return "happy";
    default: return "business";
  }
}

function getMonthShort(dateStr: string, lang: string): string {
  const months = lang === "fr"
    ? ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = parseInt(dateStr.split("-")[1], 10) - 1;
  return months[month] ?? "";
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },

  /* Hero */
  hero: { position: "relative", height: 260 },
  heroImage: { width: "100%", height: "100%" },
  heroPlaceholder: {
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  navBtn: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(14,17,32,0.7)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  verifiedHero: {
    position: "absolute",
    bottom: 14,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(14,17,32,0.75)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.gold + "55",
  },
  verifiedHeroText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: C.gold,
  },

  /* Body */
  body: { padding: 20, gap: 16 },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  typeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.lavender + "18",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.lavender + "30",
    flexShrink: 0,
  },
  titleInfo: { flex: 1, gap: 4 },
  typePill: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: C.lavender,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  venueName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: C.text,
    lineHeight: 28,
  },

  /* Info rows */
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.card2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoText: { flex: 1, gap: 2 },
  infoLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },

  /* Description */
  section: { gap: 12 },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    lineHeight: 22,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },

  /* Maps button */
  mapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.gold,
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: C.gold,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  mapsBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.bg,
  },

  /* Events */
  emptyEvents: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 10,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyEventsText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    gap: 12,
  },
  eventDateBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: C.lavender + "18",
    borderWidth: 1,
    borderColor: C.lavender + "40",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  eventDay: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: C.lavender,
    lineHeight: 18,
  },
  eventMonth: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: C.lavender,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  eventInfo: { flex: 1, gap: 3 },
  eventTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  eventTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  eventPriceWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  eventPrice: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: C.gold,
    textAlign: "right",
  },
  eventPriceSub: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  freeBadge: {
    backgroundColor: C.success + "22",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: C.success + "55",
  },
  freeBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: C.success,
  },

  /* Back / empty state */
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
  },
  backBtn: {
    backgroundColor: C.lavender,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.bg,
  },
});
