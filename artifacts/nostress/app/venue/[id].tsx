import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,

  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { safePush } from "@/lib/navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ColorPalette } from "@/constants/colors";
import { useT, useApp, useColors } from "@/context/AppContext";
import { useLowDataMode } from "@/context/NetworkContext";
import { MOCK_VENUES, MOCK_EVENTS } from "@/constants/data";
import { API_BASE } from "@/lib/apiBase";
import { APP_STORE_LINKS } from "@/constants/appLinks";
import { shareWithImage } from "@/lib/shareWithImage";
import ReportButton from "@/components/ReportButton";
import MapPreview from "@/components/MapPreview";
import ReviewModal from "@/components/ReviewModal";
import { NavigationOptionsSheet } from "@/components/common/NavigationOptionsSheet";
import { PremiumMediaGallery } from "@/components/gallery/PremiumMediaGallery";

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
  blurhash?: string | null;
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
  const [navSheetVisible, setNavSheetVisible] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const lowData = useLowDataMode();

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
            blurhash: data.blurhash ?? null,
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

  const handleShare = async () => {
    try {
      if (!venue) return;
      const imageUrl = venue.imageUrl || null;
      const downloadLine =
        lang === "fr"
          ? `📲 Télécharge l'app NoStress :\nAndroid : ${APP_STORE_LINKS.googlePlay}\niOS : ${APP_STORE_LINKS.appStore}`
          : `📲 Download the NoStress app:\nAndroid: ${APP_STORE_LINKS.googlePlay}\niOS: ${APP_STORE_LINKS.appStore}`;
      const parts: string[] = [
        `${venue.name} — ${venue.city}`,
        venue.description ? venue.description : "",
        "",
        downloadLine,
      ];
      await shareWithImage({
        title: venue.name,
        message: parts.filter(Boolean).join("\n"),
        imageUrl,
      });
    } catch {}
  };

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

  const typeIcon = getTypeIcon(venue.type || "");

  // Galerie : image principale + images spécialités
  const galleryImages: string[] = [];
  if (venue.imageUrl) galleryImages.push(venue.imageUrl);

  // Description tronquée
  const DESC_LIMIT = 180;
  const hasLongDesc = (venue.description?.length ?? 0) > DESC_LIMIT;
  const displayDesc = hasLongDesc && !descExpanded
    ? venue.description!.slice(0, DESC_LIMIT) + "…"
    : venue.description;

  // Actions principales conditionnelles
  const actions: Array<{ icon: string; label: string; onPress: () => void; color: string }> = [];
  if (hasCoords) actions.push({ icon: "navigate", label: lang === "fr" ? "Itinéraire" : "Directions", onPress: () => setNavSheetVisible(true), color: C.gold });
  actions.push({ icon: "share-outline", label: lang === "fr" ? "Partager" : "Share", onPress: handleShare, color: C.lavender });
  if (user?.role === "user" && isApi) {
    actions.push({
      icon: isFavoriteVenue(venue.id) ? "heart" : "heart-outline",
      label: lang === "fr" ? "Favori" : "Favorite",
      onPress: () => toggleFavoriteVenue(venue.id),
      color: isFavoriteVenue(venue.id) ? "#E05C5C" : C.textMuted,
    });
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Galerie swipeable ────────────────────────── */}
        <PremiumMediaGallery
          images={galleryImages}
          blurhash={venue.blurhash}
          height={300}
          onBack={() => router.back()}
          isFavorite={user?.role === "user" ? isFavoriteVenue(venue.id) : false}
          onToggleFav={user?.role === "user" && isApi ? () => toggleFavoriteVenue(venue.id) : undefined}
          showFavorite={user?.role === "user" && isApi}
          onShare={handleShare}
          isVerified={venue.isVerified}
          lowData={lowData}
          lang={lang}
        />

        {/* ── Informations principales ─────────────────── */}
        <View style={styles.body}>

          {/* Nom + catégorie */}
          <View style={styles.nameBlock}>
            <View style={styles.nameRow}>
              <View style={[styles.typeChip, { backgroundColor: C.lavender + "18", borderColor: C.lavender + "30" }]}>
                <Ionicons name={typeIcon as any} size={13} color={C.lavender} />
                {venue.type ? (
                  <Text style={[styles.typeChipText, { color: C.lavender }]}>{venue.type}</Text>
                ) : null}
              </View>
              {isApi && user?.role !== "structure" && (
                <ReportButton itemType="venue" itemId={venue.id} variant="icon" />
              )}
            </View>
            <Text style={styles.venueName}>{venue.name}</Text>

            {/* Localisation compacte */}
            {(venue.city || venue.address) ? (
              <View style={styles.locationChips}>
                {venue.city ? (
                  <View style={[styles.locationChip, { backgroundColor: C.card, borderColor: C.border }]}>
                    <Ionicons name="location-outline" size={12} color={C.textMuted} />
                    <Text style={[styles.locationChipText, { color: C.textMuted }]}>
                      {venue.city}{venue.country ? `, ${venue.country}` : ""}
                    </Text>
                  </View>
                ) : null}
                {venue.address ? (
                  <View style={[styles.locationChip, { backgroundColor: C.card, borderColor: C.border }]}>
                    <Ionicons name="map-outline" size={12} color={C.textMuted} />
                    <Text style={[styles.locationChipText, { color: C.textMuted }]} numberOfLines={1}>
                      {venue.address}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Note moyenne */}
            {avgRating != null && (
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Ionicons
                    key={n}
                    name={n <= Math.round(avgRating) ? "star" : "star-outline"}
                    size={14}
                    color="#F59E0B"
                  />
                ))}
                <Text style={[styles.ratingText, { color: C.text }]}>{avgRating.toFixed(1)}</Text>
                <Text style={[styles.ratingCount, { color: C.textMuted }]}>({reviews.length})</Text>
              </View>
            )}
          </View>

          {/* ── Barre d'actions ── */}
          {actions.length > 0 && (
            <View style={styles.actionsBar}>
              {actions.map((a) => (
                <TouchableOpacity
                  key={a.label}
                  style={[styles.actionBtn, { backgroundColor: C.card, borderColor: C.border }]}
                  onPress={a.onPress}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={a.label}
                >
                  <Ionicons name={a.icon as any} size={18} color={a.color} />
                  <Text style={[styles.actionBtnText, { color: C.text }]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── Description ── */}
          {venue.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{lang === "fr" ? "À propos" : "About"}</Text>
              <View style={[styles.descCard, { backgroundColor: C.card, borderColor: C.border }]}>
                <Text style={[styles.description, { color: C.textMuted }]}>{displayDesc}</Text>
                {hasLongDesc && (
                  <TouchableOpacity
                    onPress={() => setDescExpanded(!descExpanded)}
                    hitSlop={8}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.readMore, { color: C.lavender }]}>
                      {descExpanded
                        ? (lang === "fr" ? "Réduire" : "Show less")
                        : (lang === "fr" ? "Lire plus" : "Read more")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : null}

          {/* ── Infos pratiques ── */}
          {(venue.openingTime || venue.closingTime) ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{lang === "fr" ? "Infos pratiques" : "Practical info"}</Text>
              <View style={[styles.infoCard, { backgroundColor: C.card, borderColor: C.border }]}>
                <View style={styles.infoRow}>
                  <View style={[styles.infoIconWrap, { backgroundColor: C.lavender + "18" }]}>
                    <Ionicons name="time-outline" size={15} color={C.lavender} />
                  </View>
                  <View style={styles.infoText}>
                    <Text style={[styles.infoLabel, { color: C.textMuted }]}>
                      {lang === "fr" ? "Horaires" : "Hours"}
                    </Text>
                    <Text style={[styles.infoValue, { color: C.text }]}>
                      {venue.openingTime || "—"} → {venue.closingTime || "—"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : null}

          {/* ── Spécialités ── */}
          {venue.specialties && venue.specialties.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {lang === "fr"
                  ? `Spécialités (${venue.specialties.length})`
                  : `Specialties (${venue.specialties.length})`}
              </Text>
              {venue.specialties.map((sp) => (
                <View key={sp.id} style={[styles.specialtyRow, { backgroundColor: C.card, borderColor: C.border }]}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => sp.imageUrl && setZoomImage({ uri: sp.imageUrl, name: sp.name })}
                    accessibilityRole="imagebutton"
                    accessibilityLabel={lang === "fr" ? `Agrandir ${sp.name}` : `Zoom on ${sp.name}`}
                  >
                    <Image source={{ uri: sp.imageUrl }} style={styles.specialtyImage} contentFit="cover" />
                    <View style={styles.specialtyZoomBadge}>
                      <Ionicons name="expand" size={11} color="#fff" />
                    </View>
                  </TouchableOpacity>
                  <View style={styles.specialtyInfo}>
                    <Text style={[styles.specialtyName, { color: C.text }]} numberOfLines={1}>{sp.name}</Text>
                    {sp.description ? (
                      <Text style={[styles.specialtyDesc, { color: C.textMuted }]} numberOfLines={2}>{sp.description}</Text>
                    ) : null}
                    {sp.price != null ? (
                      <Text style={[styles.specialtyPrice, { color: C.gold }]}>
                        {sp.price.toLocaleString()} FCFA
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* ── Carte & Itinéraire ── */}
          {hasCoords ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{lang === "fr" ? "Position" : "Location"}</Text>
              <MapPreview
                latitude={venue.latitude as number}
                longitude={venue.longitude as number}
                height={200}
              />
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.mapsBtn, { backgroundColor: C.gold }]}
            onPress={() => setNavSheetVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={lang === "fr" ? "Itinéraire" : "Directions"}
          >
            <Ionicons name="navigate" size={18} color={C.bg} />
            <Text style={[styles.mapsBtnText, { color: C.bg }]}>
              {lang === "fr" ? "Itinéraire / Maps" : "Directions / Maps"}
            </Text>
          </TouchableOpacity>

          {/* ── Événements à venir ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {lang === "fr"
                ? `Événements à venir (${upcomingEvents.length})`
                : `Upcoming events (${upcomingEvents.length})`}
            </Text>
            {upcomingEvents.length === 0 ? (
              <View style={[styles.emptyEvents, { backgroundColor: C.card, borderColor: C.border }]}>
                <Ionicons name="calendar-outline" size={28} color={C.border} />
                <Text style={[styles.emptyEventsText, { color: C.textMuted }]}>
                  {lang === "fr" ? "Aucun événement prévu" : "No upcoming events"}
                </Text>
              </View>
            ) : (
              upcomingEvents.map((event) => {
                const title = lang === "fr" && event.titleFr ? event.titleFr : event.title;
                return (
                  <TouchableOpacity
                    key={event.id}
                    style={[styles.eventRow, { backgroundColor: C.card, borderColor: C.border }]}
                    onPress={() => safePush(`/event/${event.id}`)}
                    activeOpacity={0.8}
                  >
                    {event.imageUrl ? (
                      <Image source={{ uri: event.imageUrl }} style={styles.eventThumb} contentFit="cover" />
                    ) : (
                      <View style={[styles.eventDateBox, { backgroundColor: C.lavender + "18", borderColor: C.lavender + "40" }]}>
                        <Text style={[styles.eventDay, { color: C.lavender }]}>{(event.date || "").split("-")[2] || "—"}</Text>
                        <Text style={[styles.eventMonth, { color: C.lavender }]}>{getMonthShort(event.date || "", lang)}</Text>
                      </View>
                    )}
                    <View style={styles.eventInfo}>
                      <Text style={[styles.eventTitle, { color: C.text }]} numberOfLines={1}>{title}</Text>
                      <Text style={[styles.eventDate, { color: C.textMuted }]}>{formatEventDate(event.date || "", lang)}</Text>
                      {event.time ? <Text style={[styles.eventTime, { color: C.textMuted }]}>{event.time}</Text> : null}
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* ── Événements passés ── */}
          {pastEvents.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {lang === "fr"
                  ? `Événements passés (${pastEvents.length})`
                  : `Past events (${pastEvents.length})`}
              </Text>
              {pastEvents.map((event) => {
                const title = lang === "fr" && event.titleFr ? event.titleFr : event.title;
                return (
                  <TouchableOpacity
                    key={event.id}
                    style={[styles.eventRow, { backgroundColor: C.card, borderColor: C.border, opacity: 0.65 }]}
                    onPress={() => safePush(`/event/${event.id}`)}
                    activeOpacity={0.8}
                  >
                    {event.imageUrl ? (
                      <Image source={{ uri: event.imageUrl }} style={styles.eventThumb} contentFit="cover" />
                    ) : (
                      <View style={[styles.eventDateBox, { backgroundColor: C.border + "22", borderColor: C.border }]}>
                        <Text style={[styles.eventDay, { color: C.textMuted }]}>{(event.date || "").split("-")[2] || "—"}</Text>
                        <Text style={[styles.eventMonth, { color: C.textMuted }]}>{getMonthShort(event.date || "", lang)}</Text>
                      </View>
                    )}
                    <View style={styles.eventInfo}>
                      <Text style={[styles.eventTitle, { color: C.text }]} numberOfLines={1}>{title}</Text>
                      <Text style={[styles.eventDate, { color: C.textMuted }]}>{formatEventDate(event.date || "", lang)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {/* ── Avis & Notes ── */}
          {isApi && (
            <View style={styles.section}>
              <View style={styles.reviewsHeader}>
                <Text style={styles.sectionTitle}>
                  {lang === "fr" ? "Avis & Notes" : "Reviews"}
                </Text>
                {avgRating != null && (
                  <View style={styles.avgRatingRow}>
                    <Ionicons name="star" size={13} color="#F59E0B" />
                    <Text style={[styles.avgRatingText, { color: C.text }]}>{avgRating.toFixed(1)}</Text>
                    <Text style={[styles.avgRatingCount, { color: C.textMuted }]}>({reviews.length})</Text>
                  </View>
                )}
              </View>

              {reviewsLoading ? (
                <ActivityIndicator color={C.lavender} style={{ marginVertical: 16 }} />
              ) : reviews.length === 0 ? (
                <Text style={[styles.noReviews, { color: C.textMuted }]}>
                  {lang === "fr" ? "Aucun avis pour le moment." : "No reviews yet."}
                </Text>
              ) : (
                reviews.map((rev: any) => (
                  <View key={rev.id} style={[styles.reviewCard, { backgroundColor: C.card, borderColor: C.border }]}>
                    <View style={styles.reviewMeta}>
                      <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Ionicons key={n} name="star" size={11} color={n <= rev.rating ? "#F59E0B" : C.border} />
                        ))}
                      </View>
                      <Text style={[styles.reviewDate, { color: C.textMuted }]}>
                        {new Date(rev.createdAt).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US")}
                      </Text>
                    </View>
                    {rev.comment ? (
                      <Text style={[styles.reviewComment, { color: C.text }]}>{rev.comment}</Text>
                    ) : null}
                  </View>
                ))
              )}

              {!!apiNumId && !(user?.role === "structure" && (apiVenue as any)?.partnerId === user?.id) && (
                <>
                  <TouchableOpacity
                    style={[styles.leaveReviewBtn, { backgroundColor: C.lavender }]}
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
                    accessibilityRole="button"
                  >
                    <Ionicons name="star-outline" size={16} color="#fff" />
                    <Text style={styles.leaveReviewText}>
                      {lang === "fr" ? "Laisser un avis" : "Leave a review"}
                    </Text>
                  </TouchableOpacity>
                  {reviewSuccess && (
                    <Text style={[styles.reviewSuccessText, { color: C.success }]}>
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

      {/* ── Modals & Sheets ── */}
      <NavigationOptionsSheet
        visible={navSheetVisible}
        onClose={() => setNavSheetVisible(false)}
        venue={{
          name: venue.name,
          address: venue.address,
          city: venue.city,
          latitude: venue.latitude,
          longitude: venue.longitude,
        }}
        lang={lang as "fr" | "en"}
      />

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

      {/* Zoom spécialités */}
      <Modal
        visible={!!zoomImage}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomImage(null)}
        statusBarTranslucent
      >
        <Pressable style={styles.zoomBackdrop} onPress={() => setZoomImage(null)}>
          {zoomImage ? (
            <Image source={{ uri: zoomImage.uri }} style={styles.zoomImage} contentFit="contain" />
          ) : null}
          {zoomImage?.name ? (
            <View style={[styles.zoomCaption, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <Text style={styles.zoomCaptionText} numberOfLines={2}>{zoomImage.name}</Text>
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
  root:   { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },

  /* ── Body ── */
  body: { padding: 20, gap: 20 },

  /* ── Name block ── */
  nameBlock: { gap: 10 },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  typeChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12, borderWidth: 1,
  },
  typeChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  venueName: {
    fontSize: 24, fontFamily: "Inter_700Bold", color: C.text, lineHeight: 30,
  },
  locationChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  locationChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 9, paddingVertical: 5,
    borderRadius: 10, borderWidth: 1,
  },
  locationChipText: { fontSize: 12, fontFamily: "Inter_400Regular", maxWidth: 200 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { fontSize: 13, fontFamily: "Inter_700Bold", marginLeft: 4 },
  ratingCount: { fontSize: 12, fontFamily: "Inter_400Regular" },

  /* ── Actions bar ── */
  actionsBar: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: "column", alignItems: "center",
    paddingVertical: 12, borderRadius: 14, borderWidth: 1, gap: 5,
  },
  actionBtnText: { fontSize: 11, fontFamily: "Inter_500Medium" },

  /* ── Section ── */
  section: { gap: 10 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: C.text },

  /* ── Description ── */
  descCard: {
    borderRadius: 14, borderWidth: 1, padding: 14, gap: 8,
  },
  description: {
    fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22,
  },
  readMore: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  /* ── Practical info ── */
  infoCard: {
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  infoIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  infoText: { flex: 1, gap: 2 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  infoValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  /* ── Maps button ── */
  mapsBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, borderRadius: 14, paddingVertical: 15,
    shadowColor: C.gold, shadowOpacity: 0.25, shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  mapsBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  /* ── Events ── */
  emptyEvents: {
    alignItems: "center", paddingVertical: 24, gap: 8,
    borderRadius: 14, borderWidth: 1,
  },
  emptyEventsText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  eventRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, borderWidth: 1, padding: 11, gap: 12,
  },
  eventDateBox: {
    width: 52, height: 52, borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  eventThumb: { width: 52, height: 52, borderRadius: 10, flexShrink: 0 },
  eventDay:   { fontSize: 15, fontFamily: "Inter_700Bold", lineHeight: 17 },
  eventMonth: { fontSize: 9, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  eventInfo:  { flex: 1, gap: 2 },
  eventTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  eventDate:  { fontSize: 11, fontFamily: "Inter_400Regular" },
  eventTime:  { fontSize: 11, fontFamily: "Inter_400Regular" },

  /* ── Specialties ── */
  specialtyRow: {
    flexDirection: "row", borderRadius: 12, borderWidth: 1,
    padding: 10, gap: 12, marginBottom: 8,
  },
  specialtyImage: { width: 68, height: 68, borderRadius: 10 },
  specialtyZoomBadge: {
    position: "absolute", bottom: 4, right: 4,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center",
  },
  specialtyInfo: { flex: 1, justifyContent: "center", gap: 3 },
  specialtyName:  { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  specialtyDesc:  { fontSize: 12, fontFamily: "Inter_400Regular" },
  specialtyPrice: { fontSize: 13, fontFamily: "Inter_700Bold", marginTop: 2 },

  /* ── Reviews ── */
  reviewsHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  avgRatingRow:   { flexDirection: "row", alignItems: "center", gap: 3 },
  avgRatingText:  { fontSize: 14, fontFamily: "Inter_700Bold" },
  avgRatingCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  noReviews:      { fontSize: 14, fontFamily: "Inter_400Regular" },
  reviewCard: {
    borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8,
  },
  reviewMeta:    { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  starsRow:      { flexDirection: "row", gap: 3 },
  reviewDate:    { fontSize: 11, fontFamily: "Inter_400Regular" },
  reviewComment: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  leaveReviewBtn: {
    marginTop: 12, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 13,
  },
  leaveReviewText:    { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  reviewSuccessText:  { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center", marginTop: 8 },

  /* ── Zoom modal ── */
  zoomBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.95)",
    alignItems: "center", justifyContent: "center",
  },
  zoomImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height * 0.85,
  },
  zoomCloseBtn: {
    position: "absolute", right: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center",
  },
  zoomCaption: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingTop: 16, backgroundColor: "rgba(0,0,0,0.5)",
  },
  zoomCaptionText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "center" },

  /* ── States ── */
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: C.textMuted },
  backBtn: { backgroundColor: C.lavender, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  backBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.bg },
});
