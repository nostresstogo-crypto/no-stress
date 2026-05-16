import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { safePush } from "@/lib/navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ColorPalette } from "@/constants/colors";
import { useT, useApp, useColors } from "@/context/AppContext";
import { MOCK_VENUES, MOCK_EVENTS } from "@/constants/data";
import { API_BASE } from "@/lib/apiBase";
import ReportButton from "@/components/ReportButton";
import MapPreview from "@/components/MapPreview";
import ReviewModal from "@/components/ReviewModal";

type Specialty = {
  id: string;
  name: string;
  imageUrl: string;
  description?: string | null;
  price?: number | null;
};

type Venue = {
  id: string;
  name: string;
  type?: string;
  city?: string;
  country?: string | null;
  address?: string;
  description?: string;
  imageUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
  isVerified?: boolean;
  openingTime?: string | null;
  closingTime?: string | null;
  specialties?: Specialty[];
};

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { lang, user, authFetch, toggleFavoriteVenue, isFavoriteVenue } = useApp();
  const insets = useSafeAreaInsets();

  const [apiVenue, setApiVenue] = useState<Venue | null>(null);
  const [apiEvents, setApiEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // URI de l'image plein écran à afficher dans le viewer modal (null = fermé).
  const [zoomImage, setZoomImage] = useState<{ uri: string; name?: string } | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const isApi = typeof id === "string" && id.startsWith("api_");
  const apiNumId = isApi ? id.slice(4) : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isApi) {
        setLoading(false);
        return;
      }
      try {
        const [rv, re] = await Promise.all([
          fetch(`${API_BASE}/venues/${apiNumId}`),
          fetch(`${API_BASE}/events?venueId=${apiNumId}&includeArchived=1&limit=200`),
        ]);
        if (!cancelled && rv.ok) {
          const data = await rv.json();
          setApiVenue({
            id: `api_${data.id}`,
            name: data.name || "",
            type: data.type || "",
            city: data.city || "",
            country: data.country || null,
            address: data.address || "",
            description: data.description || "",
            imageUrl: data.imageUrl || undefined,
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
            isVerified: !!data.isVerified,
            openingTime: data.openingTime ?? null,
            closingTime: data.closingTime ?? null,
            specialties: Array.isArray(data.specialties) ? data.specialties : [],
          });
        }
        if (!cancelled && re.ok) {
          const data = await re.json();
          setApiEvents(Array.isArray(data?.events) ? data.events : []);
        }
      } catch {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [isApi, apiNumId]);

  const venue: Venue | undefined = useMemo(() => {
    if (isApi) return apiVenue ?? undefined;
    return MOCK_VENUES.find((v) => v.id === id) as Venue | undefined;
  }, [isApi, apiVenue, id]);

  // Sépare les événements à venir (date >= aujourd'hui) et passés.
  // - Côté API : on a fetché avec includeArchived=1 pour récupérer tout l'historique du lieu.
  // - Côté mock (MOCK_EVENTS) : on fait le même filtre par date.
  useEffect(() => {
    if (!isApi || !apiNumId) return;
    let cancelled = false;
    setReviewsLoading(true);
    fetch(`${API_BASE}/reviews?itemType=venue&itemId=${apiNumId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) {
          setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
          setAvgRating(typeof data?.avgRating === "number" ? data.avgRating : null);
        }
      })
      .catch(() => { if (!cancelled) setReviews([]); })
      .finally(() => { if (!cancelled) setReviewsLoading(false); });
    return () => { cancelled = true; };
  }, [isApi, apiNumId]);

  const refreshReviews = useCallback(() => {
    if (!apiNumId) return;
    fetch(`${API_BASE}/reviews?itemType=venue&itemId=${apiNumId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
        setAvgRating(typeof data?.avgRating === "number" ? data.avgRating : null);
      })
      .catch(() => {});
  }, [apiNumId]);

  const { upcomingEvents, pastEvents } = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let all: any[] = [];
    if (isApi) {
      // L'écran event/[id].tsx attend l'id numérique brut (il fait `fetch /events/${id}`),
      // surtout pas `api_${id}` — sinon le fetch retourne 404 et la page affiche "noData".
      all = apiEvents.map((e) => ({
        ...e,
        id: String(e.id),
        title: e.title || "",
        titleFr: e.titleFr || null,
      }));
    } else if (venue) {
      all = MOCK_EVENTS.filter(
        (e) =>
          e.venueId === venue.id ||
          ((e as any).venueName && venue.name &&
            (e as any).venueName.toLowerCase() === venue.name.toLowerCase()),
      );
    }
    const upcoming = all
      .filter((e) => (e.date || "") >= today)
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const past = all
      .filter((e) => (e.date || "") < today)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return { upcomingEvents: upcoming, pastEvents: past };
  }, [isApi, apiEvents, venue]);

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={C.lavender} />
      </View>
    );
  }

  if (!venue) {
    return (
      <View style={[styles.root, styles.center]}>
        <Ionicons name="business-outline" size={48} color={C.border} />
        <Text style={styles.emptyText}>
          {lang === "fr" ? "Lieu introuvable" : "Venue not found"}
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>
            {lang === "fr" ? "Retour" : "Go back"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasCoords =
    venue.latitude != null &&
    venue.longitude != null &&
    Number.isFinite(venue.latitude) &&
    Number.isFinite(venue.longitude);

  const openMaps = () => {
    const queryText = [venue.name, venue.address, venue.city, venue.country || "Togo"]
      .filter(Boolean)
      .join(", ");
    const query = encodeURIComponent(queryText);

    let url: string;
    if (hasCoords) {
      const lat = venue.latitude;
      const lng = venue.longitude;
      url = Platform.select({
        ios: `maps:0,0?q=${query}&ll=${lat},${lng}`,
        android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(venue.name)})`,
        default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      }) as string;
    } else {
      url = Platform.select({
        ios: `maps:0,0?q=${query}`,
        android: `geo:0,0?q=${query}`,
        default: `https://www.google.com/maps/search/?api=1&query=${query}`,
      }) as string;
    }
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    });
  };

  const typeIcon = getTypeIcon(venue.type || "");

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero image */}
        <View style={styles.hero}>
          {venue.imageUrl ? (
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={() => setZoomImage({ uri: venue.imageUrl as string, name: venue.name })}
              accessibilityRole="imagebutton"
              accessibilityLabel={lang === "fr" ? `Agrandir la photo de ${venue.name}` : `Zoom on ${venue.name}`}
            >
              <Image
                source={{ uri: venue.imageUrl }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <Ionicons name="business" size={72} color={C.lavender} />
              <Text style={styles.heroPlaceholderLabel}>Aucune photo</Text>
            </View>
          )}

          <LinearGradient
            colors={["transparent", C.bg]}
            locations={[0.5, 1.0]}
            style={styles.heroOverlay}
          />

          <TouchableOpacity
            style={[styles.navBtn, { top: (insets.top || 20) + 8 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>

          <View style={{ position: "absolute", top: (insets.top || 20) + 8, right: 16, flexDirection: "row", gap: 8 }}>
            {user?.role === "user" && isApi && (
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => toggleFavoriteVenue(venue.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={isFavoriteVenue(venue.id) ? "heart" : "heart-outline"}
                  size={20}
                  color={isFavoriteVenue(venue.id) ? "#ef4444" : C.text}
                />
              </TouchableOpacity>
            )}
            {isApi && <ReportButton itemType="venue" itemId={venue.id} variant="icon" />}
          </View>

          {venue.isVerified && (
            <View style={styles.verifiedHero}>
              <Ionicons name="checkmark-circle" size={14} color={C.gold} />
              <Text style={styles.verifiedHeroText}>
                {lang === "fr" ? "Vérifié" : "Verified"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View style={styles.typeIconWrap}>
              <Ionicons name={typeIcon as any} size={20} color={C.lavender} />
            </View>
            <View style={styles.titleInfo}>
              {venue.type ? <Text style={styles.typePill}>{venue.type}</Text> : null}
              <Text style={styles.venueName}>{venue.name}</Text>
            </View>
          </View>

          {venue.address ? (
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Ionicons name="location" size={16} color={C.gold} />
              </View>
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>
                  {lang === "fr" ? "Adresse" : "Address"}
                </Text>
                <Text style={styles.infoValue}>{venue.address}</Text>
              </View>
            </View>
          ) : null}

          {venue.city ? (
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Ionicons name="map" size={16} color={C.lavender} />
              </View>
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>
                  {lang === "fr" ? "Ville" : "City"}
                </Text>
                <Text style={styles.infoValue}>
                  {venue.city}{venue.country ? ` · ${venue.country}` : " · Togo"}
                </Text>
              </View>
            </View>
          ) : null}

          {(venue.openingTime || venue.closingTime) ? (
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Ionicons name="time" size={16} color={C.lavender} />
              </View>
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>
                  {lang === "fr" ? "Horaires" : "Hours"}
                </Text>
                <Text style={styles.infoValue}>
                  {venue.openingTime || "—"} → {venue.closingTime || "—"}
                </Text>
              </View>
            </View>
          ) : null}

          {venue.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {lang === "fr" ? "À propos" : "About"}
              </Text>
              <Text style={styles.description}>{venue.description}</Text>
            </View>
          ) : null}

          {venue.specialties && venue.specialties.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {lang === "fr" ? `Spécialités (${venue.specialties.length})` : `Specialties (${venue.specialties.length})`}
              </Text>
              {venue.specialties.map((sp) => (
                <View key={sp.id} style={styles.specialtyRow}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => sp.imageUrl && setZoomImage({ uri: sp.imageUrl, name: sp.name })}
                    accessibilityRole="imagebutton"
                    accessibilityLabel={lang === "fr" ? `Agrandir ${sp.name}` : `Zoom on ${sp.name}`}
                  >
                    <Image source={{ uri: sp.imageUrl }} style={styles.specialtyImage} resizeMode="cover" />
                    <View style={styles.specialtyZoomBadge}>
                      <Ionicons name="expand" size={12} color="#fff" />
                    </View>
                  </TouchableOpacity>
                  <View style={styles.specialtyInfo}>
                    <Text style={styles.specialtyName} numberOfLines={1}>{sp.name}</Text>
                    {sp.description ? (
                      <Text style={styles.specialtyDesc} numberOfLines={2}>{sp.description}</Text>
                    ) : null}
                    {sp.price != null ? (
                      <Text style={styles.specialtyPrice}>
                        {sp.price.toLocaleString()} FCFA
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {hasCoords ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {lang === "fr" ? "Position" : "Location"}
              </Text>
              <MapPreview
                latitude={venue.latitude as number}
                longitude={venue.longitude as number}
                height={200}
              />
            </View>
          ) : null}

          <TouchableOpacity style={styles.mapsBtn} onPress={openMaps}>
            <Ionicons name="navigate" size={18} color={C.bg} />
            <Text style={styles.mapsBtnText}>
              {lang === "fr" ? "Itinéraire / Maps" : "Directions / Maps"}
            </Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {lang === "fr"
                ? `Événements à venir (${upcomingEvents.length})`
                : `Upcoming events (${upcomingEvents.length})`}
            </Text>
            {upcomingEvents.length === 0 ? (
              <View style={styles.emptyEvents}>
                <Ionicons name="calendar-outline" size={32} color={C.border} />
                <Text style={styles.emptyEventsText}>
                  {lang === "fr"
                    ? "Aucun événement prévu"
                    : "No upcoming events"}
                </Text>
              </View>
            ) : (
              upcomingEvents.map((event) => {
                const title =
                  lang === "fr" && event.titleFr ? event.titleFr : event.title;
                return (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.eventRow}
                    onPress={() => safePush(`/event/${event.id}`)}
                    activeOpacity={0.8}
                  >
                    {event.imageUrl ? (
                      <Image
                        source={{ uri: event.imageUrl }}
                        style={styles.eventThumb}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.eventDateBox}>
                        <Text style={styles.eventDay}>
                          {(event.date || "").split("-")[2] || "—"}
                        </Text>
                        <Text style={styles.eventMonth}>
                          {getMonthShort(event.date || "", lang)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventTitle} numberOfLines={1}>
                        {title}
                      </Text>
                      <Text style={styles.eventDate}>
                        {formatEventDate(event.date || "", lang)}
                      </Text>
                      {event.time ? <Text style={styles.eventTime}>{event.time}</Text> : null}
                    </View>
                    <View style={styles.eventPriceWrap}>
                      <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {pastEvents.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {lang === "fr"
                  ? `Événements passés (${pastEvents.length})`
                  : `Past events (${pastEvents.length})`}
              </Text>
              {pastEvents.map((event) => {
                const title =
                  lang === "fr" && event.titleFr ? event.titleFr : event.title;
                return (
                  <TouchableOpacity
                    key={event.id}
                    style={[styles.eventRow, { opacity: 0.6 }]}
                    onPress={() => safePush(`/event/${event.id}`)}
                    activeOpacity={0.8}
                  >
                    {event.imageUrl ? (
                      <Image
                        source={{ uri: event.imageUrl }}
                        style={styles.eventThumb}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.eventDateBox, { backgroundColor: C.border + "22" }]}>
                        <Text style={[styles.eventDay, { color: C.textMuted }]}>
                          {(event.date || "").split("-")[2] || "—"}
                        </Text>
                        <Text style={[styles.eventMonth, { color: C.textMuted }]}>
                          {getMonthShort(event.date || "", lang)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventTitle} numberOfLines={1}>
                        {title}
                      </Text>
                      <Text style={styles.eventDate}>
                        {formatEventDate(event.date || "", lang)}
                      </Text>
                      {event.time ? <Text style={styles.eventTime}>{event.time}</Text> : null}
                    </View>
                    <View style={styles.eventPriceWrap}>
                      <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {/* ── Avis & Notes ─────────────────────────────── */}
          {isApi && (
            <View style={styles.section}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={styles.sectionTitle}>
                  {lang === "fr" ? "Avis & Notes" : "Reviews"}
                </Text>
                {avgRating != null && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="star" size={14} color="#F59E0B" />
                    <Text style={{ color: C.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                      {avgRating.toFixed(1)}
                    </Text>
                    <Text style={{ color: C.textMuted, fontSize: 12 }}>({reviews.length})</Text>
                  </View>
                )}
              </View>
              {reviewsLoading ? (
                <ActivityIndicator color={C.lavender} style={{ marginVertical: 12 }} />
              ) : reviews.length === 0 ? (
                <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: "Inter_400Regular" }}>
                  {lang === "fr" ? "Aucun avis pour le moment." : "No reviews yet."}
                </Text>
              ) : (
                reviews.map((rev: any) => (
                  <View key={rev.id} style={[styles.reviewCard, { backgroundColor: C.card, borderColor: C.border }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 5 }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Ionicons key={n} name="star" size={12} color={n <= rev.rating ? "#F59E0B" : C.border} />
                      ))}
                      <Text style={{ color: C.textMuted, fontSize: 11, marginLeft: 6 }}>
                        {new Date(rev.createdAt).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US")}
                      </Text>
                    </View>
                    {rev.comment ? (
                      <Text style={{ color: C.text, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 }}>
                        {rev.comment}
                      </Text>
                    ) : null}
                  </View>
                ))
              )}
              {!!apiNumId && !(user?.role === "structure" && apiVenue?.partnerId === user?.id) && (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      if (!user) {
                        Alert.alert(
                          lang === "fr" ? "Connexion requise" : "Sign in required",
                          lang === "fr"
                            ? "Connectez-vous pour laisser un avis."
                            : "Please sign in to leave a review.",
                          [
                            { text: lang === "fr" ? "Annuler" : "Cancel", style: "cancel" },
                            { text: lang === "fr" ? "Se connecter" : "Sign in", onPress: () => router.push("/auth") },
                          ],
                        );
                      } else {
                        setReviewModalOpen(true);
                      }
                    }}
                    style={{
                      marginTop: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      backgroundColor: C.lavender,
                      borderRadius: 12,
                      paddingVertical: 12,
                    }}
                  >
                    <Ionicons name="star-outline" size={16} color="#fff" />
                    <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                      {lang === "fr" ? "Laisser un avis" : "Leave a review"}
                    </Text>
                  </TouchableOpacity>
                  {reviewSuccess && (
                    <Text style={{ color: "#22c55e", fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "center", marginTop: 8 }}>
                      {lang === "fr"
                        ? "Avis envoyé — il sera examiné par notre équipe."
                        : "Review submitted — it will be reviewed by our team."}
                    </Text>
                  )}
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <ReviewModal
        visible={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        itemType="venue"
        itemId={parseInt(apiNumId!, 10)}
        lang={lang}
        authFetch={authFetch}
        onSuccess={() => {
          setReviewSuccess(true);
          refreshReviews();
          setTimeout(() => setReviewSuccess(false), 5000);
        }}
        bottomInset={insets.bottom}
      />

      {/* Modal de zoom plein écran sur les images de spécialités. */}
      <Modal
        visible={!!zoomImage}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomImage(null)}
        statusBarTranslucent
      >
        <Pressable style={styles.zoomBackdrop} onPress={() => setZoomImage(null)}>
          {zoomImage ? (
            <Image
              source={{ uri: zoomImage.uri }}
              style={styles.zoomImage}
              resizeMode="contain"
            />
          ) : null}
          {zoomImage?.name ? (
            <View style={[styles.zoomCaption, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <Text style={styles.zoomCaptionText} numberOfLines={2}>
                {zoomImage.name}
              </Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.zoomCloseBtn, { top: Math.max(insets.top, 16) }]}
            onPress={() => setZoomImage(null)}
            accessibilityRole="button"
            accessibilityLabel={lang === "fr" ? "Fermer" : "Close"}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </View>
  );
}

function getTypeIcon(type: string): string {
  switch (type) {
    case "Nightclub": case "Boîte de nuit": return "wine";
    case "Bar": return "beer";
    case "Restaurant": return "restaurant";
    case "Concert Hall": case "Salle de concert": return "musical-notes";
    case "Beach Club": case "Beach": case "Plage": return "sunny";
    case "Cinema": return "film";
    case "Hotel": return "bed";
    case "Stadium": case "Stade": return "football";
    case "Cultural Center": case "Salle culturelle": return "library";
    case "Comedy Club": return "happy";
    default: return "business";
  }
}

// Format "12 Mai 2026" / "May 12, 2026" — date affichée au-dessus de l'heure
// dans la liste des events d'un lieu (la vignette image remplace désormais
// la pastille jour+mois quand l'event a une photo).
function formatEventDate(dateStr: string, lang: string): string {
  if (!dateStr) return "—";
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  const day = parseInt(parts[2], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const year = parts[0];
  const monthsFr = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const monthsEn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const months = lang === "fr" ? monthsFr : monthsEn;
  const month = months[monthIdx] ?? "";
  return lang === "fr" ? `${day} ${month} ${year}` : `${month} ${day}, ${year}`;
}

function getMonthShort(dateStr: string, lang: string): string {
  if (!dateStr) return "";
  const months = lang === "fr"
    ? ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = parseInt(dateStr.split("-")[1], 10) - 1;
  return months[month] ?? "";
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },

  hero: { position: "relative", height: 260 },
  heroImage: { width: "100%", height: "100%" },
  heroPlaceholder: {
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  heroPlaceholderLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
    letterSpacing: 0.4,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  navBtn: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(14,17,32,0.7)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  verifiedHero: {
    position: "absolute",
    bottom: 14,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(14,17,32,0.75)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.gold + "55",
  },
  verifiedHeroText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: C.gold,
  },

  body: { padding: 20, gap: 16 },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  typeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.lavender + "18",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.lavender + "30",
    flexShrink: 0,
  },
  titleInfo: { flex: 1, gap: 4 },
  typePill: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: C.lavender,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  venueName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: C.text,
    lineHeight: 28,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.card2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoText: { flex: 1, gap: 2 },
  infoLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },

  section: { gap: 12 },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    lineHeight: 22,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },

  mapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.gold,
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: C.gold,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  mapsBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.bg,
  },

  emptyEvents: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 10,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyEventsText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    gap: 12,
  },
  eventDateBox: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: C.lavender + "18",
    borderWidth: 1,
    borderColor: C.lavender + "40",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  eventThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: C.bg,
    flexShrink: 0,
  },
  eventDate: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  eventDay: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: C.lavender,
    lineHeight: 18,
  },
  eventMonth: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: C.lavender,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  eventInfo: { flex: 1, gap: 3 },
  eventTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  eventTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  eventPriceWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  eventPrice: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: C.gold,
    textAlign: "right",
  },
  eventPriceSub: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  specialtyRow: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
    gap: 12,
    marginBottom: 8,
  },
  specialtyImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: C.bg,
  },
  specialtyZoomBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height * 0.85,
  },
  zoomCloseBtn: {
    position: "absolute",
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomCaption: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  zoomCaptionText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  specialtyInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  specialtyName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  specialtyDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  specialtyPrice: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: C.gold,
    marginTop: 2,
  },
  freeBadge: {
    backgroundColor: C.success + "22",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: C.success + "55",
  },
  freeBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: C.success,
  },

  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
  },
  backBtn: {
    backgroundColor: C.lavender,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.bg,
  },
  reviewCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
});
