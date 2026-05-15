import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { useApp, useColors, useT } from "@/context/AppContext";
import { ColorPalette } from "@/constants/colors";
import { API_BASE } from "@/lib/apiBase";

async function uploadImage(uri: string): Promise<string> {
  const lower = uri.toLowerCase();
  const contentType = lower.endsWith(".png") ? "image/png" : lower.endsWith(".webp") ? "image/webp" : "image/jpeg";
  const name = uri.split("/").pop() || "upload.jpg";
  const fileResp = await fetch(uri);
  const blob = await fileResp.blob();
  const size = (blob as any).size || 0;
  const presignResp = await fetch(`${API_BASE}/storage/uploads/request-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, size, contentType }),
  });
  if (!presignResp.ok) throw new Error("upload prep failed");
  const { uploadURL, objectPath } = await presignResp.json();
  const putResp = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": contentType }, body: blob });
  if (!putResp.ok) throw new Error("upload failed");
  return `${API_BASE}/storage${objectPath}`;
}

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
  const { user, setUser, authFetch, lang, logout } = useApp();
  const styles = useMemo(() => makeStyles(C), [C]);

  const isPartner = user?.role === "structure";

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [businessName, setBusinessName] = useState((user as any)?.businessName || "");
  const rawCity: string = (user as any)?.city || "";
  const [city, setCity] = useState(rawCity.includes(",") ? rawCity.split(",")[0].trim() : rawCity);
  const [profileImage, setProfileImage] = useState<string | null>(user?.avatarUrl || (user as any)?.profileImage || null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [firstName, setFirstName] = useState<string>((user as any)?.firstName || "");
  const [lastName, setLastName] = useState<string>((user as any)?.lastName || "");
  const [gender, setGender] = useState<"F" | "M" | "ND" | "">(((user as any)?.gender as any) || "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  if (!user) {
    router.replace("/auth");
    return null;
  }

  const pickImage = async () => {
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
      const url = await uploadImage(result.assets[0].uri);
      setProfileImage(url);
    } catch {
      Alert.alert(lang === "fr" ? "Échec de l'envoi" : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    if (savingProfile) return;
    if (isPartner) {
      if (!name.trim() || name.trim().length < 2) {
        Alert.alert(lang === "fr" ? "Nom du contact trop court" : "Contact name too short");
        return;
      }
      if (!businessName.trim()) {
        Alert.alert(lang === "fr" ? "Nom de la structure requis" : "Business name required");
        return;
      }
    }
    setSavingProfile(true);
    try {
      const url = isPartner ? `${API_BASE}/partners/me` : `${API_BASE}/users/me`;
      const body: any = isPartner
        ? { contactName: name.trim(), businessName: businessName.trim(), phone: phone.trim(), city: city.trim(), profileImage }
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
      const updated = data.user || data.partner;
      if (updated) {
        await setUser({
          ...user,
          name: updated.name || updated.contactName || user.name,
          phone: updated.phone || user.phone,
          ...(updated.profileImage ? { avatarUrl: updated.profileImage } : {}),
          ...(isPartner
            ? { businessName: updated.businessName, city: updated.city }
            : {
                firstName: updated.firstName ?? firstName,
                lastName: updated.lastName ?? lastName,
                gender: updated.gender ?? gender,
              }),
        } as any);
      }
      Alert.alert(t("profileUpdated"));
    } catch (e: any) {
      Alert.alert(e?.message || (lang === "fr" ? "Erreur serveur" : "Server error"));
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (savingPassword) return;
    if (!currentPassword || newPassword.length < 8) {
      Alert.alert(lang === "fr" ? "Le nouveau mot de passe doit faire au moins 8 caractères." : "New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t("passwordsDontMatch"));
      return;
    }
    setSavingPassword(true);
    try {
      const url = isPartner ? `${API_BASE}/partners/me/change-password` : `${API_BASE}/users/me/change-password`;
      const r = await authFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Erreur");
      Alert.alert(t("passwordUpdated"), undefined, [
        { text: "OK", onPress: () => { logout(); } },
      ]);
    } catch (e: any) {
      Alert.alert(e?.message || (lang === "fr" ? "Erreur serveur" : "Server error"));
    } finally {
      setSavingPassword(false);
    }
  };

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
              <Image source={{ uri: profileImage }} style={styles.avatarImg} resizeMode="cover" />
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
          {isPartner ? (
            <View>
              <Text style={styles.label}>{lang === "fr" ? "Nom du contact" : "Contact name"}</Text>
              <TextInput value={name} onChangeText={setName} style={styles.input} placeholderTextColor={C.textMuted} />
            </View>
          ) : (
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("changePassword")}</Text>
          <View>
            <Text style={styles.label}>{t("currentPassword")}</Text>
            <TextInput value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry style={styles.input} placeholderTextColor={C.textMuted} />
          </View>
          <View>
            <Text style={styles.label}>{t("newPassword")}</Text>
            <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry style={styles.input} placeholderTextColor={C.textMuted} />
          </View>
          <View>
            <Text style={styles.label}>{t("confirmNewPassword")}</Text>
            <TextInput value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry style={styles.input} placeholderTextColor={C.textMuted} />
            {confirmPassword.length > 0 && newPassword !== confirmPassword ? (
              <Text style={{ color: "#dc2626", fontSize: 12, marginTop: 4, fontFamily: "Inter_400Regular" }}>
                {t("passwordsDontMatch")}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity style={[styles.primaryBtn, savingPassword && styles.primaryBtnDisabled]} onPress={changePassword} disabled={savingPassword}>
            <Text style={styles.primaryBtnText}>{savingPassword ? "..." : t("save")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
