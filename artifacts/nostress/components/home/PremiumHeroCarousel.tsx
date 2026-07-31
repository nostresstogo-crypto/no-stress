/**
 * PremiumHeroCarousel — Carrousel hero immersif pour l'accueil NoStress.
 *
 * Données : reçues via props (popularEvents ou fallback allEvents).
 * Logique API : aucune — le parent gère les fetch.
 * Animations : auto-scroll 5s, pause au swipe, cleanup garanti.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
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
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/context/AppContext";
import { ColorPalette } from "@/constants/colors";
import { Fonts, FontSize, LetterSpacing, headingMedium, caption, bodySmall } from "@/constants/typography";
import { thumbUrl } from "@/lib/imageUrl";
import { formatDateLocalized } from "@/lib/formatDate";
import { safePush } from "@/lib/navigation";

const { width: SCREEN_W } = Dimensions.get("window");

const CARD_MARGIN   = 16;
const CARD_WIDTH    = SCREEN_W - CARD_MARGIN * 2;
const CARD_HEIGHT   = 290;
const BORDER_RADIUS = 22;
const AUTO_INTERVAL = 5000;

export interface CarouselEvent {
  id: string | number;
  title?: string | null;
  titleFr?: string | null;
  category?: string | null;
  date?: string | null;
  time?: string | null;
  venue?: string | null;
  city?: string | null;
  imageUrl?: string | null;
}

interface Props {
  events: CarouselEvent[];
  lang: string;
}

function Dot({ active }: { active: boolean }) {
  const C = useColors();
  return (
    <View
      style={[
        styles.dot,
        active
          ? { width: 22, backgroundColor: "#fff" }
          : { width: 6, backgroundColor: "rgba(255,255,255,0.4)" },
      ]}
    />
  );
}

export function PremiumHeroCarousel({ events, lang }: Props) {
  const C = useColors();
  const [activeIdx, setActiveIdx] = useState(0);
  const listRef = useRef<FlatList>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPausedRef = useRef(false);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    if (events.length <= 1) return;
    timerRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      setActiveIdx((prev) => {
        const next = (prev + 1) % events.length;
        try {
          listRef.current?.scrollToIndex({ index: next, animated: true });
        } catch {}
        return next;
      });
    }, AUTO_INTERVAL);
  }, [events.length, stopTimer]);

  useEffect(() => {
    startTimer();
    return stopTimer;
  }, [startTimer, stopTimer]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setActiveIdx(Math.max(0, Math.min(idx, events.length - 1)));
    isPausedRef.current = false;
    startTimer();
  };

  if (events.length === 0) {
    return (
      <View style={[styles.emptyWrap, { backgroundColor: C.card2 }]}>
        <Ionicons name="images-outline" size={36} color={C.textMuted} />
        <Text style={[styles.emptyText, { color: C.textMuted }]}>
          {lang === "fr" ? "Aucun événement populaire" : "No popular events yet"}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={events}
        keyExtractor={(e) => "hero_" + String(e.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        onScrollBeginDrag={() => { isPausedRef.current = true; stopTimer(); }}
        getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
        decelerationRate="fast"
        snapToInterval={SCREEN_W}
        snapToAlignment="center"
        renderItem={({ item }) => <HeroSlide item={item} lang={lang} C={C} />}
      />

      {/* Dots */}
      {events.length > 1 && (
        <View style={styles.dotsRow} pointerEvents="none">
          {events.map((_, i) => (
            <Dot key={i} active={i === activeIdx} />
          ))}
        </View>
      )}
    </View>
  );
}

function HeroSlide({ item, lang, C }: { item: CarouselEvent; lang: string; C: ColorPalette }) {
  const title = (lang === "fr" ? item.titleFr || item.title : item.title || item.titleFr) ?? "";
  const dateStr = item.date ? formatDateLocalized(item.date, (lang === "fr" ? "fr" : "en"), { short: true }) : "";
  const location = [item.venue, item.city].filter(Boolean).join(" · ");
  const imgUri = thumbUrl(item.imageUrl, Math.round(CARD_WIDTH), CARD_HEIGHT) ?? item.imageUrl ?? null;

  return (
    <Pressable
      style={styles.slideOuter}
      onPress={() => safePush(`/event/${item.id}`)}
      android_ripple={{ color: "rgba(255,255,255,0.08)", borderless: false }}
    >
      <View style={styles.card}>
        {/* Image */}
        {imgUri ? (
          <Image
            source={{ uri: imgUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="disk"
            transition={300}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: C.card2, alignItems: "center", justifyContent: "center" }]}>
            <Ionicons name="musical-notes-outline" size={48} color={C.textMuted} />
          </View>
        )}

        {/* Gradient overlay — gentle, bottom-heavy */}
        <LinearGradient
          colors={["transparent", "rgba(8,6,22,0.55)", "rgba(8,6,22,0.88)"]}
          locations={[0.25, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Category badge — top left */}
        {item.category ? (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
          </View>
        ) : null}

        {/* Content — bottom */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>

          <View style={styles.metaRow}>
            {dateStr ? (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.75)" />
                <Text style={styles.metaText}>{dateStr}</Text>
              </View>
            ) : null}
            {location ? (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.75)" />
                <Text style={styles.metaText} numberOfLines={1}>{location}</Text>
              </View>
            ) : null}
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={styles.cta}
            onPress={() => safePush(`/event/${item.id}`)}
            hitSlop={8}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaText}>{lang === "fr" ? "Voir l'événement" : "View event"}</Text>
            <Ionicons name="arrow-forward" size={12} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { position: "relative" },

  slideOuter: {
    width: SCREEN_W,
    paddingHorizontal: CARD_MARGIN,
  },

  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: BORDER_RADIUS,
    overflow: "hidden",
    backgroundColor: "#1F2447",
  },

  /* Category badge */
  categoryBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    backgroundColor: "rgba(181,168,240,0.25)",
    borderWidth: 1,
    borderColor: "rgba(181,168,240,0.5)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryText: {
    ...caption,
    color: "#fff",
    letterSpacing: LetterSpacing.widest,
  },

  /* Bottom content */
  content: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
    gap: 8,
  },
  title: {
    ...headingMedium,
    color: "#fff",
    letterSpacing: LetterSpacing.tight,
  },
  metaRow: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: {
    ...bodySmall,
    color: "rgba(255,255,255,0.78)",
  },

  /* CTA button */
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 2,
  },
  ctaText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSize.sm,
    color: "#fff",
    letterSpacing: LetterSpacing.wide,
  },

  /* Pagination dots */
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    marginTop: 12,
    marginBottom: 2,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },

  /* Empty state */
  emptyWrap: {
    marginHorizontal: CARD_MARGIN,
    height: CARD_HEIGHT,
    borderRadius: BORDER_RADIUS,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.base,
  },
});
