import React from "react";
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useApp, useColors } from "@/context/AppContext";
import {
  PRIVACY_FR,
  PRIVACY_EN,
  LAST_UPDATED_FR,
  LAST_UPDATED_EN,
  CONTACT,
} from "@workspace/legal-content";

export default function PrivacyScreen() {
  const { lang } = useApp();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const isFr = lang === "fr";

  const styles = makeStyles(C);

  const sections = isFr ? PRIVACY_FR : PRIVACY_EN;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isFr ? "Confidentialité" : "Privacy"}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>
          {isFr ? "Politique de Confidentialité" : "Privacy Policy"}
        </Text>
        <Text style={styles.updated}>
          {isFr ? LAST_UPDATED_FR : LAST_UPDATED_EN}
        </Text>

        {sections.map((s, i) => (
          <View key={i} style={{ marginBottom: 18 }}>
            <Text style={styles.h2}>{s.title}</Text>
            {(s.paragraphs || []).map((p, j) => (
              <Text key={j} style={styles.p}>{p}</Text>
            ))}
            {s.bullets && s.bullets.map((b, j) => (
              <View key={j} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>{isFr ? "Contact" : "Contact"}</Text>
          <TouchableOpacity onPress={() => Linking.openURL(`mailto:${CONTACT.email}`)}>
            <Text style={styles.contactLink}>{CONTACT.email}</Text>
          </TouchableOpacity>
          <Text style={styles.contactMeta}>WhatsApp : {CONTACT.whatsapp}</Text>
          <Text style={styles.contactMeta}>{isFr ? `Adresse : ${CONTACT.address}` : `Address: ${CONTACT.address}`}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: C.text,
    textAlign: "center",
  },
  h1: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: C.lavender,
    marginTop: 8,
    marginBottom: 4,
  },
  updated: {
    fontSize: 12,
    color: C.textMuted,
    marginBottom: 20,
    fontFamily: "Inter_400Regular",
  },
  h2: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: C.text,
    marginTop: 12,
    marginBottom: 8,
  },
  p: {
    fontSize: 14,
    lineHeight: 21,
    color: C.textMuted,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: "row",
    paddingLeft: 4,
    marginBottom: 6,
  },
  bulletDot: {
    width: 16,
    color: C.lavender,
    fontSize: 14,
    lineHeight: 21,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: C.textMuted,
    fontFamily: "Inter_400Regular",
  },
  contactCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  contactTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: C.text,
    marginBottom: 10,
  },
  contactLink: {
    fontSize: 14,
    color: C.lavender,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
  },
  contactMeta: {
    fontSize: 13,
    color: C.textMuted,
    marginBottom: 4,
    fontFamily: "Inter_400Regular",
  },
});
