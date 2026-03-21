import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/constants/colors";
import { useT } from "@/context/AppContext";

interface Venue {
  id: string;
  name: string;
  type: string;
  city: string;
  address?: string;
  imageUrl?: string;
  description?: string;
  isVerified?: boolean;
}

interface VenueCardProps {
  venue: Venue;
  onPress?: () => void;
  compact?: boolean;
}

export function VenueCard({ venue, onPress, compact = false }: VenueCardProps) {
  const t = useT();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, compact && styles.compact]}
    >
      {venue.imageUrl ? (
        <Image
          source={{ uri: venue.imageUrl }}
          style={compact ? styles.compactImage : styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[compact ? styles.compactImage : styles.image, styles.placeholder]}>
          <Ionicons name="business" size={compact ? 24 : 32} color={C.lavender} />
        </View>
      )}
      <View style={[styles.info, compact && styles.compactInfo]}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, compact && styles.compactName]} numberOfLines={1}>
            {venue.name}
          </Text>
          {venue.isVerified && (
            <Ionicons name="checkmark-circle" size={14} color={C.lavender} />
          )}
        </View>
        <View style={styles.row}>
          <Ionicons name="business-outline" size={12} color={C.textMuted} />
          <Text style={styles.meta}>{venue.type}</Text>
          <Text style={styles.dot}>·</Text>
          <Ionicons name="location-outline" size={12} color={C.textMuted} />
          <Text style={styles.meta} numberOfLines={1}>{venue.city}</Text>
        </View>
        {!compact && venue.description && (
          <Text style={styles.desc} numberOfLines={2}>{venue.description}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },
  compact: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
  },
  image: {
    width: "100%",
    height: 140,
  },
  compactImage: {
    width: 72,
    height: 72,
  },
  placeholder: {
    backgroundColor: C.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    padding: 12,
    gap: 4,
  },
  compactInfo: {
    flex: 1,
    padding: 10,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
    flex: 1,
  },
  compactName: {
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  meta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  dot: {
    color: C.textMuted,
    fontSize: 12,
  },
  desc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    marginTop: 4,
  },
});
