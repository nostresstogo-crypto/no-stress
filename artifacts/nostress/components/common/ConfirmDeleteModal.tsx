/**
 * ConfirmDeleteModal — Modal de confirmation avant toute suppression définitive.
 *
 * Utilisation :
 *   <ConfirmDeleteModal
 *     visible={showDelete}
 *     title="Supprimer cet événement ?"
 *     message="Cette action est définitive."
 *     itemName={event.title}
 *     confirmLabel="Supprimer"
 *     loading={deleting}
 *     onConfirm={handleDelete}
 *     onCancel={() => setShowDelete(false)}
 *   />
 *
 * Règles UX appliquées :
 * - Bouton Annuler toujours accessible
 * - Bouton Supprimer en rouge (C.danger)
 * - Désactivé pendant la requête
 * - Ne ferme pas silencieusement en cas d'erreur
 * - Compatible dark + light mode
 */
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/context/AppContext";
import { Fonts, FontSize, LetterSpacing } from "@/constants/typography";

interface Props {
  /** Whether the modal is visible */
  visible: boolean;
  /** Main dialog title, e.g. "Supprimer cet événement ?" */
  title?: string;
  /** Short description of the consequence */
  message?: string;
  /** Name of the item being deleted — shown in bold inside the message */
  itemName?: string | null;
  /** Label for the confirm (destructive) button. Default: "Supprimer" */
  confirmLabel?: string;
  /** Whether the delete request is in-flight */
  loading?: boolean;
  /** Called when the user confirms the deletion */
  onConfirm: () => void;
  /** Called when the user cancels or taps the backdrop */
  onCancel: () => void;
  /** Override danger color (defaults to #E05C5C) */
  dangerColor?: string;
}

export function ConfirmDeleteModal({
  visible,
  title,
  message,
  itemName,
  confirmLabel,
  loading = false,
  onConfirm,
  onCancel,
  dangerColor = "#E05C5C",
}: Props) {
  const C = useColors();

  const safeTitle   = title   ?? "Confirmer la suppression";
  const safeMessage = message ?? "Cette action est définitive et irréversible.";
  const safeConfirm = confirmLabel ?? "Supprimer";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
      accessibilityViewIsModal
    >
      {/* Backdrop */}
      <TouchableOpacity
        activeOpacity={1}
        style={s.backdrop}
        onPress={loading ? undefined : onCancel}
        accessible={false}
      >
        {/* Dialog — stop propagation */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={[s.dialog, { backgroundColor: C.card, borderColor: C.border }]}
        >
          {/* Icon */}
          <View style={[s.iconWrap, { backgroundColor: dangerColor + "18" }]}>
            <Ionicons name="warning-outline" size={28} color={dangerColor} />
          </View>

          {/* Title */}
          <Text
            style={[s.title, { color: C.text }]}
            accessibilityRole="header"
          >
            {safeTitle}
          </Text>

          {/* Item name */}
          {itemName ? (
            <Text style={[s.itemName, { color: C.text }]} numberOfLines={2}>
              « {itemName} »
            </Text>
          ) : null}

          {/* Message */}
          <Text style={[s.message, { color: C.textMuted }]}>{safeMessage}</Text>

          {/* Actions */}
          <View style={s.actions}>
            {/* Cancel — visually dominant (larger, left) */}
            <TouchableOpacity
              style={[s.btn, s.cancelBtn, { borderColor: C.border, backgroundColor: C.card2 }]}
              onPress={onCancel}
              disabled={loading}
              accessibilityLabel="Annuler"
              accessibilityRole="button"
            >
              <Text style={[s.btnText, { color: C.text }]}>
                Annuler
              </Text>
            </TouchableOpacity>

            {/* Confirm — danger color */}
            <TouchableOpacity
              style={[
                s.btn, s.confirmBtn,
                { backgroundColor: dangerColor },
                loading && s.btnDisabled,
              ]}
              onPress={onConfirm}
              disabled={loading}
              accessibilityLabel={`${safeConfirm} — action dangereuse`}
              accessibilityRole="button"
              accessibilityHint="Déclenche une suppression définitive"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[s.btnText, s.confirmText]}>{safeConfirm}</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  dialog: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 22,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 12 },
    }),
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.lg,
    textAlign: "center",
    letterSpacing: LetterSpacing.tight,
  },
  itemName: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSize.base,
    textAlign: "center",
    letterSpacing: LetterSpacing.normal,
  },
  message: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.sm,
    textAlign: "center",
    lineHeight: FontSize.sm * 1.6,
    marginBottom: 6,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 6,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  cancelBtn: {
    borderWidth: 1,
    flex: 1.1, // slightly wider for visual priority
  },
  confirmBtn: {
    flex: 0.9,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSize.base,
  },
  confirmText: {
    color: "#fff",
  },
});
