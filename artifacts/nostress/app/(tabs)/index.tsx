import React, {
  useState, useMemo, useEffect, useCallback, useRef,
} from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { safePush } from "@/lib/navigation";

import { useT, useApp, useColors } from "@/context/AppContext";
import { ColorPalette } from "@/constants/colors";
import { parseDateLocal } from "@/lib/formatDate";
import {
  Fonts, FontSize, LetterSpacing,
} from "@/constants/typography";
import { CategoryPill } from "@/components/CategoryPill";
import { CategoryKey } from "@/constants/data";
import { CitySelector } from "@/components/CitySelector";
import { EventCard } from "@/components/EventCard";
import { VenueCard } from "@/components/VenueCard";
import { PremiumHeroCarousel } from "@/components/home/PremiumHeroCarousel";
import { API_BASE } from "@/lib/apiBase";

// ─── Types ────────────────────────────────────────────────────────────────────
type ApiEvent = {
  id: string | number;
  title: string;
  titleFr?: string;
  description?: string | null;
  descriptionFr?: string | null;
  category?: string | null;
  city?: string | null;
  venue?: string | null;
  date: string;
  time?: string | null;
  imageUrl?: string | null;
  price?: number | null;
  status?: string;
};

type DateRange = "all" | "today" | "week" | "month";
type PriceMode = "all" | "free" | "paid";
type SortKey  = "dateAsc" | "dateDesc" | "priceAsc" | "priceDesc";

const DEFAULT_FILTERS = {
  dateRange: "all" as DateRange,
  priceMode: "all" as PriceMode,
  maxPrice: 50000,
  sort: "dateAsc" as SortKey,
};

const { width: SCREEN_W } = Dimensions.get("window");

// ─── Greeting ─────────────────────────────────────────────────────────────────
function getGreeting(lang: string): string {
  const h = new Date().getHours();
  if (lang === "fr") {
    if (h < 5)  return "Bonne nuit 🌙";
    if (h < 12) return "Bonjour ☀️";
    if (h < 18) return "Bon après-midi 🌤";
    return "Bonsoir ✨";
  }
  if (h < 5)  return "Good night 🌙";
  if (h < 12) return "Good morning ☀️";
  if (h < 18) return "Good afternoon 🌤";
  return "Good evening ✨";
}

