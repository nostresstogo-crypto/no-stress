import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp, useColors } from "@/context/AppContext";
import { API_BASE } from "@/lib/apiBase";
import { router } from "expo-router";

type Props = {
  itemType: "event" | "venue";
  itemId: string | number;
  variant?: "icon" | "text";
};

export default function ReportButton({ itemType, itemId, variant = "icon" }: Props) {
  const { user, token, authFetch, lang } = useApp();
  const C = useColors();
  const isFr = lang === "fr";
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const numericId = (() => {
    const s = String(itemId);
    const m = s.startsWith("api_") ? s.slice(4) : s;
    const n = parseInt(m, 10);
    return Number.isFinite(n) ? n : null;
  })();

  const onPress = () => {
    if (!user || !token) {
      Alert.alert(
        isFr ? "Connexion requise" : "Login required",
        isFr ? "Connectez-vous pour signaler ce contenu." : "Please log in to report this content.",
        [
          { text: isFr ? "Annuler" : "Cancel", style: "cancel" },
          { text: isFr ? "Se connecter" : "Log in", onPress: () => router.push("/auth") },
        ],
      );
      return;
    }
    if (!numericId) {
      Alert.alert(isFr ? "Contenu non signalable" : "Cannot report this item");
      return;
    }
    setReason("");
    setError("");
    setOpen(true);
  };

  const submit = async () => {
    setError("");
    const r = reason.trim();
    if (r.length < 5) {
      setError(isFr ? "Donnez au moins quelques mots de contexte." : "Please give a few words of context.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch(`${API_BASE}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, itemId: numericId, reason: r }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || (isFr ? "Erreur lors de l'envoi." : "Submit error."));
        return;
      }
      setOpen(false);
      Alert.alert(
        isFr ? "Signalement envoyé" : "Report sent",
        isFr ? "Merci, notre équipe va l'examiner." : "Thanks, our team will review it.",
      );
    } catch {
      setError(isFr ? "Erreur réseau." : "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {variant === "icon" ? (
        <TouchableOpacity onPress={onPress} style={styles.iconBtn} accessibilityLabel={isFr ? "Signaler" : "Report"}>
          <Ionicons name="flag-outline" size={22} color="#fff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={onPress} style={[styles.textBtn, { borderColor: C.error }]}>
          <Ionicons name="flag-outline" size={14} color={C.error} />
          <Text style={[styles.textBtnLabel, { color: C.error }]}>{isFr ? "Signaler" : "Report"}</Text>
        </TouchableOpacity>
      )}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => !submitting && setOpen(false)}>
          <Pressable
            style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.titleRow}>
              <Ionicons name="flag" size={20} color={C.error} />
              <Text style={[styles.title, { color: C.text }]}>
                {isFr ? "Signaler ce contenu" : "Report this content"}
              </Text>
            </View>
            <Text style={[styles.hint, { color: C.textMuted }]}>
              {isFr
                ? "Indiquez ce qui pose problème (contenu inapproprié, fausse info, doublon...)."
                : "Tell us what's wrong (inappropriate content, false info, duplicate...)."}
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder={isFr ? "Décrivez le problème" : "Describe the issue"}
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={4}
              maxLength={1000}
              style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
            />
            {!!error && <Text style={[styles.error, { color: C.error }]}>{error}</Text>}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: C.border }]}
                onPress={() => setOpen(false)}
                disabled={submitting}
              >
                <Text style={[styles.btnLabel, { color: C.text }]}>
                  {isFr ? "Annuler" : "Cancel"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: C.error, opacity: submitting ? 0.6 : 1 }]}
                onPress={submit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.btnLabel, { color: "#fff" }]}>
                    {isFr ? "Envoyer" : "Submit"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  textBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  textBtnLabel: { fontSize: 13, fontWeight: "600" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: 24 },
  card: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "700" },
  hint: { fontSize: 13, lineHeight: 19 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 100,
    textAlignVertical: "top",
    fontSize: 14,
  },
  error: { fontSize: 13 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 4 },
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, minWidth: 100, alignItems: "center" },
  btnLabel: { fontSize: 14, fontWeight: "600" },
});
