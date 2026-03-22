import React, { useState, useMemo } from "react";
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { C } from "@/constants/colors";
import { useT, useApp } from "@/context/AppContext";
import { MOCK_VENUES, VENUE_TYPES, MOCK_CITIES } from "@/constants/data";
import { VenueCard } from "@/components/VenueCard";
import { CitySelector } from "@/components/CitySelector";

export default function VenuesScreen() {
  const t = useT();
  const { selectedCity, setSelectedCity } = useApp();
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState("");
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const filteredVenues = useMemo(() => {
    return MOCK_VENUES.filter((v) => {
      const cityObj = MOCK_CITIES.find((c) => c.id === selectedCity);
      const matchCity =
        !selectedCity ||
        v.city.toLowerCase() === selectedCity.toLowerCase() ||
        (cityObj?.name && v.city === cityObj.name);
      const matchType = !selectedType || v.type === selectedType;
      return matchCity && matchType;
    });
  }, [selectedCity, selectedType]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>{t("venues")}</Text>
          <CitySelector value={selectedCity} onChange={setSelectedCity} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          <TouchableOpacity
            style={[styles.filter, selectedType === "" && styles.filterActive]}
            onPress={() => setSelectedType("")}
          >
            <Text style={[styles.filterText, selectedType === "" && styles.filterTextActive]}>
              {t("allTypes")}
            </Text>
          </TouchableOpacity>
          {VENUE_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.filter, selectedType === type && styles.filterActive]}
              onPress={() => setSelectedType(selectedType === type ? "" : type)}
            >
              <Text style={[styles.filterText, selectedType === type && styles.filterTextActive]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredVenues}
        keyExtractor={(v) => v.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Platform.OS === "web" ? 118 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="business-outline" size={48} color={C.border} />
            <Text style={styles.emptyText}>{t("noVenues")}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <VenueCard
            venue={item}
            onPress={() => router.push(`/venue/${item.id}` as any)}
          />
        )}
      />
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
    alignItems: "center",
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  filters: {
    gap: 8,
    paddingBottom: 2,
    paddingRight: 20,
  },
  filter: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  filterActive: {
    backgroundColor: C.lavender,
    borderColor: C.lavender,
  },
  filterText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: C.text,
  },
  filterTextActive: {
    color: C.bg,
    fontFamily: "Inter_600SemiBold",
  },
  list: {
    padding: 20,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
  },
});
