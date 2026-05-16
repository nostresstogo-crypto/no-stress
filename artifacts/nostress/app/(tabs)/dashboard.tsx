import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { safePush } from "@/lib/navigation";
import * as ImagePicker from "expo-image-picker";

import type { ColorPalette } from "@/constants/colors";
import { useT, useApp, useColors } from "@/context/AppContext";
import { MOCK_SUBSCRIPTION_PLANS } from "@/constants/data";
import { formatDateLocalized, formatDateTimeLocalized, parseDateLocal } from "@/lib/formatDate";
import { API_BASE } from "@/lib/apiBase";
import { TimeField } from "@/components/DateTimeField";

interface MyVenue {
  id: string;
  name: string;
  type: string;
  city: string;
  address: string;
  description: string;
  imageUrl?: string;
  images?: string[];
  createdAt: string;
  status?: "pending" | "approved" | "rejected";
  rejectionReason?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  openingTime?: string | null;
  closingTime?: string | null;
}

const MAX_VENUE_IMAGES = 3;

async function uploadVenueImage(uri: string, apiBase: string): Promise<string> {
  const lowerUri = uri.toLowerCase();
  const contentType = lowerUri.endsWith(".png") ? "image/png" : lowerUri.endsWith(".webp") ? "image/webp" : "image/jpeg";
  // Normaliser le nom : pour blob:/data: URIs, le pop() donne soit un UUID
  // illisible soit un payload base64 énorme. On génère un nom propre.
  const isOpaqueUri = uri.startsWith("blob:") || uri.startsWith("data:");
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const name = isOpaqueUri
    ? `upload-${Date.now()}.${ext}`
    : (uri.split("/").pop() || `upload-${Date.now()}.${ext}`);
  let blob: Blob;
  try {
    const fileResp = await fetch(uri);
    if (!fileResp.ok) throw new Error(`fetch local ${fileResp.status}`);
    blob = await fileResp.blob();
  } catch (e: any) {
    throw new Error(`Lecture du fichier impossible: ${e?.message || e}`);
  }
  const size = (blob as any).size || 0;
  if (size === 0) throw new Error("Fichier vide ou illisible");
  if (size > 10 * 1024 * 1024) throw new Error("Le fichier dépasse 10 Mo");
  const presignResp = await fetch(`${apiBase}/storage/uploads/request-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, size, contentType }),
  });
  if (!presignResp.ok) {
    const txt = await presignResp.text().catch(() => "");
    throw new Error(`Préparation upload échouée (${presignResp.status}): ${txt.slice(0, 120)}`);
  }
  const { uploadURL, objectPath } = await presignResp.json();
  const putResp = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": contentType }, body: blob });
  if (!putResp.ok) {
    const txt = await putResp.text().catch(() => "");
    throw new Error(`Envoi photo échoué (${putResp.status}): ${txt.slice(0, 120)}`);
  }
  return `${apiBase}/storage${objectPath}`;
}

const NS_MY_VENUES_KEY = "ns_my_venues";

type DashTab = "events" | "venues" | "plan";
type PartnerCheckStatus = "loading" | "pending" | "approved" | "rejected" | null;
type EventStatusFilter = "all" | "pending" | "approved" | "rejected";

export default function DashboardScreen() {
  const t = useT();
  const { user, lang, myEvents, setUser, addNotification, updateMyEvent, removeMyEvent, syncMyEventsStatus, syncMyEventsFromBackend, refreshApiEvents, authFetch, token, configCities, configVenueTypes, configCountries } = useApp();
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const statStyles = useMemo(() => makeStatStyles(C), [C]);

  const [tab, setTab] = useState<DashTab>("events");
  const [eventStatusFilter, setEventStatusFilter] = useState<EventStatusFilter>("all");
  const [openEventActionsId, setOpenEventActionsId] = useState<string | null>(null);
  const [partnerCheck, setPartnerCheck] = useState<PartnerCheckStatus>(null);
  const [subscription, setSubscription] = useState<{ active: boolean; subscriptionUntil: string | null; subscriptionStart: string | null; daysRemaining: number } | null>(null);
  const [partnerRejectReason, setPartnerRejectReason] = useState<string | null>(null);
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const [myVenues, setMyVenues] = useState<MyVenue[]>([]);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null);
  const [venueName, setVenueName] = useState("");
  const [venueType, setVenueType] = useState("");
  const [venueCity, setVenueCity] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [venueDesc, setVenueDesc] = useState("");
  const [venueImages, setVenueImages] = useState<string[]>([]);
  const [venueOpening, setVenueOpening] = useState("");
  const [venueClosing, setVenueClosing] = useState("");
  const [venueSpecialties, setVenueSpecialties] = useState<Array<{ id?: string; name: string; imageUrl: string; description?: string; price?: string }>>([]);
  const [venueTypeSearch, setVenueTypeSearch] = useState("");
  const [venueCitySearch, setVenueCitySearch] = useState("");

  const partnerCountryId = useMemo(() => {
    const rawCity: string = (user as any)?.city || "";
    const countryName = rawCity.includes(",") ? rawCity.split(",").pop()?.trim() : "";
    if (!countryName) return "";
    const found = configCountries.find(c => c.name === countryName);
    return found ? String(found.id) : "";
  }, [user, configCountries]);
  const [savingVenue, setSavingVenue] = useState(false);

  const loadMyVenues = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(NS_MY_VENUES_KEY);
      if (cached) setMyVenues(JSON.parse(cached));
    } catch {}
    if (!token) return;
    try {
      const r = await authFetch(`${API_BASE}/partners/me/venues`);
      if (!r.ok) return;
      const data = await r.json();
      const list = Array.isArray(data?.venues) ? data.venues : [];
      const mapped: MyVenue[] = list.map((v: any) => ({
        id: String(v.id),
        name: v.name || "",
        type: v.type || "",
        city: v.city || "",
        address: v.address || "",
        description: v.description || "",
        imageUrl: v.imageUrl || undefined,
        images: Array.isArray(v.images) ? v.images : (v.imageUrl ? [v.imageUrl] : []),
        createdAt: v.createdAt || new Date().toISOString(),
        status: (v.status as any) || "pending",
        rejectionReason: v.rejectionReason ?? null,
        latitude: v.latitude ?? null,
        longitude: v.longitude ?? null,
        openingTime: v.openingTime ?? null,
        closingTime: v.closingTime ?? null,
      }));
      setMyVenues(mapped);
      AsyncStorage.setItem(NS_MY_VENUES_KEY, JSON.stringify(mapped)).catch(() => {});
    } catch {}
  }, [authFetch, token]);

  useEffect(() => { loadMyVenues(); }, [loadMyVenues]);
  useFocusEffect(useCallback(() => { loadMyVenues(); }, [loadMyVenues]));

  const openVenueModal = () => {
    setEditingVenueId(null);
    setVenueName(""); setVenueType(""); setVenueCity(""); setVenueAddress(""); setVenueDesc(""); setVenueImages([]);
    setVenueOpening(""); setVenueClosing(""); setVenueSpecialties([]);
    setVenueTypeSearch(""); setVenueCitySearch("");
    setShowVenueModal(true);
  };

  const openEditVenueModal = async (v: MyVenue) => {
    setEditingVenueId(v.id);
    setVenueName(v.name || "");
    setVenueType(v.type || "");
    setVenueCity(v.city || "");
    setVenueAddress(v.address || "");
    setVenueDesc(v.description || "");
    setVenueImages(Array.isArray(v.images) && v.images.length > 0 ? v.images.slice(0, MAX_VENUE_IMAGES) : (v.imageUrl ? [v.imageUrl] : []));
    setVenueOpening((v as any).openingTime || "");
    setVenueClosing((v as any).closingTime || "");
    setVenueSpecialties([]);
    setVenueTypeSearch(""); setVenueCitySearch("");
    setShowVenueModal(true);
    try {
      const r = await authFetch(`${API_BASE}/partners/me/venues/${v.id}/specialties`);
      if (r.ok) {
        const data = await r.json();
        setVenueSpecialties(
          (Array.isArray(data?.specialties) ? data.specialties : []).map((s: any) => ({
            id: String(s.id),
            name: s.name || "",
            imageUrl: s.imageUrl || "",
            description: s.description || "",
            price: s.price != null ? String(s.price) : "",
          })),
        );
      }
    } catch {}
  };

  const pickSpecialtyImage = async (idx: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setVenueSpecialties((prev) => prev.map((s, i) => i === idx ? { ...s, imageUrl: result.assets[0].uri } : s));
    }
  };

  const addSpecialty = () => {
    setVenueSpecialties((prev) => [...prev, { name: "", imageUrl: "", description: "", price: "" }]);
  };

  const removeSpecialty = (idx: number) => {
    setVenueSpecialties((prev) => prev.filter((_, i) => i !== idx));
  };

  const syncSpecialties = async (venueId: string): Promise<{ failures: string[] }> => {
    const existingRes = await authFetch(`${API_BASE}/partners/me/venues/${venueId}/specialties`);
    const existing = existingRes.ok ? ((await existingRes.json())?.specialties || []) : [];
    const keptIds = new Set(venueSpecialties.filter((s) => s.id).map((s) => s.id));
    const specialtyFailures: string[] = [];
    for (const old of existing) {
      if (!keptIds.has(String(old.id))) {
        const delRes = await authFetch(`${API_BASE}/partners/me/venues/${venueId}/specialties/${old.id}`, { method: "DELETE" });
        if (!delRes.ok) {
          specialtyFailures.push(`Suppression "${old.name || old.id}" échouée (${delRes.status})`);
        }
      }
    }
    for (const s of venueSpecialties) {
      if (!s.name.trim() || !s.imageUrl) continue;
      let imageUrl = s.imageUrl;
      // Même logique que pour les photos de lieu : tout ce qui n'est pas un
      // https:// persisté (donc file:/content:/ph:/blob:/data:/chemin local)
      // doit être uploadé. Sinon, sur le web, blob:/data: URIs étaient envoyées
      // telles quelles à l'API → liens morts.
      const isPersisted = /^https?:\/\//i.test(imageUrl) && !imageUrl.startsWith("blob:");
      if (!isPersisted) {
        try { imageUrl = await uploadVenueImage(imageUrl, API_BASE); }
        catch (e: any) {
          console.warn("specialty upload failed", e?.message);
          specialtyFailures.push(`${s.name}: ${e?.message || "upload échoué"}`);
          continue;
        }
      }
      const priceNum = s.price && s.price.trim() ? Number(s.price.replace(/[^0-9]/g, "")) : null;
      const body = JSON.stringify({
        name: s.name.trim(),
        imageUrl,
        description: s.description?.trim() || null,
        price: priceNum,
      });
      const res = s.id
        ? await authFetch(`${API_BASE}/partners/me/venues/${venueId}/specialties/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body })
        : await authFetch(`${API_BASE}/partners/me/venues/${venueId}/specialties`, { method: "POST", headers: { "Content-Type": "application/json" }, body });
      if (!res.ok) {
        const errTxt = await res.text().catch(() => "");
        specialtyFailures.push(`${s.name}: enregistrement échoué (${res.status}) ${errTxt.slice(0, 80)}`);
      }
    }
    return { failures: specialtyFailures };
  };

  const saveVenue = async () => {
    const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (venueOpening.trim() && !timeRe.test(venueOpening.trim())) {
      Alert.alert(
        lang === "fr" ? "Heure invalide" : "Invalid time",
        lang === "fr" ? "Heure d'ouverture : format attendu HH:MM (24h)." : "Opening time: expected format HH:MM (24h).",
      );
      return;
    }
    if (venueClosing.trim() && !timeRe.test(venueClosing.trim())) {
      Alert.alert(
        lang === "fr" ? "Heure invalide" : "Invalid time",
        lang === "fr" ? "Heure de fermeture : format attendu HH:MM (24h)." : "Closing time: expected format HH:MM (24h).",
      );
      return;
    }
    if (!venueName.trim()) {
      Alert.alert(lang === "fr" ? "Nom requis" : "Name required", lang === "fr" ? "Veuillez entrer un nom pour le lieu." : "Please enter a name for the venue.");
      return;
    }
    if (!venueCity.trim()) {
      Alert.alert(lang === "fr" ? "Ville requise" : "City required", lang === "fr" ? "Veuillez sélectionner une ville." : "Please select a city.");
      return;
    }
    setSavingVenue(true);
    try {
      const uploaded: string[] = [];
      const uploadFailures: string[] = [];
      for (const uri of venueImages.slice(0, MAX_VENUE_IMAGES)) {
        if (!uri) continue;
        // Detect already-uploaded URLs vs local picker results that need upload.
        // Anything http(s):// pointing to our API is already persisted; everything
        // else (file:, content:, ph:, blob:, data:, plain "/path") MUST be uploaded
        // — blob: URIs in particular only live in the current web session and become
        // dead links the moment the page is reloaded.
        const isPersisted = /^https?:\/\//i.test(uri) && !uri.startsWith("blob:");
        if (isPersisted) {
          uploaded.push(uri);
        } else {
          try { uploaded.push(await uploadVenueImage(uri, API_BASE)); }
          catch (e: any) {
            console.warn("venue upload failed", e?.message);
            uploadFailures.push(e?.message || "unknown");
          }
        }
      }
      // Si l'utilisateur a sélectionné des photos mais qu'AUCUNE n'a pu être
      // uploadée, on stoppe tout : sinon le lieu serait créé sans photo et
      // l'utilisateur ne s'en rendrait pas compte.
      if (venueImages.length > 0 && uploaded.length === 0) {
        setSavingVenue(false);
        Alert.alert(
          lang === "fr" ? "Échec de l'upload" : "Upload failed",
          lang === "fr"
            ? `La photo n'a pas pu être envoyée. Vérifiez votre connexion et réessayez.\n\n(${uploadFailures[0] || "erreur inconnue"})`
            : `The photo could not be uploaded. Check your connection and try again.\n\n(${uploadFailures[0] || "unknown error"})`,
        );
        return;
      }
      // Au moins une photo uploadée mais d'autres ont échoué : on prévient
      // sans bloquer.
      if (uploadFailures.length > 0 && uploaded.length > 0) {
        Alert.alert(
          lang === "fr" ? "Photos partiellement envoyées" : "Photos partially uploaded",
          lang === "fr"
            ? `${uploadFailures.length} photo(s) n'ont pas pu être envoyée(s). Le lieu sera enregistré avec ${uploaded.length} photo(s).`
            : `${uploadFailures.length} photo(s) failed to upload. The venue will be saved with ${uploaded.length} photo(s).`,
        );
      }
      const isEdit = !!editingVenueId;
      const url = isEdit ? `${API_BASE}/partners/me/venues/${editingVenueId}` : `${API_BASE}/partners/me/venues`;
      const payload: any = {
        name: venueName.trim(),
        type: venueType || (lang === "fr" ? "Autre" : "Other"),
        city: venueCity.trim(),
        address: venueAddress.trim(),
        description: venueDesc.trim(),
        openingTime: venueOpening.trim() || null,
        closingTime: venueClosing.trim() || null,
      };
      // Only send images when the partner actually picked some — otherwise an
      // edit on a legacy venue without photos would fail the "≥1 photo" check.
      if (uploaded.length > 0) {
        payload.images = uploaded;
        payload.imageUrl = uploaded[0];
      } else if (!isEdit) {
        payload.images = [];
      }
      const r = await authFetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "save failed");
      }
      const saved = await r.json();
      const savedVenue: MyVenue = {
        id: String(saved.id),
        name: saved.name,
        type: saved.type || "",
        city: saved.city,
        address: saved.address || "",
        description: saved.description || "",
        imageUrl: saved.imageUrl || undefined,
        images: Array.isArray(saved.images) ? saved.images : (saved.imageUrl ? [saved.imageUrl] : []),
        createdAt: saved.createdAt || new Date().toISOString(),
        status: (saved.status as any) || "pending",
        rejectionReason: saved.rejectionReason ?? null,
        latitude: saved.latitude ?? null,
        longitude: saved.longitude ?? null,
      };
      setMyVenues((prev) => {
        const next = isEdit
          ? prev.map((v) => (v.id === savedVenue.id ? savedVenue : v))
          : [savedVenue, ...prev];
        AsyncStorage.setItem(NS_MY_VENUES_KEY, JSON.stringify(next));
        return next;
      });
      let specFailures: string[] = [];
      try {
        const r = await syncSpecialties(savedVenue.id);
        specFailures = r.failures;
      } catch (e: any) { console.warn("specialties sync failed", e?.message); }
      if (specFailures.length > 0) {
        Alert.alert(
          lang === "fr" ? "Spécialités partiellement enregistrées" : "Specialties partially saved",
          (lang === "fr"
            ? "Certaines photos de spécialités n'ont pas pu être envoyées :\n\n"
            : "Some specialty photos could not be uploaded:\n\n") + specFailures.join("\n"),
        );
      }
      setShowVenueModal(false);
      setEditingVenueId(null);
      addNotification({
        title: isEdit ? "Venue updated" : "Venue submitted",
        titleFr: isEdit ? "Lieu mis à jour" : "Lieu envoyé",
        body: "Pending administrator review.",
        bodyFr: "En attente de validation par l'administrateur.",
      });
    } catch (e: any) {
      Alert.alert(
        lang === "fr" ? "Erreur" : "Error",
        e?.message || (lang === "fr" ? "Impossible d'enregistrer le lieu. Vérifiez votre connexion." : "Unable to save venue. Check your connection."),
      );
    } finally {
      setSavingVenue(false);
    }
  };

  const deleteVenue = (id: string) => {
    Alert.alert(
      lang === "fr" ? "Supprimer ce lieu ?" : "Delete this venue?",
      lang === "fr" ? "Cette action est irréversible." : "This action cannot be undone.",
      [
        { text: lang === "fr" ? "Annuler" : "Cancel", style: "cancel" },
        {
          text: lang === "fr" ? "Supprimer" : "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const r = await authFetch(`${API_BASE}/partners/me/venues/${id}`, { method: "DELETE" });
              if (!r.ok) {
                const err = await r.json().catch(() => ({}));
                Alert.alert(
                  lang === "fr" ? "Suppression impossible" : "Cannot delete",
                  err?.error || (lang === "fr" ? "Impossible de supprimer ce lieu." : "Unable to delete this venue."),
                );
                return;
              }
            } catch {
              Alert.alert(
                lang === "fr" ? "Erreur réseau" : "Network error",
                lang === "fr" ? "Vérifiez votre connexion." : "Check your connection.",
              );
              return;
            }
            setMyVenues((prev) => {
              const next = prev.filter((v) => v.id !== id);
              AsyncStorage.setItem(NS_MY_VENUES_KEY, JSON.stringify(next));
              return next;
            });
          },
        },
      ]
    );
  };

  const setVenueLocation = (v: MyVenue) => {
    safePush(`/set-venue-location?venueId=${v.id}&name=${encodeURIComponent(v.name)}` as any);
  };

  const checkPartnerStatus = useCallback(() => {
    if (!user || user.role !== "structure") return;
    setPartnerCheck("loading");
    fetch(`${API_BASE}/partners/status?email=${encodeURIComponent(user.email)}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data) => {
        const status: PartnerCheckStatus = data.status ?? "pending";
        setPartnerCheck(status);
        setPartnerRejectReason(data.rejectionReason ?? null);
        setSubscription(data.subscription ?? null);
        if (status !== user.partnerStatus && (status === "pending" || status === "approved" || status === "rejected")) {
          setUser({ ...user, partnerStatus: status });
          if (status === "approved" && user.partnerStatus !== "approved") {
            addNotification({
              title: "Account approved! 🎊",
              titleFr: "Compte approuvé ! 🎊",
              body: "Your partner account has been approved. You can now publish events and venues.",
              bodyFr: "Votre compte partenaire a été approuvé. Vous pouvez maintenant publier des événements et des lieux.",
            });
          } else if (status === "rejected" && user.partnerStatus !== "rejected") {
            addNotification({
              title: "Account request update",
              titleFr: "Mise à jour de votre demande",
              body: data.rejectionReason || "Your partner account request was not approved. Contact support for more information.",
              bodyFr: data.rejectionReason || "Votre demande de compte partenaire n'a pas été approuvée. Contactez le support pour plus d'informations.",
            });
          }
        }
      })
      .catch(() => {
        setPartnerCheck(user.partnerStatus ?? "pending");
      });
  }, [user?.email, user?.role, user?.partnerStatus]);

  useFocusEffect(
    useCallback(() => {
      checkPartnerStatus();
      syncMyEventsStatus();
      syncMyEventsFromBackend();
      const interval = setInterval(() => {
        syncMyEventsStatus();
      }, 15000);
      return () => clearInterval(interval);
    }, [checkPartnerStatus, syncMyEventsStatus, syncMyEventsFromBackend])
  );

  /* ── Not logged in ── */
  if (!user) {
    return (
      <View style={[styles.root, { paddingTop: topInset }]}>
        <View style={styles.gateBox}>
          <View style={[styles.gateIcon, { backgroundColor: C.lavender + "18" }]}>
            <Ionicons name="lock-closed-outline" size={40} color={C.lavender} />
          </View>
          <Text style={styles.gateTitle}>{t("loginRequired")}</Text>
          <Text style={styles.gateSub}>
            {lang === "fr"
              ? "Connectez-vous pour accéder à votre espace."
              : "Sign in to access your space."}
          </Text>
          <TouchableOpacity style={styles.gateBtn} onPress={() => safePush("/auth")}>
            <Ionicons name="log-in-outline" size={18} color={C.bg} />
            <Text style={styles.gateBtnText}>{t("login")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ── Regular user (not a partner) ── */
  if (user.role === "user") {
    return (
      <View style={[styles.root, { paddingTop: topInset }]}>
        <View style={styles.gateBox}>
          <View style={[styles.gateIcon, { backgroundColor: C.gold + "18" }]}>
            <Ionicons name="business-outline" size={40} color={C.gold} />
          </View>
          <Text style={styles.gateTitle}>{t("partnerOnly")}</Text>
          <Text style={styles.gateSub}>{t("partnerOnlyDesc")}</Text>

          <TouchableOpacity
            style={[styles.gateBtn, { backgroundColor: C.gold }]}
            onPress={() => safePush("/auth")}
          >
            <Ionicons name="add-circle-outline" size={18} color={C.bg} />
            <Text style={styles.gateBtnText}>{t("partnerOnlyCreate")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gateBtnSecondary}
            onPress={() => safePush("/auth")}
          >
            <Text style={styles.gateBtnSecondaryText}>{t("partnerOnlyLogin")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ── Partner status gate ── */
  if (user.role === "structure") {
    if (partnerCheck === "loading" || partnerCheck === null) {
      return (
        <View style={[styles.root, { paddingTop: topInset, justifyContent: "center", alignItems: "center" }]}>
          <ActivityIndicator size="large" color={C.lavender} />
          <Text style={[styles.gateSub, { marginTop: 16 }]}>
            {lang === "fr" ? "Vérification de votre compte..." : "Checking your account..."}
          </Text>
        </View>
      );
    }

    if (partnerCheck === "pending") {
      return (
        <View style={[styles.root, { paddingTop: topInset }]}>
          <View style={styles.gateBox}>
            <View style={[styles.gateIcon, { backgroundColor: "#F59E0B22" }]}>
              <Ionicons name="time-outline" size={40} color="#F59E0B" />
            </View>
            <Text style={styles.gateTitle}>
              {lang === "fr" ? "Compte en cours de validation" : "Account under review"}
            </Text>
            <Text style={styles.gateSub}>
              {lang === "fr"
                ? "Votre demande de compte partenaire a été soumise et est en cours d'examen par notre équipe. Vous serez notifié dès son approbation (délai : 24–48h)."
                : "Your partner account request has been submitted and is being reviewed by our team. You will be notified once approved (24–48h)."}
            </Text>
            <View style={{ marginTop: 20, backgroundColor: "#F59E0B11", borderRadius: 12, borderWidth: 1, borderColor: "#F59E0B44", padding: 14, width: "100%" }}>
              <Text style={{ color: "#F59E0B", fontSize: 12, textAlign: "center", lineHeight: 18 }}>
                {lang === "fr"
                  ? "⏳ En attente d'approbation de l'administrateur NoStress"
                  : "⏳ Awaiting approval from NoStress admin"}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.gateBtn, { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginTop: 16 }]}
              onPress={() => checkPartnerStatus()}
            >
              <Ionicons name="refresh-outline" size={18} color={C.text} />
              <Text style={[styles.gateBtnText, { color: C.text }]}>
                {lang === "fr" ? "Vérifier le statut" : "Check status"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (partnerCheck === "rejected") {
      return (
        <View style={[styles.root, { paddingTop: topInset }]}>
          <View style={styles.gateBox}>
            <View style={[styles.gateIcon, { backgroundColor: C.error + "22" }]}>
              <Ionicons name="close-circle-outline" size={40} color={C.error} />
            </View>
            <Text style={styles.gateTitle}>
              {lang === "fr" ? "Demande refusée" : "Request declined"}
            </Text>
            <Text style={styles.gateSub}>
              {lang === "fr"
                ? "Votre demande de compte partenaire a été refusée par l'équipe NoStress."
                : "Your partner account request was declined by the NoStress team."}
            </Text>
            {partnerRejectReason ? (
              <View style={{ marginTop: 16, backgroundColor: C.error + "11", borderRadius: 12, borderWidth: 1, borderColor: C.error + "44", padding: 14, width: "100%" }}>
                <Text style={{ color: C.error, fontSize: 12, textAlign: "center", lineHeight: 18 }}>
                  {lang === "fr" ? "Motif : " : "Reason: "}{partnerRejectReason}
                </Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.gateBtn, { backgroundColor: C.textMuted, marginTop: 20 }]}
              onPress={() => safePush("/auth")}
            >
              <Ionicons name="mail-outline" size={18} color={C.bg} />
              <Text style={styles.gateBtnText}>
                {lang === "fr" ? "Contacter le support" : "Contact support"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
  }

  /* ── Partner or Admin ── */
  const activePlan = MOCK_SUBSCRIPTION_PLANS[0]; // Free plan by default

  const tabLabels: Record<DashTab, string> = {
    events: t("myEvents"),
    venues: t("myVenues"),
    plan: t("myPlan"),
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerSub}>{t("dashboard")}</Text>
            <Text style={styles.headerName}>{user.name}</Text>
          </View>
          <View style={[styles.planBadge, {
            backgroundColor: user.role === "admin" ? C.error + "22" : C.gold + "22",
            borderColor: user.role === "admin" ? C.error : C.gold,
          }]}>
            <Ionicons
              name={user.role === "admin" ? "shield" : "star"}
              size={12}
              color={user.role === "admin" ? C.error : C.gold}
            />
            <Text style={[styles.planBadgeText, { color: user.role === "admin" ? C.error : C.gold }]}>
              {user.role === "admin" ? "Admin" : activePlan.name}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard icon="calendar" value={myEvents.length} label={t("myEvents")} color={C.lavender} statStyles={statStyles} />
          <StatCard icon="business" value={myVenues.length} label={t("myVenues")} color={C.gold} statStyles={statStyles} />
          <StatCard icon="people" value={0} label="Participants" color={C.success} statStyles={statStyles} />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(["events", "venues", "plan"] as DashTab[]).map((dt) => (
            <TouchableOpacity
              key={dt}
              style={[styles.tabBtn, tab === dt && styles.tabBtnActive]}
              onPress={() => setTab(dt)}
            >
              <Text style={[styles.tabText, tab === dt && styles.tabTextActive]}>
                {tabLabels[dt]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === "web" ? 118 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Subscription banner ── */}
        {user.role === "structure" && partnerCheck === "approved" && subscription && (() => {
          const expired = !subscription.active;
          const warning = !expired && subscription.daysRemaining <= 14;
          if (!expired && !warning) return null;
          const color = expired ? C.error : "#F59E0B";
          const icon = expired ? "alert-circle" : "time-outline";
          const untilStr = subscription.subscriptionUntil
            ? (parseDateLocal(subscription.subscriptionUntil) ?? new Date(subscription.subscriptionUntil)).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US")
            : null;
          const title = expired
            ? (lang === "fr" ? "Abonnement expiré" : "Subscription expired")
            : (lang === "fr" ? `Abonnement bientôt expiré (${subscription.daysRemaining} j)` : `Subscription expiring soon (${subscription.daysRemaining} d)`);
          const desc = expired
            ? (lang === "fr"
                ? "Vos lieux et événements ne sont plus visibles sur la plateforme et vous ne pouvez plus les modifier. Contactez NoStress pour renouveler."
                : "Your venues and events are no longer visible and cannot be edited. Contact NoStress to renew.")
            : (lang === "fr"
                ? `Votre abonnement gratuit prend fin le ${untilStr}. Pensez à le renouveler pour rester visible.`
                : `Your free subscription ends on ${untilStr}. Renew to stay visible.`);
          return (
            <View style={{
              marginHorizontal: 16,
              marginBottom: 12,
              padding: 14,
              borderRadius: 12,
              backgroundColor: color + "11",
              borderWidth: 1,
              borderColor: color + "55",
              flexDirection: "row",
              gap: 12,
            }}>
              <Ionicons name={icon as any} size={22} color={color} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color, fontWeight: "700", fontSize: 14, marginBottom: 4 }}>{title}</Text>
                <Text style={{ color: C.text, fontSize: 12, lineHeight: 18 }}>{desc}</Text>
              </View>
            </View>
          );
        })()}

        {/* ── Events tab ── */}
        {tab === "events" && (
          <>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => safePush("/create-event")}
            >
              <Ionicons name="add-circle" size={20} color={C.bg} />
              <Text style={styles.createBtnText}>{t("createEvent")}</Text>
            </TouchableOpacity>

            {myEvents.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
                contentContainerStyle={{ gap: 8, paddingRight: 16 }}
              >
                {(["all", "pending", "approved", "rejected"] as EventStatusFilter[]).map((f) => {
                  const labels: Record<EventStatusFilter, { fr: string; en: string }> = {
                    all: { fr: "Tous", en: "All" },
                    pending: { fr: "Brouillons", en: "Drafts" },
                    approved: { fr: "Approuvés", en: "Approved" },
                    rejected: { fr: "Rejetés", en: "Rejected" },
                  };
                  const count = f === "all" ? myEvents.length : myEvents.filter((e) => e.status === f).length;
                  const active = eventStatusFilter === f;
                  return (
                    <TouchableOpacity
                      key={f}
                      onPress={() => setEventStatusFilter(f)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 18,
                        backgroundColor: active ? C.lavender : C.card2,
                        borderWidth: 1,
                        borderColor: active ? C.lavender : C.border,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Text style={{
                        fontSize: 12,
                        fontFamily: "Inter_600SemiBold",
                        color: active ? C.bg : C.text,
                      }}>
                        {lang === "fr" ? labels[f].fr : labels[f].en}
                      </Text>
                      <View style={{
                        backgroundColor: active ? C.bg + "33" : C.border,
                        borderRadius: 10,
                        paddingHorizontal: 6,
                        paddingVertical: 1,
                      }}>
                        <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: active ? C.bg : C.textMuted }}>
                          {count}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
            {(() => {
              const filtered = eventStatusFilter === "all"
                ? myEvents
                : myEvents.filter((e) => e.status === eventStatusFilter);
              return filtered.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="calendar-outline" size={44} color={C.border} />
                <Text style={styles.emptyTitle}>{t("noEvents")}</Text>
                <Text style={styles.emptySub}>
                  {lang === "fr"
                    ? "Créez votre premier événement pour commencer."
                    : "Create your first event to get started."}
                </Text>
              </View>
            ) : (
              filtered.map((event) => {
                const eventDate = parseDateLocal(event.date);
                const isPast = !!eventDate && eventDate.getTime() < Date.now();
                const isCancelled = event.status === "cancelled";
                const cancelEvent = () => {
                  Alert.alert(
                    lang === "fr" ? "Annuler cet événement ?" : "Cancel this event?",
                    lang === "fr"
                      ? "Les utilisateurs verront un badge « Annulé » sur cet événement."
                      : "Users will see a 'Cancelled' badge on this event.",
                    [
                      { text: lang === "fr" ? "Retour" : "Back", style: "cancel" },
                      {
                        text: lang === "fr" ? "Annuler l'événement" : "Cancel event",
                        style: "destructive",
                        onPress: async () => {
                          if (!event.apiId) {
                            updateMyEvent(event.id, { status: "cancelled" });
                            return;
                          }
                          try {
                            const r = await authFetch(`${API_BASE}/partners/me/events/${event.apiId}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: "cancelled" }),
                            });
                            if (!r.ok) {
                              const err = await r.json().catch(() => ({}));
                              Alert.alert(
                                lang === "fr" ? "Action impossible" : "Action failed",
                                err?.error || (lang === "fr" ? "Impossible d'annuler cet événement." : "Unable to cancel this event."),
                              );
                              return;
                            }
                            updateMyEvent(event.id, { status: "cancelled" });
                          } catch {
                            Alert.alert(lang === "fr" ? "Erreur réseau" : "Network error", "");
                          } finally {
                            refreshApiEvents().catch(() => {});
                          }
                        },
                      },
                    ]
                  );
                };
                const deleteEvent = () => {
                  Alert.alert(
                    lang === "fr" ? "Supprimer cet événement ?" : "Delete this event?",
                    lang === "fr" ? "Cette action est irréversible." : "This action cannot be undone.",
                    [
                      { text: lang === "fr" ? "Retour" : "Back", style: "cancel" },
                      {
                        text: lang === "fr" ? "Supprimer" : "Delete",
                        style: "destructive",
                        onPress: async () => {
                          if (!event.apiId) {
                            removeMyEvent(event.id);
                            return;
                          }
                          try {
                            const r = await authFetch(`${API_BASE}/partners/me/events/${event.apiId}`, { method: "DELETE" });
                            if (!r.ok) {
                              const err = await r.json().catch(() => ({}));
                              Alert.alert(
                                lang === "fr" ? "Suppression impossible" : "Cannot delete",
                                err?.error || (lang === "fr" ? "Impossible de supprimer cet événement." : "Unable to delete this event."),
                              );
                              return;
                            }
                            removeMyEvent(event.id);
                          } catch {
                            Alert.alert(lang === "fr" ? "Erreur réseau" : "Network error", "");
                          } finally {
                            refreshApiEvents().catch(() => {});
                          }
                        },
                      },
                    ]
                  );
                };
                const editEvent = () => {
                  if (!event.apiId) {
                    Alert.alert(
                      lang === "fr" ? "Modification impossible" : "Cannot edit",
                      lang === "fr"
                        ? "Cet événement n'est pas synchronisé avec le serveur."
                        : "This event is not synced with the server.",
                    );
                    return;
                  }
                  safePush(`/create-event?editId=${event.apiId}&localId=${event.id}` as any);
                };
                const viewEvent = () => {
                  if (event.apiId) {
                    safePush(`/event/${event.apiId}`);
                  } else {
                    Alert.alert(
                      lang === "fr" ? "Aperçu indisponible" : "Preview unavailable",
                      lang === "fr"
                        ? "Cet événement n'est pas encore synchronisé avec le serveur."
                        : "This event is not synced with the server yet.",
                    );
                  }
                };
                const isOpen = openEventActionsId === event.id;
                const toggleActions = () =>
                  setOpenEventActionsId(isOpen ? null : event.id);
                // Auto-approbation : on peut éditer/annuler tant que l'event est dans le futur et pas déjà annulé.
                const canEdit = !isPast && !isCancelled;
                const canCancel = !isPast && !isCancelled && event.status === "approved";
                return (
                  <View key={event.id} style={[styles.eventRow, { flexDirection: "column", alignItems: "stretch", gap: 0 }]}>
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventTitle} numberOfLines={2}>
                        {lang === "fr" && event.titleFr ? event.titleFr : event.titleEn || event.titleFr}
                      </Text>
                      <Text style={styles.eventMeta}>
                        {formatDateLocalized(event.date, lang)}{event.time ? ` · ${event.time}` : ""} · {event.city}
                      </Text>
                      {event.createdAt ? (
                        <Text style={[styles.eventMeta, { fontSize: 11, opacity: 0.7, marginTop: 2 }]}>
                          {lang === "fr" ? "Posté le " : "Posted on "}
                          {formatDateTimeLocalized(event.createdAt, lang)}
                        </Text>
                      ) : null}
                      {/* Event price hidden by product decision. */}
                      <View style={{ flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(event.status, C) + "22", borderColor: getStatusColor(event.status, C) }
                        ]}>
                          <Text style={[styles.statusText, { color: getStatusColor(event.status, C) }]}>
                            {isCancelled
                              ? (lang === "fr" ? "Annulé" : "Cancelled")
                              : t(event.status as "pending" | "approved" | "rejected")}
                          </Text>
                        </View>
                        {isPast && !isCancelled && (
                          <View style={[styles.statusBadge, { backgroundColor: C.textMuted + "22", borderColor: C.textMuted }]}>
                            <Text style={[styles.statusText, { color: C.textMuted }]}>
                              {lang === "fr" ? "Passé" : "Past"}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={toggleActions}
                      activeOpacity={0.8}
                      style={[
                        styles.actionsToggle,
                        { backgroundColor: C.bg, borderColor: C.border },
                      ]}
                      accessibilityLabel={lang === "fr" ? "Actions" : "Actions"}
                    >
                      <Ionicons name="ellipsis-horizontal" size={16} color={C.textMuted} />
                      <Text style={[styles.actionsToggleText, { color: C.text }]}>
                        {lang === "fr" ? "Actions" : "Actions"}
                      </Text>
                      <Ionicons
                        name={isOpen ? "chevron-up" : "chevron-down"}
                        size={14}
                        color={C.textMuted}
                      />
                    </TouchableOpacity>

                    {isOpen && (
                      <View
                        style={[
                          styles.actionsDropdown,
                          { backgroundColor: C.bg, borderColor: C.border },
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.actionItem}
                          onPress={() => { setOpenEventActionsId(null); viewEvent(); }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="eye-outline" size={18} color={C.lavender} />
                          <Text style={[styles.actionItemText, { color: C.text }]}>
                            {lang === "fr" ? "Voir" : "View"}
                          </Text>
                        </TouchableOpacity>

                        {canEdit && (
                          <>
                            <View style={[styles.actionDivider, { backgroundColor: C.border }]} />
                            <TouchableOpacity
                              style={styles.actionItem}
                              onPress={() => { setOpenEventActionsId(null); editEvent(); }}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="create-outline" size={18} color={C.gold} />
                              <Text style={[styles.actionItemText, { color: C.text }]}>
                                {lang === "fr" ? "Modifier" : "Edit"}
                              </Text>
                            </TouchableOpacity>
                          </>
                        )}

                        {canCancel && (
                          <>
                            <View style={[styles.actionDivider, { backgroundColor: C.border }]} />
                            <TouchableOpacity
                              style={styles.actionItem}
                              onPress={() => { setOpenEventActionsId(null); cancelEvent(); }}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="close-circle-outline" size={18} color="#F59E0B" />
                              <Text style={[styles.actionItemText, { color: C.text }]}>
                                {lang === "fr" ? "Annuler" : "Cancel"}
                              </Text>
                            </TouchableOpacity>
                          </>
                        )}

                        <View style={[styles.actionDivider, { backgroundColor: C.border }]} />
                        <TouchableOpacity
                          style={styles.actionItem}
                          onPress={() => { setOpenEventActionsId(null); deleteEvent(); }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={18} color={C.error} />
                          <Text style={[styles.actionItemText, { color: C.error }]}>
                            {lang === "fr" ? "Supprimer" : "Delete"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            );
            })()}
          </>
        )}

        {/* ── Venues tab ── */}
        {tab === "venues" && (
          <>
            <TouchableOpacity style={styles.createBtn} onPress={openVenueModal}>
              <Ionicons name="add-circle" size={20} color={C.bg} />
              <Text style={styles.createBtnText}>{t("createVenue")}</Text>
            </TouchableOpacity>
            {myVenues.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="business-outline" size={44} color={C.border} />
                <Text style={styles.emptyTitle}>{t("noVenues")}</Text>
                <Text style={styles.emptySub}>
                  {lang === "fr"
                    ? "Ajoutez votre premier lieu pour le référencer sur NoStress."
                    : "Add your first venue to list it on NoStress."}
                </Text>
              </View>
            ) : (
              myVenues.map((venue) => {
                const vStatus = venue.status || "pending";
                const statusColor = vStatus === "approved" ? C.success : vStatus === "rejected" ? C.error : C.gold;
                const statusLabel = vStatus === "approved"
                  ? (lang === "fr" ? "Approuvé" : "Approved")
                  : vStatus === "rejected"
                  ? (lang === "fr" ? "Rejeté" : "Rejected")
                  : (lang === "fr" ? "En attente" : "Pending");
                const hasLocation = typeof venue.latitude === "number" && typeof venue.longitude === "number";
                return (
                  <View key={venue.id} style={[styles.venueRow, { flexDirection: "column", alignItems: "stretch", gap: 8 }]}>
                    <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                      <View style={[styles.venueIconBox, { backgroundColor: C.gold + "22" }]}>
                        <Ionicons name="business" size={20} color={C.gold} />
                      </View>
                      <View style={styles.eventInfo}>
                        <Text style={styles.eventTitle}>{venue.name}</Text>
                        <Text style={styles.eventMeta}>{venue.type} · {venue.city}</Text>
                        {venue.address ? (
                          <Text style={styles.eventMeta}>{venue.address}</Text>
                        ) : null}
                        <View style={{ flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                          <View style={[styles.statusBadge, { backgroundColor: statusColor + "22", borderColor: statusColor }]}>
                            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                          </View>
                          {!hasLocation && (
                            <View style={[styles.statusBadge, { backgroundColor: C.textMuted + "22", borderColor: C.textMuted }]}>
                              <Text style={[styles.statusText, { color: C.textMuted }]}>
                                {lang === "fr" ? "GPS manquant" : "GPS missing"}
                              </Text>
                            </View>
                          )}
                        </View>
                        {vStatus === "rejected" && venue.rejectionReason ? (
                          <Text style={[styles.eventMeta, { color: C.error, marginTop: 4 }]} numberOfLines={3}>
                            {venue.rejectionReason}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                      <TouchableOpacity
                        onPress={() => setVenueLocation(venue)}
                        style={[styles.venueActionBtn, { borderColor: C.lavender }]}
                      >
                        <Ionicons name="navigate" size={14} color={C.lavender} />
                        <Text style={[styles.venueActionText, { color: C.lavender }]}>
                          {hasLocation ? (lang === "fr" ? "Modifier GPS" : "Update GPS") : (lang === "fr" ? "Définir GPS" : "Set GPS")}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => openEditVenueModal(venue)}
                        style={[styles.venueActionBtn, { borderColor: C.gold }]}
                      >
                        <Ionicons name="create-outline" size={14} color={C.gold} />
                        <Text style={[styles.venueActionText, { color: C.gold }]}>
                          {lang === "fr" ? "Modifier" : "Edit"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => deleteVenue(venue.id)}
                        style={[styles.venueActionBtn, { borderColor: C.error }]}
                      >
                        <Ionicons name="trash-outline" size={14} color={C.error} />
                        <Text style={[styles.venueActionText, { color: C.error }]}>
                          {lang === "fr" ? "Supprimer" : "Delete"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

        {/* ── Plan tab ── */}
        {tab === "plan" && (
          <View style={styles.planComingSoonWrap}>
            <View style={styles.planComingSoonIconWrap}>
              <Ionicons name="construct" size={48} color={C.gold ?? "#FFD700"} />
            </View>
            <Text style={[styles.planComingSoonTitle, { color: C.text }]}>
              {lang === "fr" ? "Abonnements" : "Subscriptions"}
            </Text>
            <Text style={[styles.planComingSoonSub, { color: C.textMuted }]}>
              {lang === "fr"
                ? "En construction — disponible bientôt"
                : "Under construction — coming soon"}
            </Text>
            <Text style={[styles.planComingSoonDesc, { color: C.textMuted }]}>
              {lang === "fr"
                ? "Les offres partenaires sont actuellement gratuites pendant la phase bêta. Les plans payants seront bientôt disponibles."
                : "Partner plans are currently free during the beta phase. Paid plans will be available soon."}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Venue Creation Modal ── */}
      <Modal visible={showVenueModal} animationType="slide" transparent onRequestClose={() => setShowVenueModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { backgroundColor: C.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: C.text }]}>
                  {lang === "fr" ? "Nouveau lieu" : "New Venue"}
                </Text>
                <TouchableOpacity onPress={() => setShowVenueModal(false)}>
                  <Ionicons name="close" size={22} color={C.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
                <Text style={[styles.modalLabel, { color: C.textMuted }]}>
                  {lang === "fr" ? "Nom du lieu *" : "Venue name *"}
                </Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder={lang === "fr" ? "Ex : Club Évasion" : "e.g. Club Évasion"}
                  placeholderTextColor={C.textMuted}
                  value={venueName}
                  onChangeText={setVenueName}
                />

                <Text style={[styles.modalLabel, { color: C.textMuted }]}>
                  {lang === "fr" ? "Type de lieu" : "Venue type"}
                </Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, marginBottom: 8 }]}
                  placeholder={lang === "fr" ? "Filtrer les types…" : "Filter types…"}
                  placeholderTextColor={C.textMuted}
                  value={venueTypeSearch}
                  onChangeText={setVenueTypeSearch}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {configVenueTypes
                      .filter(vt => !venueTypeSearch.trim() || (lang === "fr" ? vt.labelFr : vt.labelEn).toLowerCase().includes(venueTypeSearch.toLowerCase()))
                      .map((vt) => {
                        const label = lang === "fr" ? vt.labelFr : vt.labelEn;
                        return (
                          <TouchableOpacity
                            key={vt.key}
                            onPress={() => setVenueType(label)}
                            style={[styles.typeChip, {
                              backgroundColor: venueType === label ? C.lavender : C.bg,
                              borderColor: venueType === label ? C.lavender : C.border,
                            }]}
                          >
                            <Text style={[styles.typeChipText, { color: venueType === label ? C.bg : C.textMuted }]}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                </ScrollView>

                <Text style={[styles.modalLabel, { color: C.textMuted }]}>
                  {lang === "fr" ? "Ville *" : "City *"}
                </Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, marginBottom: 8 }]}
                  placeholder={lang === "fr" ? "Filtrer les villes…" : "Filter cities…"}
                  placeholderTextColor={C.textMuted}
                  value={venueCitySearch}
                  onChangeText={setVenueCitySearch}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {configCities
                      .filter(c => (!partnerCountryId || String(c.countryId) === partnerCountryId) && (!venueCitySearch.trim() || c.name.toLowerCase().includes(venueCitySearch.trim().toLowerCase())))
                      .filter((c, idx, arr) => arr.findIndex(x => x.name === c.name) === idx)
                      .map((c) => (
                        <TouchableOpacity
                          key={c.slug}
                          onPress={() => setVenueCity(c.name)}
                          style={[styles.typeChip, {
                            backgroundColor: venueCity === c.name ? C.gold : C.bg,
                            borderColor: venueCity === c.name ? C.gold : C.border,
                          }]}
                        >
                          <Text style={[styles.typeChipText, { color: venueCity === c.name ? C.bg : C.textMuted }]}>
                            {c.emoji} {c.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                </ScrollView>

                <Text style={[styles.modalLabel, { color: C.textMuted }]}>
                  {lang === "fr" ? "Adresse" : "Address"}
                </Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder={lang === "fr" ? "Ex : Rue 15, Quartier Be, Lomé" : "e.g. Rue 15, Quartier Be, Lomé"}
                  placeholderTextColor={C.textMuted}
                  value={venueAddress}
                  onChangeText={setVenueAddress}
                />

                <Text style={[styles.modalLabel, { color: C.textMuted }]}>
                  {lang === "fr" ? "Description" : "Description"}
                </Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, height: 80, textAlignVertical: "top" }]}
                  placeholder={lang === "fr" ? "Décrivez votre lieu…" : "Describe your venue…"}
                  placeholderTextColor={C.textMuted}
                  value={venueDesc}
                  onChangeText={setVenueDesc}
                  multiline
                />

                <Text style={[styles.modalLabel, { color: C.textMuted }]}>
                  {lang === "fr" ? "Heures d'ouverture et fermeture" : "Opening & closing hours"}
                </Text>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{lang === "fr" ? "Ouverture" : "Opening"}</Text>
                    <TimeField
                      style={[styles.modalInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                      placeholder="08:00"
                      placeholderTextColor={C.textMuted}
                      textColor={C.text}
                      value={venueOpening}
                      onChange={setVenueOpening}
                      lang={lang as "fr" | "en"}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{lang === "fr" ? "Fermeture" : "Closing"}</Text>
                    <TimeField
                      style={[styles.modalInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                      placeholder="22:00"
                      placeholderTextColor={C.textMuted}
                      textColor={C.text}
                      value={venueClosing}
                      onChange={setVenueClosing}
                      lang={lang as "fr" | "en"}
                    />
                  </View>
                </View>
                <Text style={{ fontSize: 10, color: C.textMuted, marginTop: -8, marginBottom: 12 }}>
                  {lang === "fr" ? "Format 24h (HH:MM). Optionnel." : "24h format (HH:MM). Optional."}
                </Text>

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Text style={[styles.modalLabel, { color: C.textMuted, marginBottom: 0 }]}>
                    {lang === "fr" ? "Spécialités / Menu" : "Specialties / Menu"}
                  </Text>
                  <TouchableOpacity onPress={addSpecialty} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.lavender + "22", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                    <Ionicons name="add" size={14} color={C.lavender} />
                    <Text style={{ fontSize: 12, color: C.lavender, fontFamily: "Inter_600SemiBold" }}>{lang === "fr" ? "Ajouter" : "Add"}</Text>
                  </TouchableOpacity>
                </View>
                {venueSpecialties.map((sp, idx) => (
                  <View key={idx} style={{ backgroundColor: C.bg, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 10, marginBottom: 10, flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity onPress={() => pickSpecialtyImage(idx)} style={{ width: 70, height: 70, borderRadius: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      {sp.imageUrl ? (
                        <Image source={{ uri: sp.imageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                      ) : (
                        <Ionicons name="image-outline" size={22} color={C.textMuted} />
                      )}
                    </TouchableOpacity>
                    <View style={{ flex: 1, gap: 6 }}>
                      <TextInput
                        style={[styles.modalInput, { backgroundColor: C.card, borderColor: C.border, color: C.text, marginBottom: 0, paddingVertical: 6, fontSize: 13 }]}
                        placeholder={lang === "fr" ? "Nom *" : "Name *"}
                        placeholderTextColor={C.textMuted}
                        value={sp.name}
                        onChangeText={(v) => setVenueSpecialties((prev) => prev.map((s, i) => i === idx ? { ...s, name: v } : s))}
                      />
                      <TextInput
                        style={[styles.modalInput, { backgroundColor: C.card, borderColor: C.border, color: C.text, marginBottom: 0, paddingVertical: 6, fontSize: 12 }]}
                        placeholder={lang === "fr" ? "Description (optionnelle)" : "Description (optional)"}
                        placeholderTextColor={C.textMuted}
                        value={sp.description}
                        onChangeText={(v) => setVenueSpecialties((prev) => prev.map((s, i) => i === idx ? { ...s, description: v } : s))}
                      />
                      <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                        <TextInput
                          style={[styles.modalInput, { backgroundColor: C.card, borderColor: C.border, color: C.text, marginBottom: 0, paddingVertical: 6, fontSize: 12, flex: 1 }]}
                          placeholder={lang === "fr" ? "Prix FCFA (optionnel)" : "Price FCFA (optional)"}
                          placeholderTextColor={C.textMuted}
                          value={sp.price}
                          onChangeText={(v) => setVenueSpecialties((prev) => prev.map((s, i) => i === idx ? { ...s, price: v.replace(/[^0-9]/g, "") } : s))}
                          keyboardType="numeric"
                        />
                        <TouchableOpacity onPress={() => removeSpecialty(idx)} style={{ padding: 6 }}>
                          <Ionicons name="trash-outline" size={18} color={C.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}

                <Text style={[styles.modalLabel, { color: C.textMuted }]}>
                  {lang === "fr" ? `Photos du lieu (max ${MAX_VENUE_IMAGES})` : `Venue photos (max ${MAX_VENUE_IMAGES})`}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  {venueImages.map((uri, idx) => (
                    <View key={`${idx}-${uri}`} style={{ position: "relative", width: "48%", aspectRatio: 16 / 9, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: C.border }}>
                      <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                      <TouchableOpacity
                        style={{ position: "absolute", top: 4, right: 4, backgroundColor: C.error, borderRadius: 12, width: 24, height: 24, alignItems: "center", justifyContent: "center" }}
                        onPress={() => setVenueImages((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Ionicons name="close" size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {venueImages.length < MAX_VENUE_IMAGES ? (
                    <View style={{ width: "48%", aspectRatio: 16 / 9, flexDirection: "row", gap: 6 }}>
                      <TouchableOpacity
                        style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10 }}
                        onPress={async () => {
                          const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ["images"],
                            allowsMultipleSelection: true,
                            selectionLimit: MAX_VENUE_IMAGES - venueImages.length,
                            quality: 0.8,
                          });
                          if (!result.canceled && result.assets?.length) {
                            setVenueImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, MAX_VENUE_IMAGES));
                          }
                        }}
                      >
                        <Ionicons name="images-outline" size={20} color={C.lavender} />
                        <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: C.lavender }}>
                          {lang === "fr" ? "Galerie" : "Gallery"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10 }}
                        onPress={async () => {
                          const perm = await ImagePicker.requestCameraPermissionsAsync();
                          if (!perm.granted) {
                            Alert.alert(lang === "fr" ? "Permission requise" : "Permission required", lang === "fr" ? "Autorisez l'accès à la caméra." : "Allow camera access.");
                            return;
                          }
                          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [16, 9], quality: 0.8 });
                          if (!result.canceled && result.assets[0]) {
                            setVenueImages((prev) => [...prev, result.assets[0].uri].slice(0, MAX_VENUE_IMAGES));
                          }
                        }}
                      >
                        <Ionicons name="camera-outline" size={20} color={C.gold} />
                        <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: C.gold }}>
                          {lang === "fr" ? "Caméra" : "Camera"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              </ScrollView>

              <TouchableOpacity style={[styles.createBtn, { marginTop: 16 }]} onPress={saveVenue}>
                <Ionicons name="checkmark-circle" size={20} color={C.bg} />
                <Text style={styles.createBtnText}>
                  {lang === "fr" ? "Enregistrer le lieu" : "Save Venue"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function StatCard({ icon, value, label, color, statStyles }: { icon: string; value: number; label: string; color: string; statStyles: ReturnType<typeof makeStatStyles> }) {
  return (
    <View style={statStyles.card}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function getStatusColor(status: string, C: ColorPalette): string {
  switch (status) {
    case "approved": return C.success;
    case "rejected": return C.error;
    default: return C.gold;
  }
}

const makeStatStyles = (C: ColorPalette) => StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  value: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    textAlign: "center",
  },
});

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  /* Gate screens */
  gateBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  gateIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  gateTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: C.text,
    textAlign: "center",
  },
  gateSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  gateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.lavender,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: "100%",
    justifyContent: "center",
    marginTop: 4,
  },
  gateBtnText: {
    color: C.bg,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  gateBtnSecondary: {
    paddingVertical: 12,
    alignItems: "center",
    width: "100%",
  },
  gateBtnSecondaryText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: C.lavender,
  },

  /* Header */
  header: {
    backgroundColor: C.bg,
    paddingHorizontal: 20,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 14,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  headerName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  planBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 4,
    gap: 4,
    marginBottom: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  tabBtnActive: { backgroundColor: C.card2 },
  tabText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
  },
  tabTextActive: {
    color: C.lavender,
    fontFamily: "Inter_600SemiBold",
  },
  content: { padding: 20, gap: 12 },

  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.lavender,
    borderRadius: 12,
    paddingVertical: 14,
  },
  createBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.bg,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  eventInfo: { flex: 1, gap: 3 },
  eventTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  eventMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  eventPrice: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: C.gold,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actionsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionsToggleText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  actionsDropdown: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  actionItemText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  actionDivider: {
    height: 1,
    width: "100%",
  },

  /* Plans */
  planTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: C.text,
    marginBottom: 4,
  },
  planComingSoonWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 12,
  },
  planComingSoonIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#FFD70018",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  planComingSoonTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  planComingSoonSub: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  planComingSoonDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 4,
    maxWidth: 300,
  },
  planCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
    position: "relative",
    overflow: "hidden",
  },
  planCardActive: { backgroundColor: C.lavender, borderColor: C.lavender },
  planCardPopular: { borderColor: C.gold },
  popularBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: C.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  popularText: { fontSize: 11, fontFamily: "Inter_700Bold", color: C.bg },
  planName: { fontSize: 20, fontFamily: "Inter_700Bold", color: C.text },
  planPriceRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  planPrice: { fontSize: 26, fontFamily: "Inter_700Bold", color: C.gold },
  planPeriod: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textMuted },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.text },
  upgradeBtn: {
    backgroundColor: C.lavender,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  upgradeBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.bg },
  currentBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 4,
  },
  currentBadgeText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.bg },

  venueRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  venueIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  venueActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  venueActionText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    gap: 0,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  modalLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 6,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