// ─── Skeleton placeholder ─────────────────────────────────────────────────────
function SkeletonCard({ C, width = 200, height = 180 }: { C: ColorPalette; width?: number; height?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const bg = anim.interpolate({ inputRange: [0, 1], outputRange: [C.card, C.card2] });
  return (
    <Animated.View style={{ width, height, borderRadius: 18, backgroundColor: bg }} />
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({
  title, seeAllLabel, onSeeAll, icon, C,
}: {
  title: string;
  seeAllLabel?: string;
  onSeeAll?: () => void;
  icon?: React.ReactNode;
  C: ColorPalette;
}) {
  return (
    <View style={sh.row}>
      <View style={sh.titleRow}>
        {icon}
        <Text style={[sh.title, { color: C.text }]}>{title}</Text>
      </View>
      {onSeeAll && seeAllLabel ? (
        <TouchableOpacity onPress={onSeeAll} hitSlop={10}>
          <Text style={[sh.seeAll, { color: C.lavender }]}>{seeAllLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
const sh = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingHorizontal: 20 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: Fonts.bold, fontSize: FontSize.lg, letterSpacing: LetterSpacing.tight },
  seeAll: { fontFamily: Fonts.semiBold, fontSize: FontSize.sm, letterSpacing: LetterSpacing.wide },
});


// ─── Filter chip ──────────────────────────────────────────────────────────────
function Chip({ label, active, onPress, C }: { label: string; active: boolean; onPress: () => void; C: ColorPalette }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[fc.chip, { backgroundColor: active ? C.lavender : C.card, borderColor: active ? C.lavender : C.border }]}
    >
      <Text style={[fc.text, { color: active ? "#fff" : C.text, fontFamily: active ? Fonts.semiBold : Fonts.regular }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
const fc = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  text: { fontSize: FontSize.sm, letterSpacing: LetterSpacing.normal },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const t = useT();
  const C = useColors();
  const { lang, selectedCity, setSelectedCity, selectedCategory, setSelectedCategory, configEventCategories } = useApp();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing]       = useState(false);
  const [loading, setLoading]             = useState(true);
  const [apiEvents, setApiEvents]         = useState<ApiEvent[]>([]);
  const [apiVenues, setApiVenues]         = useState<any[]>([]);
  const [popularEvents, setPopularEvents] = useState<any[]>([]);
  const [popularVenues, setPopularVenues] = useState<any[]>([]);
  const [filterOpen, setFilterOpen]       = useState(false);
  const [filters, setFilters]             = useState(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters]   = useState(DEFAULT_FILTERS);

  // Fade-in animation for sections
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const greeting = useMemo(() => getGreeting(lang), [lang]);

  const loadEvents = useCallback(async () => {
    try {
      const [r, rv, rpe, rpv] = await Promise.all([
        fetch(`${API_BASE}/events`),
        fetch(`${API_BASE}/venues`),
        fetch(`${API_BASE}/events/popular`),
        fetch(`${API_BASE}/venues/popular`),
      ]);
      if (r.ok)   { const d = await r.json();   setApiEvents(Array.isArray(d?.events) ? d.events : []); }
      if (rv.ok)  { const d = await rv.json();  setApiVenues(Array.isArray(d?.venues) ? d.venues : []); }
      if (rpe.ok) { const d = await rpe.json(); setPopularEvents(Array.isArray(d?.events) ? d.events : []); }
      if (rpv.ok) { const d = await rpv.json(); setPopularVenues(Array.isArray(d?.venues) ? d.venues : []); }
    } catch {}
  }, []);

  const initialLoad = useCallback(async () => {
    setLoading(true);
    await loadEvents();
    setLoading(false);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [loadEvents]);

  useEffect(() => { initialLoad(); }, [initialLoad]);

  useFocusEffect(useCallback(() => {
    setApiEvents([]); setApiVenues([]); setPopularEvents([]); setPopularVenues([]);
    fadeAnim.setValue(0);
    initialLoad();
  }, [initialLoad]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEvents().finally(() => setRefreshing(false));
  }, [loadEvents]);

  // Derived data
  const allEvents = useMemo(() => apiEvents.map((e) => ({
    id: String(e.id),
    title: e.title || e.titleFr || "",
    titleFr: e.titleFr || e.title || "",
    category: e.category || "",
    city: e.city || "",
    venue: e.venue || "",
    venueId: undefined as string | undefined,
    date: e.date,
    time: e.time || "",
    description: e.description || e.descriptionFr || "",
    descriptionFr: e.descriptionFr || e.description || "",
    priceFCFA: typeof e.price === "number" ? e.price : 0,
    isFree: !e.price || e.price === 0,
    imageUrl: e.imageUrl || undefined,
    status: "approved" as const,
  })), [apiEvents]);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endToday = new Date(today.getTime() + 86400000);
    const endWeek  = new Date(today.getTime() + 7 * 86400000);
    const endMonth = new Date(today.getTime() + 31 * 86400000);

    return allEvents
      .filter((e) => {
        const ed = parseDateLocal(e.date);
        if (ed && ed < today) return false;
        if ((e as any).status === "cancelled") return false;
        const matchCity = !selectedCity || e.city.toLowerCase() === selectedCity.toLowerCase();
        const matchCat  = !selectedCategory || e.category === selectedCategory;
        let matchDate = true;
        if (filters.dateRange !== "all") {
          const d = parseDateLocal(e.date);
          if (!d) { matchDate = false; }
          else if (filters.dateRange === "today")  matchDate = d >= today && d < endToday;
          else if (filters.dateRange === "week")   matchDate = d >= today && d < endWeek;
          else if (filters.dateRange === "month")  matchDate = d >= today && d < endMonth;
        }
        const free = e.isFree || (e.priceFCFA ?? 0) === 0;
        let matchPrice = true;
        if (filters.priceMode === "free") matchPrice = free;
        else if (filters.priceMode === "paid") matchPrice = !free;
        if (matchPrice && !free) matchPrice = (e.priceFCFA ?? 0) <= filters.maxPrice;
        return matchCity && matchCat && matchDate && matchPrice;
      })
      .sort((a, b) => {
        const da = new Date(a.date).getTime() || 0;
        const db = new Date(b.date).getTime() || 0;
        if (filters.sort === "dateDesc") return db - da;
        if (filters.sort === "priceAsc")  return (a.priceFCFA ?? 0) - (b.priceFCFA ?? 0);
        if (filters.sort === "priceDesc") return (b.priceFCFA ?? 0) - (a.priceFCFA ?? 0);
        return da - db;
      });
  }, [allEvents, selectedCity, selectedCategory, filters]);

  const carouselEvents = useMemo(() => {
    const base = popularEvents.length > 0 ? popularEvents : allEvents.slice(0, 6);
    return base.slice(0, 6);
  }, [popularEvents, allEvents]);

  const upcomingEvents = useMemo(() =>
    [...allEvents]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 8),
    [allEvents]
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.dateRange !== "all") n++;
    if (filters.sort !== "dateAsc") n++;
    return n;
  }, [filters]);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const openFilters  = () => { setDraftFilters(filters); setFilterOpen(true); };
  const applyFilters = () => { setFilters(draftFilters); setFilterOpen(false); };
  const resetFilters = () => setDraftFilters(DEFAULT_FILTERS);

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>

      {/* ── Fixed header ─────────────────────────────────────────────────── */}
      <View style={[s.header, { paddingTop: topInset + 8, backgroundColor: C.bg, borderBottomColor: C.border }]}>

        {/* Row 1: greeting + city + favorites */}
        <View style={s.headerTop}>
          <View style={s.greetingCol}>
            <Text style={[s.greeting, { color: C.textMuted }]}>{greeting}</Text>
            <CitySelector value={selectedCity} onChange={setSelectedCity} />
          </View>
          <TouchableOpacity
            onPress={() => safePush("/favorites")}
            style={[s.favHeaderBtn, { backgroundColor: C.card, borderColor: C.border }]}
            accessibilityLabel={lang === "fr" ? "Mes favoris" : "My favorites"}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Ionicons name="heart-outline" size={20} color={C.lavender} />
          </TouchableOpacity>
        </View>

        {/* Row 2: search bar */}
        <TouchableOpacity
          style={[s.searchBar, { backgroundColor: C.card, borderColor: C.border }]}
          onPress={() => router.push("/search")}
          activeOpacity={0.8}
          accessibilityRole="search"
          accessibilityLabel={lang === "fr" ? "Rechercher" : "Search"}
        >
          <Ionicons name="search-outline" size={18} color={C.textMuted} />
          <Text style={[s.searchText, { color: C.textMuted }]}>
            {lang === "fr" ? "Trouver une sortie, un lieu…" : "Find an event, a place…"}
          </Text>
          <TouchableOpacity
            onPress={openFilters}
            style={[s.filterPill, { backgroundColor: activeFilterCount > 0 ? C.lavender : C.card2, borderColor: activeFilterCount > 0 ? C.lavender : C.border }]}
            hitSlop={8}
            accessibilityLabel={lang === "fr" ? "Filtres" : "Filters"}
          >
            <Ionicons name="options-outline" size={15} color={activeFilterCount > 0 ? "#fff" : C.textMuted} />
            {activeFilterCount > 0 ? (
              <Text style={s.filterCount}>{activeFilterCount}</Text>
            ) : null}
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Row 3: categories */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.catList}
        >
          <CategoryPill categoryKey="" selected={!selectedCategory} onPress={() => setSelectedCategory("")} />
          {configEventCategories.map((cat) => (
            <CategoryPill
              key={cat.key}
              categoryKey={cat.key as CategoryKey}
              selected={selectedCategory === cat.key}
              onPress={() => setSelectedCategory(selectedCategory === cat.key ? "" : cat.key as CategoryKey)}
            />
          ))}
        </ScrollView>
      </View>

      {/* ── Scrollable body ──────────────────────────────────────────────── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: Platform.OS === "web" ? 118 : 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.lavender} />}
      >
        {/* ── Hero Carousel ── */}
        <View style={s.carouselWrap}>
          {loading ? (
            <SkeletonCard C={C} width={SCREEN_W - 32} height={290} />
          ) : (
            <PremiumHeroCarousel events={carouselEvents} lang={lang} />
          )}
        </View>

        <Animated.View style={{ opacity: fadeAnim }}>

          {/* ── À ne pas manquer ── */}
          {(loading || popularEvents.length > 0) && (
            <View style={s.section}>
              <SectionHeader
                title={lang === "fr" ? "À ne pas manquer" : "Not to be missed"}
                seeAllLabel={lang === "fr" ? "Voir tout →" : "See all →"}
                onSeeAll={() => safePush("/all-events")}
                icon={<Ionicons name="flame" size={17} color={C.gold} />}
                C={C}
              />
              {loading ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hList}>
                  {[0, 1, 2].map((i) => <SkeletonCard key={i} C={C} width={260} height={230} />)}
                </ScrollView>
              ) : (
                <FlatList
                  horizontal
                  data={popularEvents.slice(0, 8).map((e: any) => ({
                    id: String(e.id),
                    title: e.title, titleFr: e.titleFr,
                    category: e.category, date: e.date, time: e.time,
                    venue: e.venue, city: e.city, imageUrl: e.imageUrl,
                  }))}
                  keyExtractor={(e) => "pop_" + e.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.hList}
                  renderItem={({ item }) => (
                    <EventCard
                      event={item}
                      variant="horizontal"
                      onPress={() => safePush(`/event/${item.id}`)}
                    />
                  )}
                />
              )}
            </View>
          )}

          {/* ── Prochainement ── */}
          {(loading || upcomingEvents.length > 0) && (
            <View style={s.section}>
              <SectionHeader
                title={lang === "fr" ? "Prochainement" : "Coming soon"}
                seeAllLabel={lang === "fr" ? "Voir tout →" : "See all →"}
                onSeeAll={() => safePush("/all-events")}
                icon={<Ionicons name="calendar-outline" size={16} color={C.lavender} />}
                C={C}
              />
              {loading ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hList}>
                  {[0, 1, 2].map((i) => <SkeletonCard key={i} C={C} width={200} height={190} />)}
                </ScrollView>
              ) : (
                <View style={s.vList}>
                  {upcomingEvents.map((item) => (
                    <EventCard
                      key={"up_" + item.id}
                      event={item}
                      variant="homeCompact"
                      onPress={() => safePush(`/event/${item.id}`)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── Lieux tendance ── */}
          {(loading || popularVenues.length > 0) && (
            <View style={s.section}>
              <SectionHeader
                title={lang === "fr" ? "Lieux tendance" : "Trending venues"}
                seeAllLabel={lang === "fr" ? "Voir tout →" : "See all →"}
                onSeeAll={() => safePush("/(tabs)/venues")}
                icon={<Ionicons name="location" size={16} color={C.gold} />}
                C={C}
              />
              {loading ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hList}>
                  {[0, 1, 2].map((i) => <SkeletonCard key={i} C={C} width={190} height={175} />)}
                </ScrollView>
              ) : (
                <FlatList
                  horizontal
                  data={popularVenues}
                  keyExtractor={(v) => "pv_" + String(v.id)}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.hList}
                  renderItem={({ item }) => (
                    <VenueCard
                      venue={{
                        id: String(item.id),
                        name: item.name || "",
                        type: item.type || "",
                        city: item.city || "",
                        address: item.address,
                        imageUrl: item.imageUrl,
                        blurhash: item.blurhash ?? null,
                        description: item.description,
                        isVerified: !!item.isVerified,
                      }}
                      variant="homePremium"
                      onPress={() => safePush(`/venue/api_${item.id}`)}
                    />
                  )}
                />
              )}
            </View>
          )}

          {/* ── Tous les événements ── */}
          {filteredEvents.length > 0 && (
            <View style={s.section}>
              <SectionHeader
                title={t("allEvents")}
                icon={<View style={[s.dot, { backgroundColor: C.lavender }]} />}
                C={C}
              />
              <View style={s.vList}>
                {filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onPress={() => safePush(`/event/${event.id}`)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* ── Empty state ── */}
          {!loading && filteredEvents.length === 0 && (
            <View style={s.empty}>
              <View style={[s.emptyIconWrap, { backgroundColor: C.card2 }]}>
                <Ionicons name="search-outline" size={32} color={C.textMuted} />
              </View>
              <Text style={[s.emptyTitle, { color: C.text }]}>
                {lang === "fr" ? "Aucun événement trouvé" : "No events found"}
              </Text>
              <Text style={[s.emptyBody, { color: C.textMuted }]}>
                {lang === "fr"
                  ? "Essaie de changer la ville ou les filtres."
                  : "Try changing the city or your filters."}
              </Text>
              {activeFilterCount > 0 && (
                <TouchableOpacity
                  onPress={() => setFilters(DEFAULT_FILTERS)}
                  style={[s.emptyBtn, { backgroundColor: C.lavender }]}
                >
                  <Text style={s.emptyBtnText}>{lang === "fr" ? "Réinitialiser les filtres" : "Reset filters"}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

        </Animated.View>
      </ScrollView>

      {/* ── Filter bottom sheet ───────────────────────────────────────────── */}
      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <TouchableOpacity activeOpacity={1} style={[s.backdrop]} onPress={() => setFilterOpen(false)}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={[s.sheet, { backgroundColor: C.bg, paddingBottom: insets.bottom + 8 }]}
          >
            <View style={[s.handle, { backgroundColor: C.border }]} />
            <Text style={[s.sheetTitle, { color: C.text }]}>
              {lang === "fr" ? "Filtres" : "Filters"}
            </Text>
            <Text style={[s.sheetSub, { color: C.textMuted }]}>
              {lang === "fr" ? "Affinez votre recherche" : "Refine your search"}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[s.sheetLabel, { color: C.text }]}>{lang === "fr" ? "Quand" : "When"}</Text>
              <View style={s.chipRow}>
                {([
                  { key: "all",   fr: "Toutes les dates", en: "All dates" },
                  { key: "today", fr: "Aujourd'hui",       en: "Today" },
                  { key: "week",  fr: "Cette semaine",     en: "This week" },
                  { key: "month", fr: "Ce mois-ci",        en: "This month" },
                ] as const).map((o) => (
                  <Chip
                    key={o.key}
                    label={lang === "fr" ? o.fr : o.en}
                    active={draftFilters.dateRange === o.key}
                    onPress={() => setDraftFilters({ ...draftFilters, dateRange: o.key })}
                    C={C}
                  />
                ))}
              </View>
              <Text style={[s.sheetLabel, { color: C.text }]}>{lang === "fr" ? "Trier par" : "Sort by"}</Text>
              <View style={s.chipRow}>
                {([
                  { key: "dateAsc",  fr: "Date ↑", en: "Date ↑" },
                  { key: "dateDesc", fr: "Date ↓", en: "Date ↓" },
                ] as const).map((o) => (
                  <Chip
                    key={o.key}
                    label={lang === "fr" ? o.fr : o.en}
                    active={draftFilters.sort === o.key}
                    onPress={() => setDraftFilters({ ...draftFilters, sort: o.key })}
                    C={C}
                  />
                ))}
              </View>
            </ScrollView>

            <View style={s.sheetActions}>
              <TouchableOpacity style={[s.btnSec, { borderColor: C.border, backgroundColor: C.card }]} onPress={resetFilters}>
                <Text style={[s.btnSecText, { color: C.text }]}>{lang === "fr" ? "Réinitialiser" : "Reset"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btnPrim, { backgroundColor: C.lavender }]} onPress={applyFilters}>
                <Text style={s.btnPrimText}>{lang === "fr" ? "Appliquer" : "Apply"}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },

  /* Header */
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  greetingCol: { gap: 2 },
  greeting: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.sm,
    letterSpacing: LetterSpacing.wide,
  },
  favHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Search bar */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 12,
  },
  searchText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSize.base,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  filterCount: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.xs,
    color: "#fff",
  },

  /* Categories */
  catList: { gap: 8, paddingBottom: 2, paddingRight: 20 },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 24 },

  /* Carousel */
  carouselWrap: { marginBottom: 28, paddingHorizontal: 0 },

  /* Sections */
  section: { marginBottom: 28 },
  hList: { gap: 12, paddingHorizontal: 20 },
  vList: { paddingHorizontal: 20, gap: 0 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  /* Empty */
  empty: { alignItems: "center", paddingHorizontal: 32, paddingVertical: 48, gap: 12 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontFamily: Fonts.bold, fontSize: FontSize.lg, textAlign: "center", letterSpacing: LetterSpacing.tight },
  emptyBody: { fontFamily: Fonts.regular, fontSize: FontSize.base, textAlign: "center", lineHeight: FontSize.base * 1.55 },
  emptyBtn: { borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, marginTop: 4 },
  emptyBtnText: { fontFamily: Fonts.bold, fontSize: FontSize.base, color: "#fff" },

  /* Filter sheet */
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 16, maxHeight: "85%" },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  sheetTitle: { fontFamily: Fonts.bold, fontSize: FontSize.xl, marginBottom: 2, letterSpacing: LetterSpacing.tight },
  sheetSub: { fontFamily: Fonts.regular, fontSize: FontSize.sm, marginBottom: 20 },
  sheetLabel: { fontFamily: Fonts.semiBold, fontSize: FontSize.xs, letterSpacing: LetterSpacing.widest, textTransform: "uppercase", marginBottom: 10, marginTop: 16 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sheetActions: { flexDirection: "row", gap: 10, paddingTop: 20, paddingBottom: 4, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 20 },
  btnSec: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, alignItems: "center" },
  btnSecText: { fontFamily: Fonts.semiBold, fontSize: FontSize.base },
  btnPrim: { flex: 2, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  btnPrimText: { fontFamily: Fonts.bold, fontSize: FontSize.base, color: "#fff" },
});
