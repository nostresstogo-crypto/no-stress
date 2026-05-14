import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import type { ColorPalette } from "@/constants/colors";
import { useT, useApp, useColors } from "@/context/AppContext";
import { CategoryKey } from "@/constants/data";
import type { MyEvent } from "@/context/AppContext";
import { API_BASE } from "@/lib/apiBase";
import { DateField, TimeField, todayISO } from "@/components/DateTimeField";

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
  venue: string;
  venueId: string;
  date: string;
  time: string;
  descriptionFr: string;
  descriptionEn: string;
  priceFCFA: string;
  isFree: boolean;
  images: string[];
};

type FieldErrors = Partial<Record<keyof FormData, string>>;

const MAX_EVENT_IMAGES = 3;

const INITIAL_FORM: FormData = {
  titleFr: "",
  titleEn: "",
  category: "",
  venue: "",
  venueId: "",
  date: "",
  time: "",
  descriptionFr: "",
  descriptionEn: "",
  priceFCFA: "",
  isFree: false,
  images: [],
};

export default function CreateEventScreen() {
  const t = useT();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const sectionStyles = useMemo(() => makeSectionStyles(C), [C]);
  const fieldStyles = useMemo(() => makeFieldStyles(C), [C]);
  const { lang, addMyEvent, updateMyEvent, user, authFetch, token, configEventCategories } = useApp();
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
  const [apiVenues, setApiVenues] = useState<Array<{ id: string; name: string; city?: string | null; partnerId?: string | null }>>([]);
  const [catSearch, setCatSearch] = useState("");
  const [venueSearch, setVenueSearch] = useState("");
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
        const evImages: string[] = Array.isArray(ev.images) && ev.images.length > 0
          ? ev.images.filter((s: any) => typeof s === "string" && s).slice(0, MAX_EVENT_IMAGES)
          : ev.imageUrl ? [ev.imageUrl] : [];
        setForm({
          titleFr: ev.title || "",
          titleEn: ev.title || "",
          category: (ev.category as CategoryKey) || "",
          venue: ev.venue || "",
          venueId: ev.venueId ? String(ev.venueId) : "",
          date: ev.date || "",
          time: ev.time || "",
          descriptionFr: ev.description || "",
          descriptionEn: ev.description || "",
          priceFCFA: ev.price != null ? String(ev.price) : "",
          isFree: !ev.price || Number(ev.price) === 0,
          images: evImages,
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

  const fetchVenues = useCallback(async () => {
    if (!token) return;
    try {
      const r = await authFetch(`${API_BASE}/partners/me/venues?status=approved`);
      if (!r.ok) return;
      const data = await r.json();
      const list = Array.isArray(data?.venues) ? data.venues : [];
      setApiVenues(list.map((v: any) => ({ id: String(v.id), name: v.name || "", city: v.city || null, partnerId: v.partnerId != null ? String(v.partnerId) : null })));
    } catch {}
  }, [authFetch, token]);

  useEffect(() => { fetchVenues(); }, [fetchVenues]);

  useFocusEffect(
    useCallback(() => {
      fetchVenues();
    }, [fetchVenues])
  );

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const newErrors: FieldErrors = {};
    if (!form.titleFr.trim()) newErrors.titleFr = t("requiredField");
    if (!form.category) newErrors.category = t("requiredField");
    if (!form.venueId) newErrors.venue = t("requiredField");
    const trimmedDate = form.date.trim();
    if (!trimmedDate) {
      newErrors.date = t("requiredField");
    } else {
      // Strict YYYY-MM-DD parse so we don't accept "2026-13-99" etc., then
      // ensure the date is today or later. The backend enforces the same rule
      // (date < todayISO() → 400), this just gives instant in-form feedback.
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmedDate);
      if (!m) {
        newErrors.date = lang === "fr" ? "Format attendu : AAAA-MM-JJ" : "Expected format: YYYY-MM-DD";
      } else {
        const y = +m[1], mo = +m[2], d = +m[3];
        const parsed = new Date(y, mo - 1, d);
        const valid = parsed.getFullYear() === y && parsed.getMonth() === mo - 1 && parsed.getDate() === d;
        if (!valid) {
          newErrors.date = lang === "fr" ? "Date invalide." : "Invalid date.";
        } else {
          const today = new Date();
          const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          if (parsed.getTime() < todayMidnight.getTime()) {
            newErrors.date = lang === "fr"
              ? "La date doit être aujourd'hui ou ultérieure."
              : "Date must be today or later.";
          }
        }
      }
    }
    const trimmedTime = form.time.trim();
    if (!trimmedTime) {
      newErrors.time = t("requiredField");
    } else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(trimmedTime)) {
      newErrors.time = lang === "fr" ? "Format attendu : HH:MM (24h)" : "Expected format: HH:MM (24h)";
    }
    // Price field removed from UI — no validation needed (always submitted as 0/free).
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
      const uploadedImages: string[] = [];
      for (const uri of form.images.slice(0, MAX_EVENT_IMAGES)) {
        const trimmed = (uri || "").trim();
        if (!trimmed) continue;
        if (trimmed.startsWith("file:") || trimmed.startsWith("content:") || trimmed.startsWith("ph:") || trimmed.startsWith("/")) {
          try {
            const url = await uploadImageToBackend(trimmed);
            uploadedImages.push(url);
          } catch (uploadErr: any) {
            console.warn("Image upload failed, skipping:", uploadErr?.message);
          }
        } else {
          uploadedImages.push(trimmed);
        }
      }
      const finalImageUrl = uploadedImages[0] || null;
      const priceFCFA = form.isFree ? 0 : parseInt(form.priceFCFA, 10) || 0;
      const derivedCity = apiVenues.find(v => v.id === form.venueId)?.city || "";
      const payload = {
        title: form.titleFr.trim(),
        titleFr: form.titleFr.trim(),
        titleEn: form.titleEn.trim(),
        description: form.descriptionFr.trim(),
        descriptionFr: form.descriptionFr.trim(),
        descriptionEn: form.descriptionEn.trim(),
        category: form.category,
        city: derivedCity,
        venue: form.venue,
        venueId: form.venueId || null,
        date: form.date.trim(),
        time: form.time.trim(),
        price: priceFCFA,
        currency: "FCFA",
        imageUrl: finalImageUrl,
        images: uploadedImages,
        partnerId: user?.id || null,
      };
      const url = isEdit ? `${API_BASE}/partners/me/events/${editId}` : `${API_BASE}/partners/me/events`;
      const method = isEdit ? "PATCH" : "POST";
      const editPayload = isEdit ? { ...payload, status: "pending" } : payload;
      const res = await authFetch(url, {
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
          city: derivedCity,
          venue: form.venue,
          date: form.date.trim(),
          time: form.time.trim(),
          descriptionFr: form.descriptionFr.trim(),
          descriptionEn: form.descriptionEn.trim(),
          priceFCFA,
          isFree: form.isFree,
          imageUrl: finalImageUrl || undefined,
          status: "pending",
        });
      } else {
        addMyEvent({
          apiId: saved?.id ? String(saved.id) : undefined,
          titleFr: form.titleFr.trim(),
          titleEn: form.titleEn.trim(),
          category: form.category,
          city: derivedCity,
          venue: form.venue,
          date: form.date.trim(),
          time: form.time.trim(),
          descriptionFr: form.descriptionFr.trim(),
          descriptionEn: form.descriptionEn.trim(),
          priceFCFA,
          isFree: form.isFree,
          imageUrl: finalImageUrl || "",
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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
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
        <SectionHeader icon="information-circle" label={t("formSectionInfo")} sectionStyles={sectionStyles} C={C} />

        <Field label={t("titleFr")} required error={errors.titleFr} fieldStyles={fieldStyles}>
          <TextInput
            style={[styles.input, errors.titleFr && styles.inputError]}
            placeholder="Ex: Nuit Afrobeats Lomé"
            placeholderTextColor={C.textMuted}
            value={form.titleFr}
            onChangeText={(v) => setField("titleFr", v)}
          />
        </Field>

        <Field label={t("titleEn")} fieldStyles={fieldStyles}>
          <TextInput
            style={styles.input}
            placeholder="Ex: Afrobeats Night Lomé"
            placeholderTextColor={C.textMuted}
            value={form.titleEn}
            onChangeText={(v) => setField("titleEn", v)}
          />
        </Field>

        {/* Category selector */}
        <Field label={t("category")} required error={errors.category} fieldStyles={fieldStyles}>
          <TextInput
            style={[styles.input, { marginBottom: 8 }]}
            placeholder={lang === "fr" ? "Filtrer les catégories…" : "Filter categories…"}
            placeholderTextColor={C.textMuted}
            value={catSearch}
            onChangeText={setCatSearch}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
            {configEventCategories
              .filter(cat => !catSearch.trim() || t(cat.key as any).toLowerCase().includes(catSearch.toLowerCase()))
              .map((cat) => {
                const label = t(cat.key as any);
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

        <Field label={t("selectVenue")} required error={errors.venue} fieldStyles={fieldStyles}>
          {apiVenues.length === 0 ? (
            <View style={{ padding: 14, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ color: C.textMuted, fontSize: 13, lineHeight: 18 }}>
                {lang === "fr"
                  ? "Aucun lieu disponible. Créez d'abord vos lieux dans l'onglet « Mes lieux » du tableau de bord partenaire."
                  : "No venues available yet. Create your venues first in the partner dashboard's \"My venues\" tab."}
              </Text>
            </View>
          ) : (
            <>
              <TextInput
                style={[styles.input, { marginBottom: 8 }]}
                placeholder={lang === "fr" ? "Filtrer les lieux…" : "Filter venues…"}
                placeholderTextColor={C.textMuted}
                value={venueSearch}
                onChangeText={setVenueSearch}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
                {(() => {
                  const norm = (s: string) =>
                    (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                  const myPid = user?.id ? String(user.id) : null;
                  const query = norm(venueSearch);
                  const combined = apiVenues
                    .filter(v => !query || norm(v.name).includes(query) || norm(v.city || "").includes(query))
                    .map((v) => ({
                      id: v.id,
                      name: v.name,
                      city: v.city || "",
                      isMine: !!(myPid && v.partnerId === myPid),
                    }))
                    .sort((a, b) => {
                      if (a.isMine !== b.isMine) return a.isMine ? -1 : 1;
                      return a.name.localeCompare(b.name);
                    });
                  return combined.map((v) => {
                    const active = form.venueId === v.id;
                    return (
                      <TouchableOpacity
                        key={v.id}
                        style={[styles.pill, active && styles.pillActive]}
                        onPress={() => {
                          setField("venueId", v.id);
                          setField("venue", v.name);
                        }}
                      >
                        <Ionicons
                          name={v.isMine ? "star" : "business-outline"}
                          size={13}
                          color={active ? C.lavender : v.isMine ? C.gold : C.textMuted}
                        />
                        <Text style={[styles.pillText, active && styles.pillTextActive]}>{v.name}</Text>
                        {v.city ? <Text style={styles.pillCountry}>{v.city}</Text> : null}
                      </TouchableOpacity>
                    );
                  });
                })()}
              </ScrollView>
            </>
          )}
        </Field>

        {/* Date & time row */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label={t("date")} required error={errors.date} fieldStyles={fieldStyles}>
              <DateField
                style={[styles.input, errors.date && styles.inputError]}
                placeholder="AAAA-MM-JJ"
                placeholderTextColor={C.textMuted}
                textColor={C.text}
                value={form.date}
                onChange={(v) => setField("date", v)}
                min={todayISO()}
                hasError={!!errors.date}
                errorBorderColor={C.error || "#e54848"}
                lang={lang as "fr" | "en"}
              />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label={t("time")} required error={errors.time} fieldStyles={fieldStyles}>
              <TimeField
                style={[styles.input, errors.time && styles.inputError]}
                placeholder="22:00"
                placeholderTextColor={C.textMuted}
                textColor={C.text}
                value={form.time}
                onChange={(v) => setField("time", v)}
                hasError={!!errors.time}
                errorBorderColor={C.error || "#e54848"}
                lang={lang as "fr" | "en"}
              />
            </Field>
          </View>
        </View>

        {/* Section 2 — Détails */}
        <SectionHeader icon="information-circle" label={t("formSectionDetails")} sectionStyles={sectionStyles} C={C} />

        <Field label={t("descriptionFr")} required error={errors.descriptionFr} fieldStyles={fieldStyles}>
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

        <Field label={t("descriptionEn")} fieldStyles={fieldStyles}>
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

        {/* Price field hidden by product decision — events are submitted with price=0 (free). */}

        {/* Section 3 — Médias */}
        <SectionHeader icon="image" label={t("formSectionMedia")} sectionStyles={sectionStyles} C={C} />

        <Field label={lang === "fr" ? `Photos (max ${MAX_EVENT_IMAGES})` : `Photos (max ${MAX_EVENT_IMAGES})`} fieldStyles={fieldStyles}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {form.images.map((uri, idx) => (
              <View key={`${idx}-${uri}`} style={{ position: "relative", width: "48%", aspectRatio: 16 / 9, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: C.border }}>
                <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                <TouchableOpacity
                  style={{
                    position: "absolute", top: 6, right: 6, backgroundColor: C.error,
                    borderRadius: 14, width: 28, height: 28, alignItems: "center", justifyContent: "center",
                  }}
                  onPress={() => setField("images", form.images.filter((_, i) => i !== idx))}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
                {idx === 0 ? (
                  <View style={{ position: "absolute", bottom: 6, left: 6, backgroundColor: C.lavender + "ee", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                    <Text style={{ color: C.bg, fontSize: 10, fontFamily: "Inter_600SemiBold" }}>
                      {lang === "fr" ? "Couverture" : "Cover"}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
            {form.images.length < MAX_EVENT_IMAGES ? (
              <View style={{ width: "48%", aspectRatio: 16 / 9, flexDirection: "row", gap: 6 }}>
                <TouchableOpacity
                  style={{
                    flex: 1, alignItems: "center", justifyContent: "center", gap: 4,
                    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12,
                  }}
                  onPress={async () => {
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ["images"],
                      allowsMultipleSelection: true,
                      selectionLimit: MAX_EVENT_IMAGES - form.images.length,
                      quality: 0.8,
                    });
                    if (!result.canceled && result.assets?.length) {
                      const next = [...form.images, ...result.assets.map((a) => a.uri)].slice(0, MAX_EVENT_IMAGES);
                      setField("images", next);
                    }
                  }}
                >
                  <Ionicons name="images-outline" size={22} color={C.lavender} />
                  <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: C.lavender }}>
                    {lang === "fr" ? "Galerie" : "Gallery"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1, alignItems: "center", justifyContent: "center", gap: 4,
                    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12,
                  }}
                  onPress={async () => {
                    const perm = await ImagePicker.requestCameraPermissionsAsync();
                    if (!perm.granted) {
                      Alert.alert(
                        lang === "fr" ? "Permission requise" : "Permission required",
                        lang === "fr" ? "Autorisez l'accès à la caméra." : "Allow camera access."
                      );
                      return;
                    }
                    const result = await ImagePicker.launchCameraAsync({
                      allowsEditing: true,
                      aspect: [16, 9],
                      quality: 0.8,
                    });
                    if (!result.canceled && result.assets[0]) {
                      const next = [...form.images, result.assets[0].uri].slice(0, MAX_EVENT_IMAGES);
                      setField("images", next);
                    }
                  }}
                >
                  <Ionicons name="camera-outline" size={22} color={C.gold} />
                  <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: C.gold }}>
                    {lang === "fr" ? "Caméra" : "Camera"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
          <Text style={{ marginTop: 6, fontSize: 11, color: C.textMuted }}>
            {lang === "fr"
              ? `${form.images.length}/${MAX_EVENT_IMAGES} photos. La 1ère sert de couverture.`
              : `${form.images.length}/${MAX_EVENT_IMAGES} photos. First one is the cover.`}
          </Text>
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

function SectionHeader({ icon, label, sectionStyles, C }: { icon: string; label: string; sectionStyles: ReturnType<typeof makeSectionStyles>; C: ColorPalette }) {
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
  fieldStyles,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  fieldStyles: ReturnType<typeof makeFieldStyles>;
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

const makeSectionStyles = (C: ColorPalette) => StyleSheet.create({
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

const makeFieldStyles = (C: ColorPalette) => StyleSheet.create({
  wrap: { gap: 6 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.textMuted },
  required: { fontSize: 13, fontFamily: "Inter_700Bold", color: C.error },
  error: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.error },
});

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
