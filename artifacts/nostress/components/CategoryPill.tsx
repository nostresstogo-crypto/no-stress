import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/constants/colors";
import { useT } from "@/context/AppContext";
import { CategoryKey, CATEGORIES } from "@/constants/data";

interface CategoryPillProps {
  categoryKey: CategoryKey | "";
  selected?: boolean;
  onPress: () => void;
  label?: string;
}

export function CategoryPill({ categoryKey, selected, onPress, label }: CategoryPillProps) {
  const t = useT();
  const cat = CATEGORIES.find((c) => c.key === categoryKey);
  const color = cat?.color || C.lavender;
  const icon = cat?.icon || "apps";
  const text = label ?? (categoryKey ? t(categoryKey as CategoryKey) : t("allEvents"));

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.pill, selected && { backgroundColor: color, borderColor: color }]}
    >
      <Ionicons
        name={icon as any}
        size={14}
        color={selected ? C.bg : color}
      />
      <Text style={[styles.text, selected && { color: C.bg }]}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  text: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: C.text,
  },
});
