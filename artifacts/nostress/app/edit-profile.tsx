/**
 * edit-profile.tsx
 *
 * ARCHITECTURE :
 * - Tous les TextInput sont inlinés directement dans le JSX d'EditProfileScreen
 *   (aucun sous-composant intermédiaire ne les enveloppe), ce qui évite tout
 *   démontage/remontage intempestif lors des re-renders.
 * - Les handlers (pickImage, saveProfile) sont définis avec useCallback AVANT
 *   le premier return conditionnel, conformément aux règles des hooks React.
 */
import React, { useCallback, useMemo, useState } from "react";
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

// Upload centralisé → lib/imageUpload.ts

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
  const { user, setUser, authFetch, lang, refreshPartnerProfile } = useApp();
  const styles = useMemo(() => makeStyles(C), [C]);

  const isPartner = user?.role === "structure";

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [businessName, setBusinessName] = useState((user as any)?.businessName || "");
  const [displayName, setDisplayName] = useState<string>((user as any)?.displayName || "");
  const rawCity: string = (user as any)?.city || "";
  const [city, setCity] = useState(rawCity.includes(",") ? rawCity.split(",")[0].trim() : rawCity);
  const [profileImage, setProfileImage] = useState<string | null>(user?.avatarUrl || (user as any)?.profileImage || null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [firstName, setFirstName] = useState<string>((user as any)?.firstName || "");
  const [lastName, setLastName] = useState<string>((user as any)?.lastName || "");
  const [gender, setGender] = useState<"F" | "M" | "ND" | "">(((user as any)?.gender as any) || "");

  // ── Handlers defined with useCallback BEFORE any conditional return ──────
  // This ensures stable references across renders (no keyboard-dismissal risk)
  // and satisfies React's rules of hooks.

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
        ? { contactName: businessName.trim(), businessName: businessName.trim(), phone: phone.trim(), city: city.trim(), profileImage, displayName: displayName.trim() || null }
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
  }, [user, savingProfile, isPartner, businessName, lang, phone, city, profileImage, displayName, firstName, lastName, gender, authFetch, refreshPartnerProfile, setUser, t]);

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
            <View>
              <Text style={styles.label}>{lang === "fr" ? "Ville" : "City"}</Text>
              <TextInput value={city} onChangeText={setCity} style={styles.input} placeholderTextColor={C.textMuted} />
            </View>
          )}
          <TouchableOpacity style={[styles.primaryBtn, savingProfile && styles.primaryBtnDisabled]} onPress={saveProfile} disabled={savingProfile}>
            <Text style={styles.primaryBtnText}>{savingProfile ? "..." : t("save")}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
