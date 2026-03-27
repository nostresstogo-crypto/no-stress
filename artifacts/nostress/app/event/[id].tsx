import React, { useRef, useState, useCallback } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
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

import { C as DARK_C } from "@/constants/colors";
import { useT, useApp, useColors } from "@/context/AppContext";
import { MOCK_EVENTS } from "@/constants/data";

const { width: SW, height: SH } = Dimensions.get("window");
const HERO_H = SH * 0.38;
const THUMB_SIZE = 64;

export default function EventDetailScreen() {
  const t = useT();
  const C = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lang, isFavorite, toggleFavorite } = useApp();
  const insets = useSafeAreaInsets();

  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const carouselRef = useRef<FlatList>(null);
  const lightboxRef = useRef<FlatList>(null);

  const event = MOCK_EVENTS.find((e) => e.id === id);
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  if (!event) {
    return (
      <View style={[s.notFound, { backgroundColor: C.bg }]}>
        <Ionicons name="alert-circle-outline" size={48} color={C.border} />
        <Text style={[s.notFoundText, { color: C.textMuted }]}>{t("noData")}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[s.backLink, { color: C.lavender }]}>{t("back")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const gallery: string[] =
    event.gallery && event.gallery.length > 0
      ? event.gallery
      : event.imageUrl
      ? [event.imageUrl]
      : [];

  const title = lang === "fr" && event.titleFr ? event.titleFr : event.title;
  const description =
    lang === "fr" && event.descriptionFr ? event.descriptionFr : event.description;
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

  const price =
    event.price === 0
      ? t("free")
      : `${event.price.toLocaleString()} ${event.currency || "FCFA"}`;

  const scrollCarouselTo = useCallback(
    (idx: number) => {
      setActiveIdx(idx);
      carouselRef.current?.scrollToIndex({ index: idx, animated: true });
    },
    []
  );

  const openLightbox = (idx: number) => {
    setLightboxIdx(idx);
    setLightboxOpen(true);
    setTimeout(() => {
      lightboxRef.current?.scrollToIndex({ index: idx, animated: false });
    }, 50);
  };

  const onCarouselScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
    setActiveIdx(idx);
  };

  const onLightboxScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
    setLightboxIdx(idx);
  };

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      {/* ── Hero Carousel ────────────────────────────────── */}
      <View style={s.heroContainer}>
        <FlatList
          ref={carouselRef}
          data={gallery}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onCarouselScroll}
          scrollEventThrottle={16}
          getItemLayout={(_, i) => ({ length: SW, offset: SW * i, index: i })}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={() => openLightbox(activeIdx)}
              style={{ width: SW, height: HERO_H }}
            >
              <Image
                source={{ uri: item }}
                style={{ width: SW, height: HERO_H }}
                resizeMode="cover"
              />
              <View style={[StyleSheet.absoluteFill, s.heroOverlay]} />
            </TouchableOpacity>
          )}
        />

        {/* Dots */}
        {gallery.length > 1 && (
          <View style={s.dotsRow}>
            {gallery.map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => scrollCarouselTo(i)}
                style={[
                  s.dot,
                  i === activeIdx
                    ? { backgroundColor: DARK_C.gold, width: 18 }
                    : { backgroundColor: "rgba(255,255,255,0.45)", width: 6 },
                ]}
              />
            ))}
          </View>
        )}

        {/* Back + actions */}
        <View
          style={[
            s.heroActions,
            { top: (Platform.OS === "web" ? 67 : insets.top) + 12 },
          ]}
        >
          <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={s.heroRightActions}>
            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => toggleFavorite(event.id)}
            >
              <Ionicons
                name={fav ? "heart" : "heart-outline"}
                size={22}
                color={fav ? "#E05C5C" : "#fff"}
              />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Counter badge */}
        {gallery.length > 1 && (
          <View style={s.counterBadge}>
            <Ionicons name="images-outline" size={12} color="#fff" />
            <Text style={s.counterText}>
              {activeIdx + 1}/{gallery.length}
            </Text>
          </View>
        )}

        {event.isSponsored && (
          <View style={[s.sponsoredBadge, { backgroundColor: DARK_C.gold }]}>
            <Ionicons name="star" size={10} color={DARK_C.bg} />
            <Text style={[s.sponsoredText, { color: DARK_C.bg }]}>
              {t("sponsored")}
            </Text>
          </View>
        )}
      </View>

      {/* ── Scrollable content ────────────────────────────── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: bottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.category, { color: C.lavender }]}>
          {event.category.toUpperCase()}
        </Text>
        <Text style={[s.title, { color: C.text }]}>{title}</Text>

        {/* Info card */}
        <View style={[s.infoCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <InfoRow icon="calendar" text={formattedDate} C={C} />
          {event.time && <InfoRow icon="time" text={event.time} C={C} />}
          <InfoRow icon="location" text={`${event.venue}, ${event.city}`} C={C} />
        </View>

        {/* Description */}
        {description && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: C.text }]}>{t("description")}</Text>
            <Text style={[s.description, { color: C.textMuted }]}>{description}</Text>
          </View>
        )}

        {/* ── Galerie miniatures ────────────────────────── */}
        {gallery.length > 1 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: C.text }]}>
                {lang === "fr" ? "Galerie" : "Gallery"}
              </Text>
              <Text style={[s.sectionCount, { color: C.textMuted }]}>
                {gallery.length} {lang === "fr" ? "photos" : "photos"}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.thumbStrip}
            >
              {gallery.map((uri, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    scrollCarouselTo(i);
                    openLightbox(i);
                  }}
                  style={[
                    s.thumb,
                    i === activeIdx && {
                      borderColor: DARK_C.gold,
                      borderWidth: 2,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri }}
                    style={s.thumbImg}
                    resizeMode="cover"
                  />
                  {i === activeIdx && (
                    <View style={s.thumbActiveDot} />
                  )}
                  {/* Expand icon on hover/tap */}
                  <View style={s.thumbOverlay}>
                    <Ionicons name="expand-outline" size={14} color="#fff" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Location stub */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: C.text }]}>{t("location")}</Text>
          <View style={[s.mapStub, { backgroundColor: C.card, borderColor: C.border }]}>
            <Ionicons name="map" size={32} color={C.lavender} />
            <Text style={[s.mapText, { color: C.text }]}>{event.venue}</Text>
            <Text style={[s.mapAddr, { color: C.textMuted }]}>{event.city}</Text>
            {event.latitude && event.longitude && (
              <Text style={[s.mapCoords, { color: C.textMuted }]}>
                {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
              </Text>
            )}
          </View>
        </View>

        {/* Ticket types */}
        {event.ticketTypes && event.ticketTypes.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: C.text }]}>{t("ticketTypes")}</Text>
            {event.ticketTypes.map((tt) => {
              const ttName = lang === "fr" && tt.nameFr ? tt.nameFr : tt.name;
              const ttPrice =
                tt.price === 0
                  ? t("free")
                  : `${tt.price.toLocaleString()} ${tt.currency || "FCFA"}`;
              return (
                <View
                  key={tt.id}
                  style={[s.ticketTypeRow, { backgroundColor: C.card, borderColor: C.border }]}
                >
                  <View>
                    <Text style={[s.ticketTypeName, { color: C.text }]}>{ttName}</Text>
                    {tt.available !== undefined && (
                      <Text style={[s.ticketTypeAvail, { color: C.textMuted }]}>
                        {tt.available} {lang === "fr" ? "disponibles" : "available"}
                      </Text>
                    )}
                  </View>
                  <Text style={[s.ticketTypePrice, { color: C.gold }]}>{ttPrice}</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── Buy bar ──────────────────────────────────────── */}
      <View
        style={[
          s.buyBar,
          { paddingBottom: bottomInset + 12, backgroundColor: C.card, borderTopColor: C.border },
        ]}
      >
        <View style={s.buyLeft}>
          <Text style={[s.buyFromLabel, { color: C.textMuted }]}>
            {lang === "fr" ? "À partir de" : "From"}
          </Text>
          <Text style={[s.buyPrice, { color: C.gold }]}>{price}</Text>
        </View>
        <TouchableOpacity
          style={[s.buyBtn, { backgroundColor: C.lavender }]}
          onPress={() => router.push(`/ticket/${event.id}`)}
        >
          <Text style={[s.buyBtnText, { color: C.bg }]}>{t("buyTicket")}</Text>
          <Ionicons name="arrow-forward" size={16} color={C.bg} />
        </TouchableOpacity>
      </View>

      {/* ── Fullscreen Lightbox Modal ─────────────────────── */}
      <Modal
        visible={lightboxOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxOpen(false)}
        statusBarTranslucent
        hardwareAccelerated
      >
        <Pressable style={s.lightboxBg} onPress={() => {}} pointerEvents="box-none">
          {/* Close */}
          <TouchableOpacity
            style={[s.lbClose, { top: (Platform.OS === "web" ? 24 : insets.top) + 12 }]}
            onPress={() => setLightboxOpen(false)}
            accessibilityLabel="Fermer la galerie"
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Counter */}
          <View style={[s.lbCounter, { top: (Platform.OS === "web" ? 24 : insets.top) + 16 }]}>
            <Text style={s.lbCounterText}>
              {lightboxIdx + 1} / {gallery.length}
            </Text>
          </View>

          {/* Image list */}
          <FlatList
            ref={lightboxRef}
            data={gallery}
            keyExtractor={(_, i) => String(i)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onLightboxScroll}
            scrollEventThrottle={16}
            getItemLayout={(_, i) => ({ length: SW, offset: SW * i, index: i })}
            renderItem={({ item }) => (
              <View style={s.lbSlide}>
                <Image
                  source={{ uri: item }}
                  style={s.lbImage}
                  resizeMode="contain"
                />
              </View>
            )}
          />

          {/* Prev / Next arrows */}
          {lightboxIdx > 0 && (
            <TouchableOpacity
              style={[s.lbArrow, s.lbArrowLeft]}
              onPress={() => {
                const ni = lightboxIdx - 1;
                setLightboxIdx(ni);
                lightboxRef.current?.scrollToIndex({ index: ni, animated: true });
              }}
            >
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </TouchableOpacity>
          )}
          {lightboxIdx < gallery.length - 1 && (
            <TouchableOpacity
              style={[s.lbArrow, s.lbArrowRight]}
              onPress={() => {
                const ni = lightboxIdx + 1;
                setLightboxIdx(ni);
                lightboxRef.current?.scrollToIndex({ index: ni, animated: true });
              }}
            >
              <Ionicons name="chevron-forward" size={28} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Dot strip at bottom */}
          <View style={[s.lbDots, { bottom: (Platform.OS === "web" ? 34 : insets.bottom) + 20 }]}>
            {gallery.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  setLightboxIdx(i);
                  lightboxRef.current?.scrollToIndex({ index: i, animated: true });
                }}
                style={[
                  s.lbDot,
                  i === lightboxIdx
                    ? { backgroundColor: DARK_C.gold, width: 20 }
                    : { backgroundColor: "rgba(255,255,255,0.4)", width: 7 },
                ]}
              />
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function InfoRow({ icon, text, C }: { icon: string; text: string; C: any }) {
  return (
    <View style={[ir.row, { borderBottomColor: C.border }]}>
      <View style={[ir.iconWrap, { backgroundColor: C.lavender + "22" }]}>
        <Ionicons name={icon as any} size={16} color={C.lavender} />
      </View>
      <Text style={[ir.text, { color: C.text }]}>{text}</Text>
    </View>
  );
}

const ir = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});

