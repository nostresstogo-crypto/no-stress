import React, { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
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
import { useLocalSearchParams, router } from "expo-router";
import { safePush } from "@/lib/navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT, useApp, useColors } from "@/context/AppContext";
import { EventCard } from "@/components/EventCard";
import { ColorPalette } from "@/constants/colors";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

interface PartnerPublic {
  id: string;
  businessName: string;
  businessType: string;
  city: string;
  description: string | null;
  websiteUrl: string | null;
  phone: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
}

interface PartnerEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  venue?: string;
  city: string;
  category: string;
  imageUrl?: string;
  price: number;
  isSponsored?: boolean;
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    headerBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 12,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
    },
    hero: {
      backgroundColor: C.card,
      borderRadius: 20,
      marginHorizontal: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: C.border,
      gap: 12,
    },
    avatarBig: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: C.lavender,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { fontSize: 28, fontFamily: "Inter_700Bold", color: C.bg },
    name: { fontSize: 22, fontFamily: "Inter_700Bold", color: C.text },
    type: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.lavender, textTransform: "uppercase", letterSpacing: 0.5 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
    meta: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textMuted },
    desc: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.text, lineHeight: 20, marginTop: 8 },
    actions: { flexDirection: "row", gap: 10, marginTop: 12 },
    actionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: C.card2,
      borderWidth: 1,
      borderColor: C.border,
    },
    actionBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.text },
    section: { paddingHorizontal: 16, marginTop: 24 },
    sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 12 },
    empty: {
      alignItems: "center",
      paddingVertical: 40,
      gap: 12,
    },
    emptyText: { fontSize: 14, fontFamily: "Inter_500Medium", color: C.textMuted },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  });
}

export default function PartnerPublicPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const C = useColors();
  const { lang } = useApp();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [partner, setPartner] = useState<PartnerPublic | null>(null);
  const [events, setEvents] = useState<PartnerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API_BASE}/partners/${id}/public`)
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.error || "Partenaire introuvable");
        }
        return r.json();
      })
      .then((data) => {
        setPartner(data.partner);
        setEvents(data.events || []);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator size="large" color={C.lavender} />
        <Text style={styles.meta}>{t("loading")}</Text>
      </View>
    );
  }

  if (error || !partner) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Ionicons name="alert-circle-outline" size={48} color={C.error} />
        <Text style={[styles.meta, { color: C.error, textAlign: "center" }]}>
          {error || (lang === "fr" ? "Partenaire introuvable" : "Partner not found")}
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: topInset + 8, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.hero}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={styles.avatarBig}>
            <Text style={styles.avatarText}>{partner.businessName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.type}>{partner.businessType}</Text>
            <Text style={styles.name}>{partner.businessName}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={C.textMuted} />
              <Text style={styles.meta}>{partner.city}</Text>
            </View>
          </View>
        </View>

        {partner.description ? (
          <Text style={styles.desc}>{partner.description}</Text>
        ) : null}

        <View style={styles.actions}>
          {partner.phone ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Linking.openURL(`tel:${partner.phone}`).catch(() => {})}
            >
              <Ionicons name="call-outline" size={16} color={C.lavender} />
              <Text style={styles.actionBtnText}>{lang === "fr" ? "Appeler" : "Call"}</Text>
            </TouchableOpacity>
          ) : null}
          {partner.websiteUrl ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Linking.openURL(partner.websiteUrl!).catch(() => {})}
            >
              <Ionicons name="globe-outline" size={16} color={C.lavender} />
              <Text style={styles.actionBtnText}>{lang === "fr" ? "Site web" : "Website"}</Text>
            </TouchableOpacity>
          ) : null}
          {partner.phone ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Linking.openURL(`https://wa.me/${partner.phone.replace(/[^0-9]/g, "")}`).catch(() => {})}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
              <Text style={styles.actionBtnText}>WhatsApp</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {lang === "fr" ? "Événements à venir" : "Upcoming events"}
        </Text>
        {events.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={40} color={C.border} />
            <Text style={styles.emptyText}>{t("noEvents")}</Text>
          </View>
        ) : (
          events.map((e) => (
            <EventCard
              key={e.id}
              event={{
                id: e.id,
                title: e.title,
                date: e.date,
                time: e.time,
                venue: e.venue || partner.businessName,
                city: e.city || partner.city,
                category: e.category || "event",
                imageUrl: e.imageUrl,
                price: e.price ?? 0,
                isSponsored: e.isSponsored,
              }}
              onPress={() => safePush(`/event/${e.id}`)}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}
