import React, { useState, useMemo } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";

import type { ColorPalette } from "@/constants/colors";
import { useT, useApp, useColors } from "@/context/AppContext";
import { MOCK_EVENTS } from "@/constants/data";

type PaymentMethod = "flooz" | "tmoney" | "mix_yas";

export default function TicketScreen() {
  const t = useT();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { lang, addNotification } = useApp();
  const insets = useSafeAreaInsets();

  const event = MOCK_EVENTS.find((e) => e.id === eventId);
  const [selectedTicketType, setSelectedTicketType] = useState<string | null>(
    event?.ticketTypes?.[0]?.id ?? null
  );
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("flooz");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!event) {
    return (
      <View style={styles.root}>
        <Text style={styles.notFound}>{t("noData")}</Text>
      </View>
    );
  }

  const title = lang === "fr" && event.titleFr ? event.titleFr : event.title;
  const selectedTT = event.ticketTypes?.find((tt) => tt.id === selectedTicketType);
  const total = (selectedTT?.price ?? 0) * quantity;

  const handlePurchase = async () => {
    if (!phone) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setSuccess(true);
    addNotification({
      title: "Ticket purchased!",
      titleFr: "Billet acheté!",
      body: `Your ticket for ${event.title} is confirmed.`,
      bodyFr: `Votre billet pour ${event.titleFr || event.title} est confirmé.`,
    });
    setTimeout(() => {
      router.back();
      router.back();
    }, 2500);
  };

  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  if (success) {
    return (
      <View style={styles.successScreen}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={48} color={C.bg} />
        </View>
        <Text style={styles.successTitle}>{t("paymentSuccess")}</Text>
        <Text style={styles.successSub}>{title}</Text>
        <Text style={styles.successInfo}>
          {selectedTT ? (lang === "fr" && selectedTT.nameFr ? selectedTT.nameFr : selectedTT.name) : ""} x{quantity}
        </Text>
        <Text style={styles.successTotal}>
          {total === 0 ? t("free") : `${total.toLocaleString()} ${event.currency || "FCFA"}`}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("selectTickets")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Event info */}
        <View style={styles.eventCard}>
          <Text style={styles.eventTitle}>{title}</Text>
          <Text style={styles.eventMeta}>{event.date} · {event.venue}</Text>
        </View>

        {/* Ticket types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("ticketTypes")}</Text>
          {event.ticketTypes?.map((tt) => {
            const ttName = lang === "fr" && tt.nameFr ? tt.nameFr : tt.name;
            const ttPrice = tt.price === 0 ? t("free") : `${tt.price.toLocaleString()} ${tt.currency || "FCFA"}`;
            const selected = tt.id === selectedTicketType;
            return (
              <TouchableOpacity
                key={tt.id}
                style={[styles.ttCard, selected && styles.ttCardSelected]}
                onPress={() => setSelectedTicketType(tt.id)}
              >
                <View style={[styles.ttRadio, selected && styles.ttRadioSelected]}>
                  {selected && <View style={styles.ttRadioDot} />}
                </View>
                <View style={styles.ttInfo}>
                  <Text style={[styles.ttName, selected && { color: C.lavender }]}>{ttName}</Text>
                  {tt.description && <Text style={styles.ttDesc}>{tt.description}</Text>}
                </View>
                {/* Ticket price hidden by product decision. */}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quantity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("quantity")}</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Ionicons name="remove" size={20} color={C.text} />
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{quantity}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity(Math.min(10, quantity + 1))}
            >
              <Ionicons name="add" size={20} color={C.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("paymentMethod")}</Text>
          <View style={styles.paymentMethods}>
            {([
              { key: "flooz", label: "Flooz", color: "#FF6B00", icon: "phone-portrait" },
              { key: "tmoney", label: "T-Money", color: "#00B4D8", icon: "phone-portrait" },
              { key: "mix_yas", label: "MIX by YAS", color: "#7B2FBE", icon: "phone-portrait" },
            ] as const).map((pm) => {
              const sel = paymentMethod === pm.key;
              return (
                <TouchableOpacity
                  key={pm.key}
                  style={[styles.pmCard, sel && { borderColor: pm.color, borderWidth: 2 }]}
                  onPress={() => setPaymentMethod(pm.key)}
                >
                  <View style={[styles.pmIcon, { backgroundColor: pm.color + "22" }]}>
                    <Ionicons name="phone-portrait" size={20} color={pm.color} />
                  </View>
                  <Text style={[styles.pmLabel, sel && { color: pm.color }]}>{pm.label}</Text>
                  {sel && <Ionicons name="checkmark-circle" size={16} color={pm.color} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Phone number */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("phoneNumber")}</Text>
          <View style={styles.phoneInput}>
            <Ionicons name="call-outline" size={18} color={C.textMuted} />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder={t("enterPhone")}
              placeholderTextColor={C.textMuted}
              style={styles.phoneField}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t("total")}</Text>
          <Text style={styles.totalValue}>
            {total === 0 ? t("free") : `${total.toLocaleString()} ${event.currency || "FCFA"}`}
          </Text>
        </View>
      </ScrollView>

      {/* Confirm button */}
      <View style={[styles.footer, { paddingBottom: bottomInset + 12 }]}>
        <TouchableOpacity
          style={[styles.confirmBtn, (!phone || loading) && { opacity: 0.6 }]}
          onPress={handlePurchase}
          disabled={!phone || loading}
        >
          {loading ? (
            <Text style={styles.confirmBtnText}>{t("processing")}</Text>
          ) : (
            <>
              <Ionicons name="ticket-outline" size={18} color={C.bg} />
              <Text style={styles.confirmBtnText}>
                {t("confirm")} · {total === 0 ? t("free") : `${total.toLocaleString()} FCFA`}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  content: { padding: 20, gap: 24 },
  eventCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 4,
  },
  eventTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  eventMeta: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  ttCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  ttCardSelected: {
    borderColor: C.lavender,
    backgroundColor: C.lavender + "11",
  },
  ttRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  ttRadioSelected: {
    borderColor: C.lavender,
  },
  ttRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.lavender,
  },
  ttInfo: { flex: 1, gap: 2 },
  ttName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  ttDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  ttPrice: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: C.gold,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    alignSelf: "flex-start",
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  qtyBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.card2,
  },
  qtyValue: {
    paddingHorizontal: 24,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  paymentMethods: {
    gap: 10,
  },
  pmCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  pmIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  pmLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  phoneInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  phoneField: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: C.text,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.card2,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  totalValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: C.gold,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  confirmBtn: {
    backgroundColor: C.lavender,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  confirmBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: C.bg,
  },
  successScreen: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 16,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: C.success,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: C.text,
    textAlign: "center",
  },
  successSub: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
    textAlign: "center",
  },
  successInfo: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  successTotal: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: C.gold,
  },
  notFound: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
    textAlign: "center",
    marginTop: 40,
  },
});
