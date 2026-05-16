import React, { useState, useCallback } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/context/AppContext";
import { API_BASE } from "@/lib/apiBase";

type Props = {
  visible: boolean;
  onClose: () => void;
  itemType: "event" | "venue";
  itemId: number;
  lang: string;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onSuccess: () => void;
  bottomInset?: number;
};

export default function ReviewModal({
  visible,
  onClose,
  itemType,
  itemId,
  lang,
  authFetch,
  onSuccess,
  bottomInset = 0,
}: Props) {
  const C = useColors();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setRating(0);
    setComment("");
    setError(null);
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (!rating || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await authFetch(`${API_BASE}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType,
          itemId,
          rating,
          comment: comment.trim() || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data?.error || (lang === "fr" ? "Erreur lors de l'envoi." : "Error submitting."));
      } else {
        setRating(0);
        setComment("");
        setError(null);
        onSuccess();
        onClose();
      }
    } catch {
      setError(lang === "fr" ? "Erreur réseau." : "Network error.");
    } finally {
      setSubmitting(false);
    }
  }, [rating, comment, submitting, authFetch, itemType, itemId, lang, onSuccess, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}
          onPress={handleClose}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: C.bg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: bottomInset + 24,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ color: C.text, fontFamily: "Inter_700Bold", fontSize: 18 }}>
                {lang === "fr" ? "Laisser un avis" : "Leave a review"}
              </Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: C.textMuted, fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 10 }}>
              {lang === "fr" ? "Votre note" : "Your rating"}
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setRating(n)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Ionicons
                    name={n <= rating ? "star" : "star-outline"}
                    size={36}
                    color="#F59E0B"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ color: C.textMuted, fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 8 }}>
              {lang === "fr" ? "Commentaire (optionnel)" : "Comment (optional)"}
            </Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder={lang === "fr" ? "Partagez votre expérience..." : "Share your experience..."}
              placeholderTextColor={C.textMuted}
              multiline
              maxLength={500}
              style={{
                backgroundColor: C.card,
                borderColor: C.border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                color: C.text,
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                minHeight: 90,
                textAlignVertical: "top",
                marginBottom: 4,
              }}
            />
            <Text style={{ color: C.textMuted, fontSize: 11, textAlign: "right", marginBottom: 16 }}>
              {comment.length}/500
            </Text>

            {error ? (
              <Text style={{ color: "#E05C5C", fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 12 }}>
                {error}
              </Text>
            ) : null}

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={handleClose}
                style={{
                  flex: 1,
                  backgroundColor: C.card,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              >
                <Text style={{ color: C.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                  {lang === "fr" ? "Annuler" : "Cancel"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!rating || submitting}
                style={{
                  flex: 2,
                  backgroundColor: rating ? C.lavender : C.border,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                  {submitting
                    ? (lang === "fr" ? "Envoi..." : "Sending...")
                    : (lang === "fr" ? "Envoyer" : "Submit")}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
