import React, { useState, useCallback, useEffect } from "react";
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
import * as ImagePicker from "expo-image-picker";

import { C } from "@/constants/colors";
import { useT, useApp, useColors } from "@/context/AppContext";
import { MOCK_SUBSCRIPTION_PLANS, MOCK_CITIES } from "@/constants/data";

interface MyVenue {
  id: string;
  name: string;
  type: string;
  city: string;
  address: string;
  description: string;
  imageUrl?: string;
  createdAt: string;
}

const VENUE_TYPES_FR = ["Boîte de nuit", "Bar", "Restaurant", "Salle de concert", "Plage", "Stade", "Salle culturelle", "Autre"];
const VENUE_TYPES_EN = ["Nightclub", "Bar", "Restaurant", "Concert Hall", "Beach", "Stadium", "Cultural Center", "Other"];
const NS_MY_VENUES_KEY = "ns_my_venues";

type DashTab = "events" | "venues" | "plan";
type PartnerCheckStatus = "loading" | "pending" | "approved" | "rejected" | null;

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

export default function DashboardScreen() {
  const t = useT();
  const { user, lang, myEvents, setUser } = useApp();
  const insets = useSafeAreaInsets();
  const C = useColors();

  const [tab, setTab] = useState<DashTab>("events");
  const [partnerCheck, setPartnerCheck] = useState<PartnerCheckStatus>(null);
  const [partnerRejectReason, setPartnerRejectReason] = useState<string | null>(null);
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const [myVenues, setMyVenues] = useState<MyVenue[]>([]);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [venueName, setVenueName] = useState("");
  const [venueType, setVenueType] = useState("");
  const [venueCity, setVenueCity] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [venueDesc, setVenueDesc] = useState("");
  const [venueImageUrl, setVenueImageUrl] = useState("");

  useEffect(() => {
    AsyncStorage.getItem(NS_MY_VENUES_KEY).then((v) => {
      if (v) setMyVenues(JSON.parse(v));
    });
  }, []);

  const openVenueModal = () => {
    setVenueName(""); setVenueType(""); setVenueCity(""); setVenueAddress(""); setVenueDesc(""); setVenueImageUrl("");
    setShowVenueModal(true);
  };

  const saveVenue = () => {
    if (!venueName.trim()) {
      Alert.alert(lang === "fr" ? "Nom requis" : "Name required", lang === "fr" ? "Veuillez entrer un nom pour le lieu." : "Please enter a name for the venue.");
      return;
    }
    if (!venueCity.trim()) {
      Alert.alert(lang === "fr" ? "Ville requise" : "City required", lang === "fr" ? "Veuillez sélectionner une ville." : "Please select a city.");
      return;
    }
    const newVenue: MyVenue = {
      id: "ven_" + Date.now(),
      name: venueName.trim(),
      type: venueType || (lang === "fr" ? "Autre" : "Other"),
      city: venueCity.trim(),
      address: venueAddress.trim(),
      description: venueDesc.trim(),
      imageUrl: venueImageUrl || undefined,
      createdAt: new Date().toISOString(),
    };
    setMyVenues((prev) => {
      const next = [newVenue, ...prev];
      AsyncStorage.setItem(NS_MY_VENUES_KEY, JSON.stringify(next));
      return next;
    });
    setShowVenueModal(false);
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
          onPress: () => {
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

  const checkPartnerStatus = useCallback(() => {
    if (!user || user.role !== "structure") return;
    setPartnerCheck("loading");
    fetch(`${API_BASE}/partners/status?email=${encodeURIComponent(user.email)}`)
      .then((r) => r.json())
      .then((data) => {
        const status: PartnerCheckStatus = data.status ?? "pending";
        setPartnerCheck(status);
        setPartnerRejectReason(data.rejectionReason ?? null);
        if (status !== user.partnerStatus) {
          setUser({ ...user, partnerStatus: status });
        }
      })
      .catch(() => {
        setPartnerCheck(user.partnerStatus ?? "pending");
      });
  }, [user?.email, user?.role]);

  useFocusEffect(
    useCallback(() => {
      checkPartnerStatus();
    }, [checkPartnerStatus])
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
          <TouchableOpacity style={styles.gateBtn} onPress={() => router.push("/auth")}>
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
            onPress={() => router.push("/auth")}
          >
            <Ionicons name="add-circle-outline" size={18} color={C.bg} />
            <Text style={styles.gateBtnText}>{t("partnerOnlyCreate")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gateBtnSecondary}
            onPress={() => router.push("/auth")}
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
              onPress={() => router.push("/auth")}
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
          <StatCard icon="calendar" value={myEvents.length} label={t("myEvents")} color={C.lavender} />
          <StatCard icon="business" value={myVenues.length} label={t("myVenues")} color={C.gold} />
          <StatCard icon="people" value={0} label="Participants" color={C.success} />
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
        {/* ── Events tab ── */}
        {tab === "events" && (
          <>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => router.push("/create-event")}
            >
              <Ionicons name="add-circle" size={20} color={C.bg} />
              <Text style={styles.createBtnText}>{t("createEvent")}</Text>
            </TouchableOpacity>

            {myEvents.length === 0 ? (
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
              myEvents.map((event) => (
                <View key={event.id} style={styles.eventRow}>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>
                      {lang === "fr" && event.titleFr ? event.titleFr : event.titleEn || event.titleFr}
                    </Text>
                    <Text style={styles.eventMeta}>
                      {event.date} · {event.city}
                    </Text>
                    <Text style={styles.eventPrice}>
                      {event.isFree
                        ? t("free")
                        : `${event.priceFCFA.toLocaleString()} FCFA`}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(event.status) + "22", borderColor: getStatusColor(event.status) }
                  ]}>
                    <Text style={[styles.statusText, { color: getStatusColor(event.status) }]}>
                      {t(event.status)}
                    </Text>
                  </View>
                </View>
              ))
            )}
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
              myVenues.map((venue) => (
                <View key={venue.id} style={styles.venueRow}>
                  <View style={[styles.venueIconBox, { backgroundColor: C.gold + "22" }]}>
                    <Ionicons name="business" size={20} color={C.gold} />
                  </View>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{venue.name}</Text>
                    <Text style={styles.eventMeta}>{venue.type} · {venue.city}</Text>
                    {venue.address ? (
                      <Text style={styles.eventMeta}>{venue.address}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity onPress={() => deleteVenue(venue.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={18} color={C.error} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}

        {/* ── Plan tab ── */}
        {tab === "plan" && (
          <>
            <Text style={styles.planTitle}>{t("choosePlan")}</Text>
            {MOCK_SUBSCRIPTION_PLANS.map((plan) => {
              const isCurrent = plan.id === activePlan.id;
              const name = lang === "fr" ? plan.nameFr : plan.name;
              const features = lang === "fr" ? plan.featuresFr : plan.features;
              return (
                <View
                  key={plan.id}
                  style={[
                    styles.planCard,
                    isCurrent && styles.planCardActive,
                    plan.isPopular && styles.planCardPopular,
                  ]}
                >
                  {plan.isPopular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>Popular</Text>
                    </View>
                  )}
                  <Text style={styles.planName}>{name}</Text>
                  <View style={styles.planPriceRow}>
                    <Text style={styles.planPrice}>
                      {plan.monthlyPriceFCFA === 0 ? t("free") : `${plan.monthlyPriceFCFA.toLocaleString()} FCFA`}
                    </Text>
                    {plan.monthlyPriceFCFA > 0 && (
                      <Text style={styles.planPeriod}>{t("perMonth")}</Text>
                    )}
                  </View>
                  {features.map((feature, i) => (
                    <View key={i} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={16} color={isCurrent ? C.bg : C.success} />
                      <Text style={[styles.featureText, isCurrent && { color: C.bg }]}>{feature}</Text>
                    </View>
                  ))}
                  {!isCurrent && (
                    <TouchableOpacity style={styles.upgradeBtn}>
                      <Text style={styles.upgradeBtnText}>{t("upgrade")} {name}</Text>
                    </TouchableOpacity>
                  )}
                  {isCurrent && (
                    <View style={styles.currentBadge}>
                      <Ionicons name="checkmark" size={14} color={C.bg} />
                      <Text style={styles.currentBadgeText}>{t("currentPlan")}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </>
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
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {(lang === "fr" ? VENUE_TYPES_FR : VENUE_TYPES_EN).map((type) => (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setVenueType(type)}
                        style={[styles.typeChip, {
                          backgroundColor: venueType === type ? C.lavender : C.bg,
                          borderColor: venueType === type ? C.lavender : C.border,
                        }]}
                      >
                        <Text style={[styles.typeChipText, { color: venueType === type ? C.bg : C.textMuted }]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text style={[styles.modalLabel, { color: C.textMuted }]}>
                  {lang === "fr" ? "Ville *" : "City *"}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {MOCK_CITIES.map((c) => (
                      <TouchableOpacity
                        key={c.name}
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
                  {lang === "fr" ? "Photo du lieu" : "Venue photo"}
                </Text>
                {venueImageUrl ? (
                  <View style={{ borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: C.border, marginBottom: 12 }}>
                    <Image source={{ uri: venueImageUrl }} style={{ width: "100%", height: 140, borderRadius: 12 }} resizeMode="cover" />
                    <TouchableOpacity
                      style={{
                        position: "absolute", top: 6, right: 6, backgroundColor: C.error,
                        borderRadius: 14, width: 28, height: 28, alignItems: "center", justifyContent: "center",
                      }}
                      onPress={() => setVenueImageUrl("")}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
                        backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10,
                        paddingVertical: 20,
                      }}
                      onPress={async () => {
                        const result = await ImagePicker.launchImageLibraryAsync({
                          mediaTypes: ["images"],
                          allowsEditing: true,
                          aspect: [16, 9],
                          quality: 0.8,
                        });
                        if (!result.canceled && result.assets[0]) {
                          setVenueImageUrl(result.assets[0].uri);
                        }
                      }}
                    >
                      <Ionicons name="images-outline" size={18} color={C.lavender} />
                      <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: C.lavender }}>
                        {lang === "fr" ? "Galerie" : "Gallery"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
                        backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10,
                        paddingVertical: 20,
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
                          setVenueImageUrl(result.assets[0].uri);
                        }
                      }}
                    >
                      <Ionicons name="camera-outline" size={18} color={C.gold} />
                      <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: C.gold }}>
                        {lang === "fr" ? "Caméra" : "Camera"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
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

function StatCard({ icon, value, label, color }: { icon: string; value: number; label: string; color: string }) {
  return (
    <View style={statStyles.card}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case "approved": return C.success;
    case "rejected": return C.error;
    default: return C.gold;
  }
}

const statStyles = StyleSheet.create({
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

const styles = StyleSheet.create({
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

  /* Plans */
  planTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: C.text,
    marginBottom: 4,
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
