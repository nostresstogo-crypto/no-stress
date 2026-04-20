import React, { useState, useRef, useEffect } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { C } from "@/constants/colors";
import { useT, useApp } from "@/context/AppContext";
import { CATEGORIES, MOCK_CITIES, MOCK_VENUES, CategoryKey } from "@/constants/data";
import type { MyEvent } from "@/context/AppContext";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

async function uploadImageToBackend(uri: string): Promise<string> {
  const lowerUri = uri.toLowerCase();
  const contentType = lowerUri.endsWith(".png")
    ? "image/png"
    : lowerUri.endsWith(".webp")
    ? "image/webp"
    : "image/jpeg";
  const name = uri.split("/").pop() || "upload.jpg";

  const fileResp = await fetch(uri);
  const blob = await fileResp.blob();
  const size = (blob as any).size || 0;

  const presignResp = await fetch(`${API_BASE}/storage/uploads/request-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, size, contentType }),
  });
  if (!presignResp.ok) {
    const err = await presignResp.json().catch(() => ({}));
    throw new Error(err.error || "Échec de la préparation de l'upload");
  }
  const { uploadURL, objectPath } = await presignResp.json();
  const putResp = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!putResp.ok) {
    throw new Error("Échec de l'envoi du fichier (HTTP " + putResp.status + ")");
  }
  return `${API_BASE}/storage${objectPath}`;
}

type FormData = {
  titleFr: string;
  titleEn: string;
  category: CategoryKey | "";
  city: string;
  venue: string;
  date: string;
  time: string;
  descriptionFr: string;
  descriptionEn: string;
  priceFCFA: string;
  isFree: boolean;
  isSponsored: boolean;
  imageUrl: string;
};

type FieldErrors = Partial<Record<keyof FormData, string>>;

const INITIAL_FORM: FormData = {
  titleFr: "",
  titleEn: "",
  category: "",
  city: "",
  venue: "",
  date: "",
  time: "",
  descriptionFr: "",
  descriptionEn: "",
  priceFCFA: "",
  isFree: false,
  isSponsored: false,
  imageUrl: "",
};

export default function CreateEventScreen() {
  const t = useT();
  const { lang, addMyEvent, updateMyEvent, user } = useApp();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ editId?: string; localId?: string }>();
  const editId = typeof params.editId === "string" ? params.editId : undefined;
  const localId = typeof params.localId === "string" ? params.localId : undefined;
  const isEdit = !!editId;
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEdit);
  const [apiVenues, setApiVenues] = useState<Array<{ id: string; name: string; city?: string | null }>>([]);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!isEdit || !editId) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/events/${editId}`);
        if (!r.ok) throw new Error("not found");
        const ev = await r.json();
        if (cancelled) return;
        setForm({
          titleFr: ev.title || "",
          titleEn: ev.title || "",
          category: (ev.category as CategoryKey) || "",
          city: ev.city || "",
          venue: ev.venue || "",
          date: ev.date || "",
          time: ev.time || "",
          descriptionFr: ev.description || "",
          descriptionEn: ev.description || "",
          priceFCFA: ev.price != null ? String(ev.price) : "",
          isFree: !ev.price || Number(ev.price) === 0,
          isSponsored: false,
          imageUrl: ev.imageUrl || "",
        });
      } catch {
        Alert.alert(
          lang === "fr" ? "Erreur" : "Error",
          lang === "fr" ? "Impossible de charger cet événement." : "Could not load this event.",
        );
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isEdit, editId, lang]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/venues`);
        if (!r.ok) return;
        const data = await r.json();
        if (cancelled) return;
        const list = Array.isArray(data?.venues) ? data.venues : [];
        setApiVenues(list.map((v: any) => ({ id: String(v.id), name: v.name || "", city: v.city || null })));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const newErrors: FieldErrors = {};
    if (!form.titleFr.trim()) newErrors.titleFr = t("requiredField");
    if (!form.category) newErrors.category = t("requiredField");
    if (!form.city) newErrors.city = t("requiredField");
    if (!form.date.trim()) newErrors.date = t("requiredField");
    if (!form.time.trim()) newErrors.time = t("requiredField");
    if (!form.isFree && !form.priceFCFA.trim()) newErrors.priceFCFA = t("requiredField");
    if (!form.descriptionFr.trim()) newErrors.descriptionFr = t("requiredField");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setSubmitting(true);
    try {
      let finalImageUrl = form.imageUrl.trim();
      if (finalImageUrl && (finalImageUrl.startsWith("file:") || finalImageUrl.startsWith("content:") || finalImageUrl.startsWith("ph:") || finalImageUrl.startsWith("/"))) {
        try {
          finalImageUrl = await uploadImageToBackend(finalImageUrl);
        } catch (uploadErr: any) {
          console.warn("Image upload failed, continuing without image:", uploadErr?.message);
          finalImageUrl = "";
        }
      }
      const priceFCFA = form.isFree ? 0 : parseInt(form.priceFCFA, 10) || 0;
      const payload = {
        title: form.titleFr.trim(),
        titleFr: form.titleFr.trim(),
        titleEn: form.titleEn.trim(),
        description: form.descriptionFr.trim(),
        descriptionFr: form.descriptionFr.trim(),
        descriptionEn: form.descriptionEn.trim(),
        category: form.category,
        city: form.city,
        venue: form.venue,
        date: form.date.trim(),
        time: form.time.trim(),
        price: priceFCFA,
        currency: "FCFA",
        imageUrl: finalImageUrl || null,
        partnerId: user?.id || null,
      };
      const url = isEdit ? `${API_BASE}/events/${editId}` : `${API_BASE}/events`;
      const method = isEdit ? "PATCH" : "POST";
      const editPayload = isEdit ? { ...payload, status: "pending" } : payload;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editPayload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || (isEdit ? "Échec de la mise à jour de l'événement" : "Échec de la création de l'événement"));
      }
      const saved = await res.json();
      if (isEdit && localId) {
        updateMyEvent(localId, {
          apiId: saved?.id ? String(saved.id) : editId,
          titleFr: form.titleFr.trim(),
          titleEn: form.titleEn.trim(),
          category: form.category,
          city: form.city,
          venue: form.venue,
          date: form.date.trim(),
          time: form.time.trim(),
          descriptionFr: form.descriptionFr.trim(),
          descriptionEn: form.descriptionEn.trim(),
          priceFCFA,
          isFree: form.isFree,
          isSponsored: form.isSponsored,
          imageUrl: finalImageUrl,
          status: "pending",
        });
      } else {
        addMyEvent({
          apiId: saved?.id ? String(saved.id) : undefined,
          titleFr: form.titleFr.trim(),
          titleEn: form.titleEn.trim(),
          category: form.category,
          city: form.city,
          venue: form.venue,
          date: form.date.trim(),
          time: form.time.trim(),
          descriptionFr: form.descriptionFr.trim(),
          descriptionEn: form.descriptionEn.trim(),
          priceFCFA,
          isFree: form.isFree,
          isSponsored: form.isSponsored,
          imageUrl: finalImageUrl,
        });
      }
      setSubmitted(true);
    } catch (e: any) {
      Alert.alert(
        lang === "fr" ? "Erreur" : "Error",
        e?.message || (lang === "fr" ? "Une erreur est survenue. Veuillez réessayer." : "Something went wrong. Please try again."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <View style={[styles.root, styles.successRoot]}>
        <View style={styles.successBox}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={72} color={C.success} />
          </View>
          <Text style={styles.successTitle}>{t("eventCreatedSuccess")}</Text>
          <Text style={styles.successSub}>
            {lang === "fr"
              ? "Votre événement est en attente de validation par l'équipe NoStress."
              : "Your event is pending review by the NoStress team."}
          </Text>
          <TouchableOpacity
            style={styles.successBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={18} color={C.bg} />
            <Text style={styles.successBtnText}>{t("back")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: (Platform.OS === "web" ? 16 : insets.top) + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("newEvent")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Section 1 — Informations générales */}
        <SectionHeader icon="information-circle" label={t("formSectionInfo")} />

        <Field label={t("titleFr")} required error={errors.titleFr}>
          <TextInput
            style={[styles.input, errors.titleFr && styles.inputError]}
            placeholder="Ex: Nuit Afrobeats Lomé"
            placeholderTextColor={C.textMuted}
            value={form.titleFr}
            onChangeText={(v) => setField("titleFr", v)}
          />
        </Field>

        <Field label={t("titleEn")}>
          <TextInput
            style={styles.input}
            placeholder="Ex: Afrobeats Night Lomé"
            placeholderTextColor={C.textMuted}
            value={form.titleEn}
            onChangeText={(v) => setField("titleEn", v)}
          />
        </Field>

        {/* Category selector */}
        <Field label={t("category")} required error={errors.category}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
            {CATEGORIES.map((cat) => {
              const label = lang === "fr" ? (cat.key === "liveMusic" ? "Musique live" : cat.key === "nightclubs" ? "Boîtes de nuit" : cat.key.charAt(0).toUpperCase() + cat.key.slice(1)) : cat.key.charAt(0).toUpperCase() + cat.key.slice(1);
              const active = form.category === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.pill, active && { backgroundColor: cat.color + "33", borderColor: cat.color }]}
                  onPress={() => setField("category", cat.key)}
                >
                  <Ionicons name={cat.icon as any} size={14} color={active ? cat.color : C.textMuted} />
                  <Text style={[styles.pillText, active && { color: cat.color }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Field>

        {/* City selector */}
        <Field label={t("city")} required error={errors.city}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
            {MOCK_CITIES.map((c) => {
              const active = form.city === c.name;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => setField("city", c.name)}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>{c.name}</Text>
                  <Text style={styles.pillCountry}>{c.country}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Field>

        <Field label={t("selectVenue")}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
            {[
              ...apiVenues
                .filter((v) => !form.city || (v.city || "").toLowerCase() === form.city.toLowerCase())
                .map((v) => ({ id: `api_${v.id}`, name: v.name })),
              ...MOCK_VENUES
                .filter((v) => !apiVenues.find((av) => (av.name || "").toLowerCase() === v.name.toLowerCase()))
                .map((v) => ({ id: v.id, name: v.name })),
            ].map((v) => {
              const active = form.venue === v.name;
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => setField("venue", v.name)}
                >
                  <Ionicons name="business-outline" size={13} color={active ? C.lavender : C.textMuted} />
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>{v.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder={lang === "fr" ? "Ou saisissez un nom de lieu" : "Or type a venue name"}
            placeholderTextColor={C.textMuted}
            value={form.venue}
            onChangeText={(v) => setField("venue", v)}
          />
        </Field>

        {/* Date & time row */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label={t("date")} required error={errors.date}>
              <TextInput
                style={[styles.input, errors.date && styles.inputError]}
                placeholder="AAAA-MM-JJ"
                placeholderTextColor={C.textMuted}
                value={form.date}
                onChangeText={(v) => setField("date", v)}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label={t("time")} required error={errors.time}>
              <TextInput
                style={[styles.input, errors.time && styles.inputError]}
                placeholder="22:00"
                placeholderTextColor={C.textMuted}
                value={form.time}
                onChangeText={(v) => setField("time", v)}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </Field>
          </View>
        </View>

        {/* Section 2 — Détails */}
        <SectionHeader icon="ticket" label={t("formSectionDetails")} />

        <Field label={t("descriptionFr")} required error={errors.descriptionFr}>
          <TextInput
            style={[styles.input, styles.textarea, errors.descriptionFr && styles.inputError]}
            placeholder={lang === "fr" ? "Décrivez votre événement en français..." : "Describe your event in French..."}
            placeholderTextColor={C.textMuted}
            value={form.descriptionFr}
            onChangeText={(v) => setField("descriptionFr", v)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Field>

        <Field label={t("descriptionEn")}>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder={lang === "fr" ? "Décrivez votre événement en anglais..." : "Describe your event in English..."}
            placeholderTextColor={C.textMuted}
            value={form.descriptionEn}
            onChangeText={(v) => setField("descriptionEn", v)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Field>

        {/* Free toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleLabel}>
            <Ionicons name="gift-outline" size={18} color={form.isFree ? C.success : C.textMuted} />
            <Text style={[styles.toggleText, form.isFree && { color: C.success }]}>{t("isFree")}</Text>
          </View>
          <Switch
            value={form.isFree}
            onValueChange={(v) => {
              setField("isFree", v);
              if (v) setField("priceFCFA", "0");
            }}
            trackColor={{ false: C.border, true: C.success + "88" }}
            thumbColor={form.isFree ? C.success : C.card2}
          />
        </View>

        {!form.isFree && (
          <Field label={t("priceFCFA")} required error={errors.priceFCFA}>
            <View style={styles.priceRow}>
              <TextInput
                style={[styles.input, styles.priceInput, errors.priceFCFA && styles.inputError]}
                placeholder="15000"
                placeholderTextColor={C.textMuted}
                value={form.priceFCFA}
                onChangeText={(v) => setField("priceFCFA", v.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
              />
              <View style={styles.priceSuffix}>
                <Text style={styles.priceSuffixText}>FCFA</Text>
              </View>
            </View>
          </Field>
        )}

        {/* Sponsored toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleLabel}>
            <Ionicons name="star-outline" size={18} color={form.isSponsored ? C.gold : C.textMuted} />
            <Text style={[styles.toggleText, form.isSponsored && { color: C.gold }]}>{t("isSponsored")}</Text>
          </View>
          <Switch
            value={form.isSponsored}
            onValueChange={(v) => setField("isSponsored", v)}
            trackColor={{ false: C.border, true: C.gold + "88" }}
            thumbColor={form.isSponsored ? C.gold : C.card2}
          />
        </View>

        {/* Section 3 — Médias */}
        <SectionHeader icon="image" label={t("formSectionMedia")} />

        <Field label={t("imageUrl")}>
          {form.imageUrl ? (
            <View style={{ borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: C.border }}>
              <Image source={{ uri: form.imageUrl }} style={{ width: "100%", height: 180, borderRadius: 12 }} resizeMode="cover" />
              <TouchableOpacity
                style={{
                  position: "absolute", top: 8, right: 8, backgroundColor: C.error,
                  borderRadius: 16, width: 32, height: 32, alignItems: "center", justifyContent: "center",
                }}
                onPress={() => setField("imageUrl", "")}
              >
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                style={{
                  flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                  backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12,
                  paddingVertical: 32,
                }}
                onPress={async () => {
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ["images"],
                    allowsEditing: true,
                    aspect: [16, 9],
                    quality: 0.8,
                  });
                  if (!result.canceled && result.assets[0]) {
                    setField("imageUrl", result.assets[0].uri);
                  }
                }}
              >
                <Ionicons name="images-outline" size={22} color={C.lavender} />
                <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: C.lavender }}>
                  {lang === "fr" ? "Choisir une photo" : "Choose a photo"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                  backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12,
                  paddingVertical: 32,
                }}
                onPress={async () => {
                  const perm = await ImagePicker.requestCameraPermissionsAsync();
                  if (!perm.granted) {
                    Alert.alert(lang === "fr" ? "Permission requise" : "Permission required",
                      lang === "fr" ? "Autorisez l'accès à la caméra." : "Allow camera access.");
                    return;
                  }
                  const result = await ImagePicker.launchCameraAsync({
                    allowsEditing: true,
                    aspect: [16, 9],
                    quality: 0.8,
                  });
                  if (!result.canceled && result.assets[0]) {
                    setField("imageUrl", result.assets[0].uri);
                  }
                }}
              >
                <Ionicons name="camera-outline" size={22} color={C.gold} />
                <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: C.gold }}>
                  {lang === "fr" ? "Prendre une photo" : "Take a photo"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Field>

        {/* Error summary */}
        {Object.keys(errors).length > 0 && (
          <View style={styles.errorSummary}>
            <Ionicons name="alert-circle" size={18} color={C.error} />
            <Text style={styles.errorSummaryText}>
              {lang === "fr"
                ? "Veuillez remplir tous les champs obligatoires."
                : "Please fill in all required fields."}
            </Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <>
              <Ionicons name="hourglass-outline" size={20} color={C.bg} />
              <Text style={styles.submitBtnText}>{t("processing")}</Text>
            </>
          ) : (
            <>
              <Ionicons name="send" size={20} color={C.bg} />
              <Text style={styles.submitBtnText}>{t("submitEvent")}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={sectionStyles.row}>
      <Ionicons name={icon as any} size={18} color={C.lavender} />
      <Text style={sectionStyles.label}>{label}</Text>
    </View>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={fieldStyles.wrap}>
      <View style={fieldStyles.labelRow}>
        <Text style={fieldStyles.label}>{label}</Text>
        {required && <Text style={fieldStyles.required}>*</Text>}
      </View>
      {children}
      {error ? <Text style={fieldStyles.error}>{error}</Text> : null}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: C.lavender,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});

const fieldStyles = StyleSheet.create({
  wrap: { gap: 6 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.textMuted },
  required: { fontSize: 13, fontFamily: "Inter_700Bold", color: C.error },
  error: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.error },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: C.text,
  },
  inputError: {
    borderColor: C.error,
  },
  textarea: {
    height: 100,
    paddingTop: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  pillScroll: {
    marginHorizontal: -2,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    marginRight: 8,
    marginVertical: 2,
  },
  pillActive: {
    backgroundColor: C.lavender + "22",
    borderColor: C.lavender,
  },
  pillText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
  },
  pillTextActive: {
    color: C.lavender,
    fontFamily: "Inter_600SemiBold",
  },
  pillCountry: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    opacity: 0.7,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  toggleLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  toggleText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  priceInput: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  priceSuffix: {
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.border,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  priceSuffixText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.gold,
  },
  errorSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.error + "15",
    borderWidth: 1,
    borderColor: C.error + "44",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorSummaryText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: C.error,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.lavender,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: C.bg,
  },
  successRoot: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  successBox: {
    alignItems: "center",
    gap: 16,
    width: "100%",
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: C.success + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: C.text,
    textAlign: "center",
  },
  successSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  successBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.lavender,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
    width: "100%",
    justifyContent: "center",
  },
  successBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: C.bg,
  },
});
