/**
 * edit-profile.tsx
 *
 * ARCHITECTURE :
 * - Tous les TextInput sont inlinés directement dans le JSX d'EditProfileScreen
 *   (aucun sous-composant intermédiaire ne les enveloppe), ce qui évite tout
 *   démontage/remontage intempestif lors des re-renders.
 * - Les handlers (pickImage, saveProfile) sont définis avec useCallback AVANT
 *   le premier return conditionnel, conformément aux règles des hooks React.
 * - LocationSearch est défini AU NIVEAU MODULE (hors d'EditProfileScreen) pour
 *   que React le considère comme un type stable et ne re-monte pas les TextInput.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { useApp, useColors, useT } from "@/context/AppContext";
import { ColorPalette } from "@/constants/colors";
import { API_BASE } from "@/lib/apiBase";
import { uploadToStorage, uploadErrorMessage } from "@/lib/imageUpload";

// ─── Constants ───────────────────────────────────────────────────────────────
const SEARCH_DEBOUNCE_MS = 120;
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

// ─── Shared module-level styles used by LocationSearch ───────────────────────
const $loc = StyleSheet.create({
  fieldGap:     { gap: 5 },
  labelBase:    { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginLeft: 2 },
  inputRow:     { flexDirection: "row", alignItems: "center", borderRadius: 12, paddingHorizontal: 13, paddingVertical: 13, borderWidth: 1, gap: 10 },
  inputBase:    { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  errorRow:     { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  dropdownWrap: { borderRadius: 12, borderWidth: 1, marginTop: 4, overflow: "hidden" },
  dropdownItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 13 },
});

// ─── LocationSearch result type ───────────────────────────────────────────────
interface LocationSearchResult {
  key: string;
  emoji?: string | null;
  label: string;
  lat?: number | null;
  lng?: number | null;
}

// ─── LocationSearch — inline search with dropdown suggestions ────────────────
// Défini AU NIVEAU MODULE pour que React voie un type stable entre les renders
// (évite le démontage/remontage du TextInput et la fermeture du clavier).
const LocationSearch = React.memo(function LocationSearch({
  fieldLabel, placeholder, query, locked, results,
  onChangeQuery, onSelect, onClear,
  error, emptyLabel, disabled,
}: {
  fieldLabel: string;
  placeholder: string;
  query: string;
  locked: boolean;
  results: LocationSearchResult[];
  onChangeQuery: (text: string) => void;
  onSelect: (key: string, label: string, result: LocationSearchResult) => void;
  onClear: () => void;
  error?: string;
  emptyLabel: string;
  disabled?: boolean;
}) {
  const C = useColors();
  const showDropdown = !locked && query.trim().length > 0;
  return (
    <View style={$loc.fieldGap}>
      <Text style={[$loc.labelBase, { color: C.textMuted }]}>{fieldLabel}</Text>
      <View style={[
        $loc.inputRow,
        {
          backgroundColor: C.card,
          borderColor: error ? C.error : locked ? C.success : C.border,
          opacity: disabled ? 0.45 : 1,
        },
      ]}>
        <Ionicons
          name={locked ? "checkmark-circle" : "search-outline"}
          size={17}
          color={locked ? C.success : C.textMuted}
        />
        <TextInput
          value={query}
          onChangeText={text => { if (!disabled) onChangeQuery(text); }}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          style={[$loc.inputBase, { color: C.text }]}
          autoCapitalize="words"
          autoCorrect={false}
          editable={!disabled}
          accessibilityLabel={fieldLabel}
          returnKeyType="done"
        />
        {locked && !disabled && (
          <TouchableOpacity onPress={onClear} hitSlop={HIT_SLOP} accessibilityLabel="Modifier">
            <Ionicons name="close-circle" size={17} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {!!error && (
        <View style={$loc.errorRow}>
          <Ionicons name="alert-circle" size={13} color={C.error} />
          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: C.error }}>{error}</Text>
        </View>
      )}
      {showDropdown && (
        <View style={[$loc.dropdownWrap, { backgroundColor: C.card, borderColor: C.border }]}>
          {results.length === 0 ? (
            <View style={{ padding: 14, alignItems: "center" }}>
              <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: "Inter_400Regular" }}>
                {emptyLabel}
              </Text>
            </View>
          ) : (
            results.map((item, idx) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  $loc.dropdownItem,
                  {
                    backgroundColor: C.card,
                    borderBottomWidth: idx < results.length - 1 ? StyleSheet.hairlineWidth : 0,
                    borderBottomColor: C.border,
                  },
                ]}
                onPress={() => onSelect(item.key, item.label, item)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                {!!item.emoji && <Text style={{ fontSize: 18 }}>{item.emoji}</Text>}
                <Text style={{ flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.text }}>
                  {item.label}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
});

// ─── Screen styles ────────────────────────────────────────────────────────────
function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    content: { padding: 20, gap: 18 },
    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.bg },
    headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", color: C.text },
    avatarBlock: { alignItems: "center", gap: 12 },
    avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: C.lavender, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    avatarImg: { width: 100, height: 100 },
    avatarText: { fontSize: 36, fontFamily: "Inter_700Bold", color: C.bg },
    chooseBtn: { flexDirection: "row", gap: 6, alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: C.lavender },
    chooseText: { color: C.lavender, fontFamily: "Inter_600SemiBold", fontSize: 13 },
    label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.textMuted, marginBottom: 6 },
    input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontFamily: "Inter_400Regular", fontSize: 15 },
    section: { gap: 12, padding: 16, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border },
    sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: C.text },
    primaryBtn: { backgroundColor: C.lavender, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
    primaryBtnText: { color: C.bg, fontFamily: "Inter_700Bold", fontSize: 15 },
    primaryBtnDisabled: { opacity: 0.5 },
  });
}

export default function EditProfileScreen() {
  const t = useT();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { user, setUser, authFetch, lang, refreshPartnerProfile, configCities, configCountries } = useApp();
  const styles = useMemo(() => makeStyles(C), [C]);

  const isPartner = user?.role === "structure";

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [businessName, setBusinessName] = useState((user as any)?.businessName || "");
  const [displayName, setDisplayName] = useState<string>((user as any)?.displayName || "");
  const [profileImage, setProfileImage] = useState<string | null>(user?.avatarUrl || (user as any)?.profileImage || null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [firstName, setFirstName] = useState<string>((user as any)?.firstName || "");
  const [lastName, setLastName] = useState<string>((user as any)?.lastName || "");
  const [gender, setGender] = useState<"F" | "M" | "ND" | "">(((user as any)?.gender as any) || "");

  // ── Location search state (partners only) ────────────────────────────────
  // Initialise from the user object; city may be stored as "CityName, Country"
  const rawCity: string = (user as any)?.city || "";
  const initCity = rawCity.includes(",") ? rawCity.split(",")[0].trim() : rawCity;
  const initCountry: string = (user as any)?.country || "";

  const [country,        setCountry]        = useState(initCountry);
  const [countryQuery,   setCountryQuery]   = useState(initCountry);
  const [countryLocked,  setCountryLocked]  = useState(!!initCountry);
  const [countryResults, setCountryResults] = useState<LocationSearchResult[]>([]);

  const [city,           setCity]           = useState(initCity);
  const [cityQuery,      setCityQuery]      = useState(initCity);
  const [cityLocked,     setCityLocked]     = useState(!!initCity);
  const [cityResults,    setCityResults]    = useState<LocationSearchResult[]>([]);

  const [latitude,  setLatitude]  = useState<string>((user as any)?.latitude  ? String((user as any).latitude)  : "");
  const [longitude, setLongitude] = useState<string>((user as any)?.longitude ? String((user as any).longitude) : "");

  const countryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cityTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Enrich the country query display with emoji once configCountries loads
  useEffect(() => {
    if (countryLocked && country && configCountries.length > 0) {
      const found = configCountries.find(c => c.name === country);
      if (found?.emoji) setCountryQuery(`${found.emoji} ${found.name}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configCountries.length]);

  // Debounced country search
  useEffect(() => {
    if (countryLocked || !countryQuery.trim()) { setCountryResults([]); return; }
    if (countryTimerRef.current) clearTimeout(countryTimerRef.current);
    countryTimerRef.current = setTimeout(() => {
      const q = countryQuery.toLowerCase().trim();
      setCountryResults(
        configCountries
          .filter(c => c.name.toLowerCase().includes(q))
          .slice(0, 8)
          .map(c => ({ key: c.code, emoji: c.emoji ?? null, label: c.name })),
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => { if (countryTimerRef.current) clearTimeout(countryTimerRef.current); };
  }, [countryQuery, countryLocked, configCountries]);

  // Debounced city search (filtered by selected country)
  useEffect(() => {
    if (cityLocked || !cityQuery.trim()) { setCityResults([]); return; }
    if (cityTimerRef.current) clearTimeout(cityTimerRef.current);
    cityTimerRef.current = setTimeout(() => {
      const q = cityQuery.toLowerCase().trim();
      const seen = new Set<string>();
      setCityResults(
        configCities
          .filter(c => {
            if (country && c.countryName !== country) return false;
            if (!c.name.toLowerCase().includes(q)) return false;
            if (seen.has(c.name)) return false;
            seen.add(c.name);
            return true;
          })
          .slice(0, 8)
          .map(c => ({
            key: c.slug,
            emoji: c.emoji ?? null,
            label: c.name,
            lat: c.latitude ?? null,
            lng: c.longitude ?? null,
          })),
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => { if (cityTimerRef.current) clearTimeout(cityTimerRef.current); };
  }, [cityQuery, cityLocked, configCities, country]);

  // ── Location handlers ────────────────────────────────────────────────────
  const handleSelectCountry = useCallback((_key: string, label: string, item: LocationSearchResult) => {
    const display = item.emoji ? `${item.emoji} ${label}` : label;
    setCountry(label);
    setCountryQuery(display);
    setCountryLocked(true);
    setCountryResults([]);
    // Reset city when country changes
    setCity(""); setCityQuery(""); setCityLocked(false); setCityResults([]);
    setLatitude(""); setLongitude("");
  }, []);

  const handleClearCountry = useCallback(() => {
    setCountryQuery(""); setCountryLocked(false); setCountry(""); setCountryResults([]);
    setCity(""); setCityQuery(""); setCityLocked(false); setCityResults([]);
    setLatitude(""); setLongitude("");
  }, []);

  const handleSelectCity = useCallback((_key: string, label: string, item: LocationSearchResult) => {
    setCity(label);
    setCityQuery(label);
    setCityLocked(true);
    setCityResults([]);
    setLatitude(item.lat != null ? String(item.lat) : "");
    setLongitude(item.lng != null ? String(item.lng) : "");
  }, []);

  const handleClearCity = useCallback(() => {
    setCityQuery(""); setCityLocked(false); setCity(""); setCityResults([]);
    setLatitude(""); setLongitude("");
  }, []);

  // ── Handlers defined with useCallback BEFORE any conditional return ──────
  const pickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(lang === "fr" ? "Permission refusée" : "Permission denied");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setUploading(true);
    try {
      const { url } = await uploadToStorage(result.assets[0].uri, { context: "avatar" });
      setProfileImage(url);
    } catch (err: any) {
      const msg = err && typeof err === "object" && "kind" in err
        ? uploadErrorMessage(err, lang as "fr" | "en")
        : (lang === "fr" ? "Échec de l'envoi" : "Upload failed");
      Alert.alert(lang === "fr" ? "Erreur" : "Error", msg);
    } finally {
      setUploading(false);
    }
  }, [lang]);

  const saveProfile = useCallback(async () => {
    if (!user) return;
    if (savingProfile) return;
    if (isPartner) {
      if (!businessName.trim() || businessName.trim().length < 2) {
        Alert.alert(lang === "fr" ? "Nom de la structure trop court" : "Business name too short");
        return;
      }
    }
    setSavingProfile(true);
    try {
      const url = isPartner ? `${API_BASE}/partners/me` : `${API_BASE}/users/me`;
      const body: any = isPartner
        ? {
            contactName: businessName.trim(),
            businessName: businessName.trim(),
            phone: phone.trim(),
            city: city.trim() || null,
            country: country.trim() || null,
            latitude:  latitude  ? parseFloat(latitude)  : null,
            longitude: longitude ? parseFloat(longitude) : null,
            profileImage,
            displayName: displayName.trim() || null,
          }
        : {
            firstName: firstName.trim() || undefined,
            lastName: lastName.trim() || undefined,
            gender: gender || undefined,
            phone: phone.trim(),
            profileImage,
          };
      if (!isPartner && (!body.firstName || !body.lastName)) {
        Alert.alert(lang === "fr" ? "Prénoms et nom requis." : "First and last name required.");
        setSavingProfile(false);
        return;
      }
      const r = await authFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Erreur");
      if (isPartner) {
        // Re-fetch from GET /partners/me so the same field-mapping logic
        // used by the AppState resume refresh is applied consistently.
        await refreshPartnerProfile();
      } else {
        const updated = data.user;
        if (updated) {
          await setUser({
            ...user,
            name: updated.name || user.name,
            phone: updated.phone || user.phone,
            ...(updated.profileImage ? { avatarUrl: updated.profileImage } : {}),
            firstName: updated.firstName ?? firstName,
            lastName: updated.lastName ?? lastName,
            gender: updated.gender ?? gender,
          } as any);
        }
      }
      Alert.alert(t("profileUpdated"));
    } catch (e: any) {
      Alert.alert(e?.message || (lang === "fr" ? "Erreur serveur" : "Server error"));
    } finally {
      setSavingProfile(false);
    }
  }, [user, savingProfile, isPartner, businessName, lang, phone, city, country, latitude, longitude, profileImage, displayName, firstName, lastName, gender, authFetch, refreshPartnerProfile, setUser, t]);

  // ── Early return (after all hooks and handler definitions) ───────────────
  if (!user) {
    router.replace("/auth");
    return null;
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={[styles.header, { paddingTop: (Platform.OS === "web" ? 0 : insets.top) + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={26} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("editProfile")}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarBlock}>
          <View style={styles.avatar}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <Text style={styles.avatarText}>{(name || user.email).charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <TouchableOpacity style={styles.chooseBtn} onPress={pickImage} disabled={uploading}>
            <Ionicons name="image-outline" size={16} color={C.lavender} />
            <Text style={styles.chooseText}>{uploading ? "..." : t("chooseImage")}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("editProfile")}</Text>
          {isPartner ? null : (
            <>
              <View>
                <Text style={styles.label}>{lang === "fr" ? "Prénoms" : "First name"}</Text>
                <TextInput value={firstName} onChangeText={setFirstName} style={styles.input} placeholderTextColor={C.textMuted} autoCapitalize="words" />
              </View>
              <View>
                <Text style={styles.label}>{lang === "fr" ? "Nom" : "Last name"}</Text>
                <TextInput value={lastName} onChangeText={setLastName} style={styles.input} placeholderTextColor={C.textMuted} autoCapitalize="words" />
              </View>
              <View>
                <Text style={styles.label}>{lang === "fr" ? "Sexe" : "Gender"}</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                  {(["F", "M", "ND"] as const).map((g) => {
                    const active = gender === g;
                    return (
                      <TouchableOpacity
                        key={g}
                        onPress={() => setGender(g)}
                        activeOpacity={0.8}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 10,
                          borderWidth: 1.5,
                          borderColor: active ? C.lavender : C.border,
                          backgroundColor: active ? C.lavender + "22" : "transparent",
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: active ? C.lavender : C.text, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                          {g === "ND" ? (lang === "fr" ? "Non défini" : "Unspecified") : g}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </>
          )}
          {isPartner && (
            <View>
              <Text style={styles.label}>{lang === "fr" ? "Nom de la structure" : "Business name"}</Text>
              <TextInput value={businessName} onChangeText={setBusinessName} style={styles.input} placeholderTextColor={C.textMuted} />
            </View>
          )}
          {isPartner && (
            <View>
              <Text style={styles.label}>{lang === "fr" ? "Nom d'affichage" : "Display name"}</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                style={styles.input}
                placeholderTextColor={C.textMuted}
                placeholder={lang === "fr" ? "Nom court pour l'en-tête (optionnel)" : "Short name for the header (optional)"}
                maxLength={30}
              />
            </View>
          )}
          <View>
            <Text style={styles.label}>{lang === "fr" ? "Téléphone" : "Phone"}</Text>
            <TextInput value={phone} onChangeText={setPhone} style={styles.input} keyboardType="phone-pad" placeholderTextColor={C.textMuted} />
          </View>
          {isPartner && (
            <>
              <LocationSearch
                fieldLabel={lang === "fr" ? "Pays" : "Country"}
                placeholder={lang === "fr" ? "Rechercher un pays…" : "Search a country…"}
                query={countryQuery}
                locked={countryLocked}
                results={countryResults}
                onChangeQuery={setCountryQuery}
                onSelect={handleSelectCountry}
                onClear={handleClearCountry}
                emptyLabel={lang === "fr" ? "Aucun pays trouvé" : "No country found"}
              />
              <LocationSearch
                fieldLabel={lang === "fr" ? "Ville" : "City"}
                placeholder={lang === "fr" ? "Rechercher une ville…" : "Search a city…"}
                query={cityQuery}
                locked={cityLocked}
                results={cityResults}
                onChangeQuery={setCityQuery}
                onSelect={handleSelectCity}
                onClear={handleClearCity}
                emptyLabel={lang === "fr" ? "Aucune ville trouvée" : "No city found"}
                disabled={!countryLocked}
              />
            </>
          )}
          <TouchableOpacity style={[styles.primaryBtn, savingProfile && styles.primaryBtnDisabled]} onPress={saveProfile} disabled={savingProfile}>
            <Text style={styles.primaryBtnText}>{savingProfile ? "..." : t("save")}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
