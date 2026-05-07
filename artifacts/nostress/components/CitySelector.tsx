import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ColorPalette } from "@/constants/colors";
import { useT, useColors } from "@/context/AppContext";
import { MOCK_CITIES } from "@/constants/data";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CitySelectorProps {
  value: string;
  onChange: (city: string) => void;
}

export function CitySelector({ value, onChange }: CitySelectorProps) {
  const t = useT();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const cities = MOCK_CITIES;
  const hasCity = !!value;

  return (
    <>
      <TouchableOpacity
        style={[styles.selector, hasCity && { borderColor: C.lavender, backgroundColor: C.lavender + "18" }]}
        onPress={() => setOpen(true)}
      >
        <Ionicons name="location" size={16} color={hasCity ? C.lavender : C.gold} />
        <Text style={[styles.label, hasCity && { color: C.lavender }]}>Villes</Text>
        {hasCity && <View style={[styles.activeDot, { backgroundColor: C.lavender }]} />}
        <Ionicons name="chevron-down" size={14} color={hasCity ? C.lavender : C.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Villes</Text>
          <FlatList
            data={[{ id: "", name: t("allCities"), country: "" }, ...cities]}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.cityItem, item.id === value && styles.selectedCity]}
                onPress={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
              >
                <Text style={[styles.cityName, item.id === value && { color: C.lavender }]}>
                  {item.name}
                </Text>
                {item.country ? (
                  <Text style={styles.cityCountry}>{item.country}</Text>
                ) : null}
                {item.id === value && (
                  <Ionicons name="checkmark" size={18} color={C.lavender} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

const makeStyles = (C: ColorPalette) =>
  StyleSheet.create({
    selector: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: C.card,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.border,
    },
    label: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
    },
    activeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 2,
    },
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
    },
    sheet: {
      backgroundColor: C.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 12,
      maxHeight: "60%",
    },
    handle: {
      width: 36,
      height: 4,
      backgroundColor: C.border,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 16,
    },
    sheetTitle: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: C.text,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    cityItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      gap: 8,
    },
    selectedCity: {
      backgroundColor: C.card2,
    },
    cityName: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: C.text,
      flex: 1,
    },
    cityCountry: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: C.textMuted,
    },
  });
