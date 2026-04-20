import React, { useState } from "react";
import {
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
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { C } from "@/constants/colors";
import { useT, useApp, useColors } from "@/context/AppContext";
import { MOCK_CITIES, COUNTRIES } from "@/constants/data";

type Mode = "login" | "register";
type RegisterRole = "user" | "structure";

const BUSINESS_TYPES = [
  { key: "nightclub", labelFr: "Boîte de nuit", labelEn: "Nightclub" },
  { key: "bar", labelFr: "Bar", labelEn: "Bar" },
  { key: "restaurant", labelFr: "Restaurant", labelEn: "Restaurant" },
  { key: "festival", labelFr: "Festival", labelEn: "Festival" },
  { key: "beach", labelFr: "Beach Club", labelEn: "Beach Club" },
  { key: "concerts", labelFr: "Salle de concert", labelEn: "Concert Hall" },
  { key: "sport", labelFr: "Sport & loisirs", labelEn: "Sport & Leisure" },
  { key: "culture", labelFr: "Culturel / Artistique", labelEn: "Cultural / Artistic" },
  { key: "other", labelFr: "Autre", labelEn: "Other" },
];

export default function AuthScreen() {
  const t = useT();
  const { setUser, setToken, lang, addNotification } = useApp();
  const insets = useSafeAreaInsets();
  const C = useColors();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [registerRole, setRegisterRole] = useState<RegisterRole>("user");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [country, setCountry] = useState("Togo");
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [city, setCity] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [businessType, setBusinessType] = useState("");
  const [businessTypeModal, setBusinessTypeModal] = useState(false);
  const [description, setDescription] = useState("");
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const handleSelectCity = (c: typeof MOCK_CITIES[0]) => {
    setCity(c.name);
    setLatitude(c.latitude.toString());
    setLongitude(c.longitude.toString());
    setCityModalVisible(false);
  };

  const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
    : "/api";

  const handleSubmit = async () => {
    if (!email || !password) {
      setError(t("error"));
      return;
    }
    setError("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    try {
      if (mode === "register" && registerRole === "structure") {
        if (!name || !phone || !city || !businessType) {
          setError(lang === "fr" ? "Veuillez remplir tous les champs requis (nom, téléphone, ville, type d'activité)." : "Please fill all required fields (name, phone, city, business type).");
          setLoading(false);
          return;
        }
        const res = await fetch(`${API_BASE}/partners/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            contactName: name,
            businessName: name,
            businessType,
            phone,
            city,
            country,
            latitude,
            longitude,
            description: description || null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          // 409 → friendly message + flip to Login mode if "already registered"
          if (res.status === 409 && data?.alreadyRegistered) {
            setError(data.error || (lang === "fr"
              ? "Compte déjà existant. Connectez-vous."
              : "Account already exists. Please log in."));
            setMode("login");
            setLoading(false);
            return;
          }
          setError(data.error || (lang === "fr" ? "Erreur lors de l'inscription." : "Registration error."));
          setLoading(false);
          return;
        }
        const partner = data.partner || {};
        const mockUser = {
          id: String(partner.id || "u_" + Date.now()),
          email: partner.email || cleanEmail,
          name: partner.contactName || name,
          phone: partner.phone || phone,
          role: "structure" as const,
          favorites: [],
          partnerStatus: (partner.status || "pending") as "pending" | "approved" | "rejected",
          businessName: partner.businessName || name,
          city: partner.city || city,
        };
        await setUser(mockUser);
        await setToken("mock_token_" + Date.now());
        addNotification({
          title: "Partner request submitted!",
          titleFr: "Demande partenaire envoyée !",
          body: "Your partner account request is under review. You will be notified once approved.",
          bodyFr: "Votre demande de compte partenaire est en cours d'examen. Vous serez notifié(e) dès son approbation.",
        });
        setLoading(false);
        setRegisteredEmail(email);
        setRegistrationSuccess(true);
        return;
      }

      if (mode === "login") {
        const loginRes = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, password }),
        });
        if (!loginRes.ok) {
          const errData = await loginRes.json().catch(() => ({}));
          setError(errData.error || (lang === "fr" ? "Erreur de connexion." : "Login error."));
          setLoading(false);
          return;
        }
        const { token: apiToken, user: apiUser } = await loginRes.json();
        await setUser(apiUser);
        await setToken(apiToken);

        if (apiUser.role === "structure" && apiUser.partnerStatus === "approved") {
          addNotification({
            title: "Welcome back!",
            titleFr: "Bon retour !",
            body: "Your partner account is active. Manage your events and venues from the dashboard.",
            bodyFr: "Votre compte partenaire est actif. Gérez vos événements et lieux depuis le tableau de bord.",
          });
        }
      } else {
        const regRes = await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, password, name: name || cleanEmail.split("@")[0], phone }),
        });
        if (!regRes.ok) {
          const errData = await regRes.json().catch(() => ({}));
          setError(errData.error || (lang === "fr" ? "Erreur lors de l'inscription." : "Registration error."));
          setLoading(false);
          return;
        }
        const { token: apiToken, user: apiUser } = await regRes.json();
        await setUser(apiUser);
        await setToken(apiToken);

        addNotification({
          title: "Welcome to NoStress! 🎉",
          titleFr: "Bienvenue sur NoStress ! 🎉",
          body: "Your account has been created. Discover the best events in Togo!",
          bodyFr: "Votre compte a été créé avec succès. Découvrez les meilleurs événements au Togo !",
        });
      }
    } catch (e) {
      setError(lang === "fr" ? "Erreur réseau. Vérifiez votre connexion." : "Network error. Check your connection.");
    }
    setLoading(false);
    router.back();
  };

  if (registrationSuccess) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center", paddingHorizontal: 28 }]}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: C.success + "22", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <Ionicons name="checkmark-circle" size={52} color={C.success} />
        </View>
        <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: C.text, textAlign: "center", marginBottom: 10 }}>
          {lang === "fr" ? "Demande envoyée !" : "Request submitted!"}
        </Text>
        <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: C.textMuted, textAlign: "center", lineHeight: 22, marginBottom: 24 }}>
          {lang === "fr"
            ? `Votre demande de compte partenaire a été soumise avec succès. Notre équipe va analyser votre dossier et vous contacterons à l'adresse`
            : `Your partner account request has been successfully submitted. Our team will review your file and contact you at`}
          {" "}
          <Text style={{ color: C.lavender, fontFamily: "Inter_600SemiBold" }}>{registeredEmail}</Text>
          {" "}
          {lang === "fr" ? "dans un délai de 24 à 48h." : "within 24 to 48 hours."}
        </Text>
        <View style={{ backgroundColor: C.gold + "11", borderRadius: 12, borderWidth: 1, borderColor: C.gold + "44", padding: 14, width: "100%", marginBottom: 24 }}>
          <Text style={{ color: C.gold, fontSize: 12, textAlign: "center", lineHeight: 18, fontFamily: "Inter_500Medium" }}>
            {lang === "fr"
              ? "Vous recevrez un email de confirmation dès que votre compte sera validé par l'administrateur."
              : "You will receive a confirmation email once your account is approved by the administrator."}
          </Text>
        </View>
        <TouchableOpacity
          style={{ backgroundColor: C.lavender, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, flexDirection: "row", alignItems: "center", gap: 8 }}
          onPress={() => router.back()}
        >
          <Ionicons name="home-outline" size={18} color={C.bg} />
          <Text style={{ color: C.bg, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>
            {lang === "fr" ? "Accueil" : "Home"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={C.textMuted} />
        </TouchableOpacity>

        <View style={styles.logoArea}>
          <View style={styles.logo}>
            <Text style={styles.logoLetter}>N</Text>
          </View>
          <Text style={styles.appName}>NoStress</Text>
          <Text style={styles.tagline}>
            {mode === "login" ? t("loginTitle") : t("registerTitle")}
          </Text>
        </View>

        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "login" && styles.modeBtnActive]}
            onPress={() => { setMode("login"); setError(""); }}
          >
            <Text style={[styles.modeBtnText, mode === "login" && styles.modeBtnTextActive]}>
              {t("login")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "register" && styles.modeBtnActive]}
            onPress={() => { setMode("register"); setError(""); }}
          >
            <Text style={[styles.modeBtnText, mode === "register" && styles.modeBtnTextActive]}>
              {t("register")}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {mode === "register" && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t("accountType")}</Text>
                <View style={styles.roleRow}>
                  <TouchableOpacity
                    style={[styles.roleCard, registerRole === "user" && styles.roleCardActive]}
                    onPress={() => setRegisterRole("user")}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.roleIconWrap, { backgroundColor: C.lavender + "22" }]}>
                      <Ionicons name="person" size={22} color={C.lavender} />
                    </View>
                    <Text style={[styles.roleTitle, registerRole === "user" && styles.roleTitleActive]}>
                      {t("accountTypeUser")}
                    </Text>
                    <Text style={styles.roleSub}>{t("accountTypeUserSub")}</Text>
                    {registerRole === "user" && (
                      <View style={styles.roleCheck}>
                        <Ionicons name="checkmark-circle" size={18} color={C.lavender} />
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.roleCard, registerRole === "structure" && styles.roleCardPartner]}
                    onPress={() => setRegisterRole("structure")}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.roleIconWrap, { backgroundColor: C.gold + "22" }]}>
                      <Ionicons name="business" size={22} color={C.gold} />
                    </View>
                    <Text style={[styles.roleTitle, registerRole === "structure" && { color: C.gold }]}>
                      {t("accountTypePartner")}
                    </Text>
                    <Text style={styles.roleSub}>{t("accountTypePartnerSub")}</Text>
                    {registerRole === "structure" && (
                      <View style={styles.roleCheck}>
                        <Ionicons name="checkmark-circle" size={18} color={C.gold} />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t("name")}</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="person-outline" size={18} color={C.textMuted} />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder={t("name")}
                    placeholderTextColor={C.textMuted}
                    style={styles.input}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            </>
          )}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t("email")}</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color={C.textMuted} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={C.textMuted}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t("password")}</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={C.textMuted}
                style={styles.input}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={C.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {mode === "register" && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t("phone")}</Text>
              <View style={styles.inputRow}>
                <Ionicons name="call-outline" size={18} color={C.textMuted} />
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+228 XX XX XX XX"
                  placeholderTextColor={C.textMuted}
                  style={styles.input}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          )}

          {mode === "register" && registerRole === "structure" && (
            <>
              <View style={styles.sectionDivider}>
                <Ionicons name="location" size={14} color={C.gold} />
                <Text style={[styles.sectionLabel, { color: C.gold }]}>
                  Localisation géographique
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{lang === "fr" ? "Pays" : "Country"}</Text>
                <TouchableOpacity
                  style={[styles.inputRow, { justifyContent: "space-between" }]}
                  onPress={() => setCountryModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ fontSize: 18 }}>
                      {COUNTRIES.find(c => c.name === country)?.emoji ?? "🌍"}
                    </Text>
                    <Text style={[styles.input, { color: C.text }]}>{country}</Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color={C.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{lang === "fr" ? `Ville (${country})` : `City (${country})`}</Text>
                <TouchableOpacity
                  style={[styles.inputRow, { justifyContent: "space-between" }]}
                  onPress={() => setCityModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Ionicons name="location-outline" size={18} color={C.textMuted} />
                    <Text style={[styles.input, { color: city ? C.text : C.textMuted }]}>
                      {city || (lang === "fr" ? "Sélectionner une ville…" : "Select a city…")}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color={C.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.coordRow}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Latitude</Text>
                  <View style={styles.inputRow}>
                    <Ionicons name="navigate-outline" size={16} color={C.textMuted} />
                    <TextInput
                      value={latitude}
                      onChangeText={setLatitude}
                      placeholder="6.1374"
                      placeholderTextColor={C.textMuted}
                      style={styles.input}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Longitude</Text>
                  <View style={styles.inputRow}>
                    <Ionicons name="navigate-outline" size={16} color={C.textMuted} />
                    <TextInput
                      value={longitude}
                      onChangeText={setLongitude}
                      placeholder="1.2123"
                      placeholderTextColor={C.textMuted}
                      style={styles.input}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </View>

              {city && latitude && longitude && (
                <View style={styles.coordHint}>
                  <Ionicons name="checkmark-circle" size={14} color={C.success} />
                  <Text style={[styles.hintLabel, { color: C.success, fontSize: 12 }]}>
                    Position enregistrée · {parseFloat(latitude).toFixed(4)}, {parseFloat(longitude).toFixed(4)}
                  </Text>
                </View>
              )}

              <View style={styles.sectionDivider}>
                <Ionicons name="business" size={14} color={C.gold} />
                <Text style={[styles.sectionLabel, { color: C.gold }]}>
                  {lang === "fr" ? "Type d'activité" : "Business type"}
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{lang === "fr" ? "Type d'établissement *" : "Establishment type *"}</Text>
                <TouchableOpacity
                  style={[styles.inputRow, { justifyContent: "space-between" }]}
                  onPress={() => setBusinessTypeModal(true)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Ionicons name="grid-outline" size={18} color={C.textMuted} />
                    <Text style={[styles.input, { color: businessType ? C.text : C.textMuted }]}>
                      {businessType
                        ? BUSINESS_TYPES.find(b => b.key === businessType)?.[lang === "fr" ? "labelFr" : "labelEn"] ?? businessType
                        : (lang === "fr" ? "Sélectionner un type…" : "Select a type…")}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color={C.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{lang === "fr" ? "Description de votre activité" : "Activity description"}</Text>
                <View style={[styles.inputRow, { alignItems: "flex-start", paddingTop: 10, paddingBottom: 10 }]}>
                  <Ionicons name="document-text-outline" size={18} color={C.textMuted} style={{ marginTop: 2 }} />
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder={lang === "fr" ? "Décrivez votre établissement, ce que vous proposez…" : "Describe your establishment and what you offer…"}
                    placeholderTextColor={C.textMuted}
                    style={[styles.input, { minHeight: 72, textAlignVertical: "top" }]}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>
            </>
          )}

          {!!error && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={16} color={C.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.submitBtn,
              loading && { opacity: 0.7 },
              mode === "register" && registerRole === "structure" && styles.submitBtnPartner,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.submitBtnText}>{t("processing")}</Text>
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === "login" ? t("login") : t("register")}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>
            {mode === "login" ? (
              <>
                <Text style={styles.hintLabel}>{t("noAccount")} </Text>
                <Text style={styles.hintLink} onPress={() => setMode("register")}>
                  {t("register")}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.hintLabel}>{t("hasAccount")} </Text>
                <Text style={styles.hintLink} onPress={() => setMode("login")}>
                  {t("login")}
                </Text>
              </>
            )}
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={businessTypeModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setBusinessTypeModal(false)}
      >
        <View style={[modal.root, { paddingTop: insets.top + 16 }]}>
          <View style={modal.header}>
            <Text style={modal.title}>{lang === "fr" ? "Type d'activité" : "Business type"}</Text>
            <TouchableOpacity onPress={() => setBusinessTypeModal(false)} style={modal.closeBtn}>
              <Ionicons name="close" size={22} color={C.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 20, paddingHorizontal: 16, paddingTop: 8 }}>
            {BUSINESS_TYPES.map((bt) => {
              const selected = businessType === bt.key;
              const label = lang === "fr" ? bt.labelFr : bt.labelEn;
              return (
                <TouchableOpacity
                  key={bt.key}
                  style={[modal.item, selected && modal.itemActive]}
                  onPress={() => { setBusinessType(bt.key); setBusinessTypeModal(false); }}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[modal.cityName, selected && { color: C.gold }]}>{label}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={20} color={C.gold} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={countryModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCountryModalVisible(false)}
      >
        <View style={[modal.root, { paddingTop: insets.top + 16 }]}>
          <View style={modal.header}>
            <Text style={modal.title}>{lang === "fr" ? "Choisir un pays" : "Choose a country"}</Text>
            <TouchableOpacity onPress={() => setCountryModalVisible(false)} style={modal.closeBtn}>
              <Ionicons name="close" size={22} color={C.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
            {COUNTRIES.map((c) => {
              const selected = country === c.name;
              return (
                <TouchableOpacity
                  key={c.code}
                  style={[modal.item, selected && modal.itemActive]}
                  onPress={() => {
                    if (c.name !== country) {
                      setCountry(c.name);
                      setCity(""); setLatitude(""); setLongitude("");
                    }
                    setCountryModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={modal.emoji}>{c.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[modal.cityName, selected && { color: C.gold }]}>{c.name}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={20} color={C.gold} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={cityModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCityModalVisible(false)}
      >
        <View style={[modal.root, { paddingTop: insets.top + 16 }]}>
          <View style={modal.header}>
            <Text style={modal.title}>{lang === "fr" ? `Ville (${country})` : `City (${country})`}</Text>
            <TouchableOpacity onPress={() => setCityModalVisible(false)} style={modal.closeBtn}>
              <Ionicons name="close" size={22} color={C.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
            {MOCK_CITIES.filter((c) => c.country === country).map((c) => {
              const selected = city === c.name;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[modal.item, selected && modal.itemActive]}
                  onPress={() => handleSelectCity(c)}
                  activeOpacity={0.7}
                >
                  <Text style={modal.emoji}>{c.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[modal.cityName, selected && { color: C.gold }]}>{c.name}</Text>
                    <Text style={modal.coords}>
                      {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}
                    </Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={20} color={C.gold} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const modal = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  itemActive: {
    backgroundColor: C.gold + "12",
  },
  emoji: {
    fontSize: 22,
  },
  cityName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  coords: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    paddingHorizontal: 24,
    gap: 24,
  },
  closeBtn: {
    alignSelf: "flex-end",
    width: 40,
    height: 40,
    backgroundColor: C.card,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  logoArea: {
    alignItems: "center",
    gap: 8,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: C.lavender,
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: C.bg,
  },
  appName: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  tagline: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modeBtnActive: {
    backgroundColor: C.lavender,
  },
  modeBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.textMuted,
  },
  modeBtnTextActive: {
    color: C.bg,
  },
  form: {
    gap: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
    marginLeft: 2,
  },
  roleRow: {
    flexDirection: "row",
    gap: 10,
  },
  roleCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: 14,
    gap: 6,
    position: "relative",
  },
  roleCardActive: {
    borderColor: C.lavender,
    backgroundColor: C.lavender + "10",
  },
  roleCardPartner: {
    borderColor: C.gold,
    backgroundColor: C.gold + "10",
  },
  roleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  roleTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  roleTitleActive: {
    color: C.lavender,
  },
  roleSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    lineHeight: 16,
  },
  roleCheck: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: C.text,
  },
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  coordRow: {
    flexDirection: "row",
    gap: 10,
  },
  coordHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.success + "12",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.success + "30",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.error + "22",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.error,
  },
  submitBtn: {
    backgroundColor: C.lavender,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnPartner: {
    backgroundColor: C.gold,
  },
  submitBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: C.bg,
  },
  hint: {
    textAlign: "center",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  hintLabel: {
    color: C.textMuted,
  },
  hintLink: {
    color: C.lavender,
    fontFamily: "Inter_600SemiBold",
  },
});
