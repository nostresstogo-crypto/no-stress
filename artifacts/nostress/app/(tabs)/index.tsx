import React, { useState, useMemo } from "react";
import {
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { C } from "@/constants/colors";
import { useT, useApp } from "@/context/AppContext";
import { CATEGORIES, MOCK_EVENTS, MOCK_VENUES } from "@/constants/data";
import { CategoryPill } from "@/components/CategoryPill";
import { CitySelector } from "@/components/CitySelector";
import { EventCard } from "@/components/EventCard";
import { VenueCard } from "@/components/VenueCard";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const t = useT();
  const { lang, selectedCity, setSelectedCity, selectedCategory, setSelectedCategory } = useApp();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const filteredEvents = useMemo(() => {
    return MOCK_EVENTS.filter((e) => {
      const matchCity = !selectedCity || e.city.toLowerCase() === selectedCity.toLowerCase() ||
        MOCK_VENUES.find((v) => v.id === e.venueId)?.city.toLowerCase().includes(selectedCity.toLowerCase());
      const matchCat = !selectedCategory || e.category === selectedCategory;
      const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) ||
        (e.titleFr && e.titleFr.toLowerCase().includes(search.toLowerCase()));
      return matchCity && matchCat && matchSearch;
    });
  }, [selectedCity, selectedCategory, search]);

  const featuredEvents = filteredEvents.filter((e) => e.isSponsored);
  const allEvents = filteredEvents.filter((e) => !e.isSponsored);
  const popularVenues = MOCK_VENUES.filter((v) => v.isVerified).slice(0, 4);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerGreet}>{t("discover")}</Text>
            <Text style={styles.headerSub}>NoStress</Text>
          </View>
          <CitySelector value={selectedCity} onChange={setSelectedCity} />
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={C.textMuted} style={styles.searchIcon} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t("searchPlaceholder")}
            placeholderTextColor={C.textMuted}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categories}
        >
          <CategoryPill
            categoryKey=""
            selected={selectedCategory === ""}
            onPress={() => setSelectedCategory("")}
          />
          {CATEGORIES.map((cat) => (
            <CategoryPill
              key={cat.key}
              categoryKey={cat.key}
              selected={selectedCategory === cat.key}
              onPress={() =>
                setSelectedCategory(selectedCategory === cat.key ? "" : cat.key)
              }
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === "web" ? 118 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.lavender}
          />
        }
      >
        {/* Featured / Sponsored Events */}
        {featuredEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.goldDot} />
                <Text style={styles.sectionTitle}>{t("upcomingEvents")}</Text>
              </View>
            </View>
            <FlatList
              horizontal
              data={featuredEvents}
              keyExtractor={(e) => e.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => (
                <EventCard
                  event={item}
                  horizontal
                  onPress={() => router.push(`/event/${item.id}`)}
                />
              )}
            />
          </View>
        )}

        {/* All Events */}
        {allEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.goldDot, { backgroundColor: C.lavender }]} />
                <Text style={styles.sectionTitle}>{t("allEvents")}</Text>
              </View>
              <Text style={styles.countText}>{filteredEvents.length}</Text>
            </View>
            {allEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => router.push(`/event/${event.id}`)}
              />
            ))}
          </View>
        )}

        {/* No results */}
        {filteredEvents.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="search" size={48} color={C.border} />
            <Text style={styles.emptyText}>{t("noEvents")}</Text>
          </View>
        )}

        {/* Popular Venues */}
        {popularVenues.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.goldDot, { backgroundColor: C.gold }]} />
                <Text style={styles.sectionTitle}>{t("popularVenues")}</Text>
              </View>
            </View>
            {popularVenues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} compact />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    backgroundColor: C.bg,
    paddingHorizontal: 20,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 14,
  },
  headerGreet: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  headerSub: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: C.text,
    letterSpacing: -0.5,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
    gap: 8,
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.text,
  },
  categories: {
    gap: 8,
    paddingBottom: 2,
    paddingRight: 20,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  goldDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.gold,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  countText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
  },
  horizontalList: {
    gap: 12,
    paddingRight: 4,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
  },
});