const s = StyleSheet.create({
  root: { flex: 1 },

  /* ── Hero ── */
  heroContainer: {
    height: HERO_H,
    position: "relative",
    overflow: "hidden",
  },
  heroOverlay: { backgroundColor: "rgba(14,17,32,0.28)" },
  heroActions: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroRightActions: { flexDirection: "row", gap: 8 },
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
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  sponsoredText: { fontSize: 11, fontFamily: "Inter_700Bold" },

  /* Dots */
  dotsRow: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },

  /* Counter badge */
  counterBadge: {
    position: "absolute",
    bottom: 14,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  counterText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },

  /* ── Content ── */
  scroll: { flex: 1 },
  content: { padding: 20, gap: 16 },
  category: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  infoCard: {
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  section: { gap: 12 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  sectionCount: { fontSize: 13, fontFamily: "Inter_400Regular" },
  description: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },

  /* ── Thumbnails ── */
  thumbStrip: { gap: 8, paddingRight: 4 },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  thumbImg: { width: "100%", height: "100%" },
  thumbActiveDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DARK_C.gold,
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── Map stub ── */
  mapStub: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    minHeight: 120,
    justifyContent: "center",
  },
  mapText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  mapAddr: { fontSize: 13, fontFamily: "Inter_400Regular" },
  mapCoords: { fontSize: 11, fontFamily: "Inter_400Regular" },

  /* ── Tickets ── */
  ticketTypeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  ticketTypeName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  ticketTypeAvail: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  ticketTypePrice: { fontSize: 16, fontFamily: "Inter_700Bold" },

  /* ── Buy bar ── */
  buyBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 16,
  },
  buyLeft: { gap: 2 },
  buyFromLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  buyPrice: { fontSize: 20, fontFamily: "Inter_700Bold" },
  buyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  buyBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  /* ── Not found ── */
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFoundText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  backLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  /* ── Lightbox ── */
  lightboxBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
    justifyContent: "center",
  },
  lbClose: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  lbCounter: {
    position: "absolute",
    left: 20,
    zIndex: 10,
  },
  lbCounterText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  lbSlide: {
    width: SW,
    height: SH,
    alignItems: "center",
    justifyContent: "center",
  },
  lbImage: {
    width: SW,
    height: SH * 0.75,
  },
  lbArrow: {
    position: "absolute",
    top: "50%",
    marginTop: -24,
    zIndex: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  lbArrowLeft: { left: 16 },
  lbArrowRight: { right: 16 },
  lbDots: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  lbDot: {
    height: 7,
    borderRadius: 4,
  },
});
