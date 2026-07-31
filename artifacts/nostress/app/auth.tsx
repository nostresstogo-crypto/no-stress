import React, { useRef, useState, useMemo } from "react";
import {
  ActivityIndicator,
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
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { dismissAndReplace } from "@/lib/navigation";

import type { ColorPalette } from "@/constants/colors";
import { useT, useApp, useColors } from "@/context/AppContext";
import { API_BASE } from "@/lib/apiBase";

// ─── Types ───────────────────────────────────────────────────────
type Mode = "login" | "register";
type RegisterRole = "user" | "structure";
type PartnerStep = 1 | 2 | 3;

// ─── Constants ───────────────────────────────────────────────────
const BUSINESS_TYPES = [
  { key: "nightclub",  labelFr: "Boîte de nuit",        labelEn: "Nightclub" },
  { key: "bar",        labelFr: "Bar",                   labelEn: "Bar" },
  { key: "restaurant", labelFr: "Restaurant",            labelEn: "Restaurant" },
  { key: "festival",   labelFr: "Festival",              labelEn: "Festival" },
  { key: "beach",      labelFr: "Beach Club",            labelEn: "Beach Club" },
  { key: "concerts",   labelFr: "Salle de concert",      labelEn: "Concert Hall" },
  { key: "sport",      labelFr: "Sport & loisirs",       labelEn: "Sport & Leisure" },
  { key: "culture",    labelFr: "Culturel / Artistique", labelEn: "Cultural / Artistic" },
  { key: "other",      labelFr: "Autre",                 labelEn: "Other" },
];

// ─── Password strength ───────────────────────────────────────────
function getStrength(pwd: string): 0 | 1 | 2 | 3 {
  if (!pwd) return 0;
  const hasLetter  = /[A-Za-z]/.test(pwd);
  const hasDigit   = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
  if (pwd.length < 6 || !hasLetter) return 1;
  if (pwd.length >= 8 && hasLetter && hasDigit && hasSpecial) return 3;
  if (pwd.length >= 8 && hasLetter && hasDigit) return 2;
  return 1;
}

// ─── Main component ──────────────────────────────────────────────
export default function AuthScreen() {
  const t   = useT();
  const { setUser, setSession, lang, addNotification, configCities, configCountries } = useApp();
  const insets = useSafeAreaInsets();
  const C      = useColors();
  const S      = useMemo(() => makeStyles(C), [C]);
  const M      = useMemo(() => makeModalStyles(C), [C]);

  // Pre-select mode from onboarding (?mode=register|login)
  const params = useLocalSearchParams<{ mode?: string }>();

  // ── Core state ──────────────────────────────────────────────
  const [mode,         setMode]         = useState<Mode>(() => params.mode === "register" ? "register" : "login");
  const [registerRole, setRegisterRole] = useState<RegisterRole>("user");
  const [partnerStep,  setPartnerStep]  = useState<PartnerStep>(1);

  // Login-specific
  const [loginType, setLoginType] = useState<"user" | "partner">("user");

  // Common fields
  const [email,          setEmail]          = useState("");
  const [password,       setPassword]       = useState("");
  const [passwordConfirm,setPasswordConfirm]= useState("");
  const [showPassword,   setShowPassword]   = useState(false);
  const [showPwdConfirm, setShowPwdConfirm] = useState(false);
  const [firstName,      setFirstName]      = useState("");
  const [lastName,       setLastName]       = useState("");
  const [phone,          setPhone]          = useState(""); // partner step 1

  // Partner step 2
  const [businessName,    setBusinessName]    = useState("");
  const [businessType,    setBusinessType]    = useState("");
  const [description,     setDescription]     = useState("");
  const [businessTypeModal, setBusinessTypeModal] = useState(false);

  // Partner step 3 / location
  const [country,              setCountry]              = useState("Togo");
  const [city,                 setCity]                 = useState("");
  const [latitude,             setLatitude]             = useState("");
  const [longitude,            setLongitude]            = useState("");
  const [countryModalVisible,  setCountryModalVisible]  = useState(false);
  const [cityModalVisible,     setCityModalVisible]     = useState(false);

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Feedback
  const [loading,         setLoading]        = useState(false);
  const [globalError,     setGlobalError]    = useState("");
  const [fieldErrors,     setFieldErrors]    = useState<Record<string, string>>({});
  const [emailExistsHint, setEmailExistsHint] = useState(false); // 409 hint instead of auto-switch

  // Refs for keyboard navigation
  const scrollRef       = useRef<ScrollView>(null);
  const firstNameRef    = useRef<TextInput>(null);
  const lastNameRef     = useRef<TextInput>(null);
  const phoneRef        = useRef<TextInput>(null);
  const emailRef        = useRef<TextInput>(null);
  const passwordRef     = useRef<TextInput>(null);
  const pwdConfirmRef   = useRef<TextInput>(null);
  const businessNameRef = useRef<TextInput>(null);
  const descriptionRef  = useRef<TextInput>(null);

  // ── Helpers ─────────────────────────────────────────────────
  const clearErrors = () => { setGlobalError(""); setFieldErrors({}); setEmailExistsHint(false); };

  const fe = (f: string) => fieldErrors[f] ?? "";

  const strength = getStrength(password);
  const strengthLabel = !password ? "" : strength === 1 ? (lang === "fr" ? "Faible" : "Weak") : strength === 2 ? (lang === "fr" ? "Moyen" : "Fair") : (lang === "fr" ? "Fort" : "Strong");
  const strengthColor = strength === 1 ? C.error : strength === 2 ? C.gold : C.success;

  const passwordsMatch = !passwordConfirm || passwordConfirm === password;
  const isPartnerRegister = mode === "register" && registerRole === "structure";

  function switchMode(m: Mode) {
    setMode(m);
    setPartnerStep(1);
    clearErrors();
  }

  function switchRole(r: RegisterRole) {
    setRegisterRole(r);
    setPartnerStep(1);
    clearErrors();
  }

  const handleSelectCity = (c: { name: string; latitude: number | null; longitude: number | null }) => {
    setCity(c.name);
    setLatitude(c.latitude != null ? String(c.latitude) : "");
    setLongitude(c.longitude != null ? String(c.longitude) : "");
    setCityModalVisible(false);
  };

  // ── Validation helpers ───────────────────────────────────────
  function validateLogin(): boolean {
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = lang === "fr" ? "L'email est requis." : "Email is required.";
    if (!password)     errs.password = lang === "fr" ? "Le mot de passe est requis." : "Password is required.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateUserRegister(): boolean {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = lang === "fr" ? "Requis." : "Required.";
    if (!lastName.trim())  errs.lastName  = lang === "fr" ? "Requis." : "Required.";
    if (!email.trim())     errs.email     = lang === "fr" ? "L'email est requis." : "Email is required.";
    if (!password)         errs.password  = lang === "fr" ? "Requis." : "Required.";
    else if (strength < 2) errs.password  = lang === "fr" ? "Mot de passe trop faible." : "Password too weak.";
    if (!passwordConfirm)       errs.passwordConfirm = lang === "fr" ? "Requis." : "Required.";
    else if (password !== passwordConfirm) errs.passwordConfirm = lang === "fr" ? "Les mots de passe ne correspondent pas." : "Passwords do not match.";
    if (!acceptedTerms) errs.terms = lang === "fr" ? "Vous devez accepter les CGU." : "You must accept the Terms.";
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 80);
    }
    return Object.keys(errs).length === 0;
  }

  function validatePartnerStep(step: PartnerStep): boolean {
    const errs: Record<string, string> = {};
    if (step === 1) {
      if (!firstName.trim()) errs.firstName = lang === "fr" ? "Requis." : "Required.";
      if (!lastName.trim())  errs.lastName  = lang === "fr" ? "Requis." : "Required.";
      if (!phone.trim())     errs.phone     = lang === "fr" ? "Requis." : "Required.";
      if (!email.trim())     errs.email     = lang === "fr" ? "L'email est requis." : "Email is required.";
    }
    if (step === 2) {
      if (!businessName.trim()) errs.businessName = lang === "fr" ? "Requis." : "Required.";
      if (!businessType)        errs.businessType = lang === "fr" ? "Sélectionnez un type." : "Select a type.";
    }
    if (step === 3) {
      if (!city) errs.city = lang === "fr" ? "La ville est requise." : "City is required.";
      if (!acceptedTerms) errs.terms = lang === "fr" ? "Vous devez accepter les CGU." : "You must accept the Terms.";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Handlers ─────────────────────────────────────────────────
  async function handleLogin() {
    if (!validateLogin()) return;
    setLoading(true); setGlobalError(""); setEmailExistsHint(false);
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password, accountType: loginType }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.needsVerification) {
          setLoading(false);
          dismissAndReplace({ pathname: "/verify-email", params: { email: data.email || cleanEmail, role: data.role === "partner" ? "partner" : "user" } } as any);
          return;
        }
        if (data?.adminWebOnly) {
          setGlobalError(lang === "fr" ? "L'administration est accessible uniquement depuis l'interface web." : "Administration is accessible only from the web interface.");
          setLoading(false); return;
        }
        if (data?.partnerStatus === "pending") {
          setLoading(false);
          dismissAndReplace({ pathname: "/partner-pending", params: { email: data.email || cleanEmail } } as any);
          return;
        }
        if (data?.partnerStatus === "rejected") {
          setGlobalError(data?.partnerRejectionReason
            ? (lang === "fr" ? `Demande rejetée : ${data.partnerRejectionReason}` : `Request rejected: ${data.partnerRejectionReason}`)
            : (lang === "fr" ? "Votre demande a été rejetée par l'administrateur." : "Your request was rejected by the administrator."));
          setLoading(false); return;
        }
        setGlobalError(data?.error || (lang === "fr" ? "Email ou mot de passe incorrect." : "Incorrect email or password."));
        setLoading(false); return;
      }
      const { token, refreshToken, user: apiUser } = data;
      const normalizedUser = apiUser?.profileImage && !apiUser.avatarUrl ? { ...apiUser, avatarUrl: apiUser.profileImage } : apiUser;
      await setUser(normalizedUser);
      await setSession(token, refreshToken || null);
      if (apiUser.role === "structure" && apiUser.partnerStatus === "approved") {
        addNotification({ title: "Welcome back!", titleFr: "Bon retour !", body: "Your partner account is active.", bodyFr: "Votre compte partenaire est actif." });
      }
    } catch {
      setGlobalError(lang === "fr" ? "Erreur réseau. Vérifiez votre connexion." : "Network error. Check your connection.");
    }
    setLoading(false);
    router.back();
  }

  async function handleUserRegister() {
    if (!validateUserRegister()) return;
    setLoading(true); setGlobalError(""); setEmailExistsHint(false);
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          gender: "ND",   // completed in profile
          phone: "",       // completed in profile
          country: "Togo", // completed in profile
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) {
          setEmailExistsHint(true);
          setFieldErrors(e => ({ ...e, email: lang === "fr" ? "Un compte existe déjà avec cet email." : "An account already exists with this email." }));
          setLoading(false); return;
        }
        setGlobalError(data?.error || (lang === "fr" ? "Erreur lors de l'inscription." : "Registration error."));
        setLoading(false); return;
      }
      setLoading(false);
      dismissAndReplace({ pathname: "/verify-email", params: { email: cleanEmail, role: "user" } } as any);
    } catch {
      setGlobalError(lang === "fr" ? "Erreur réseau. Vérifiez votre connexion." : "Network error. Check your connection.");
      setLoading(false);
    }
  }

  function handlePartnerNext() {
    if (!validatePartnerStep(partnerStep)) return;
    if (partnerStep < 3) {
      setPartnerStep((s) => (s + 1) as PartnerStep);
      clearErrors();
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 50);
    }
  }

  function handlePartnerBack() {
    if (partnerStep > 1) {
      setPartnerStep((s) => (s - 1) as PartnerStep);
      clearErrors();
    }
  }

  async function handlePartnerRegister() {
    if (!validatePartnerStep(3)) return;
    setLoading(true); setGlobalError(""); setEmailExistsHint(false);
    const cleanEmail = email.trim().toLowerCase();
    const contactName = `${firstName.trim()} ${lastName.trim()}`.trim();
    try {
      const res = await fetch(`${API_BASE}/partners/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          contactName,
          businessName: businessName.trim(),
          businessType,
          phone: phone.trim(),
          city,
          country,
          description: description.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409 && data?.alreadyRegistered) {
          setEmailExistsHint(true);
          setFieldErrors({ email: lang === "fr" ? "Un compte existe déjà avec cet email." : "An account already exists with this email." });
          setPartnerStep(1);
          setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 80);
          setLoading(false); return;
        }
        setGlobalError(data?.error || (lang === "fr" ? "Erreur lors de l'inscription." : "Registration error."));
        setLoading(false); return;
      }
      setLoading(false);
      dismissAndReplace({ pathname: "/verify-email", params: { email: cleanEmail, role: "partner" } } as any);
    } catch {
      setGlobalError(lang === "fr" ? "Erreur réseau. Vérifiez votre connexion." : "Network error. Check your connection.");
      setLoading(false);
    }
  }

  // ── Render helpers ───────────────────────────────────────────
  const LAVENDER = C.lavender;

  function FieldWrap({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
      <View style={S.field}>
        <Text style={S.fieldLabel}>{label}</Text>
        {children}
        {!!error && (
          <View style={S.fieldErrorRow}>
            <Ionicons name="alert-circle" size={13} color={C.error} />
            <Text style={[S.fieldErrorText, { color: C.error }]}>{error}</Text>
          </View>
        )}
      </View>
    );
  }

  function InputBox({
    value, onChange, placeholder, icon, secure, showToggle, onToggle,
    keyboardType = "default", autoCapitalize = "none", autoCorrect = false,
    returnKeyType, onSubmit, ref: inputRef, multiline, accessLabel,
  }: {
    value: string; onChange: (v: string) => void; placeholder: string;
    icon: keyof typeof Ionicons.glyphMap; secure?: boolean;
    showToggle?: boolean; onToggle?: () => void;
    keyboardType?: "default" | "email-address" | "phone-pad";
    autoCapitalize?: "none" | "words" | "sentences";
    autoCorrect?: boolean;
    returnKeyType?: "next" | "done" | "go";
    onSubmit?: () => void;
    ref?: React.RefObject<TextInput | null>;
    multiline?: boolean;
    accessLabel?: string;
  }) {
    return (
      <View style={S.inputRow}>
        <Ionicons name={icon} size={17} color={C.textMuted} />
        <TextInput
          ref={inputRef as React.RefObject<TextInput>}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          style={[S.input, multiline && { minHeight: 72, textAlignVertical: "top" }]}
          secureTextEntry={secure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmit}
          multiline={multiline}
          blurOnSubmit={!multiline}
          accessibilityLabel={accessLabel || placeholder}
        />
        {showToggle && (
          <TouchableOpacity onPress={onToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={secure ? "eye-outline" : "eye-off-outline"} size={17} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function PickerButton({ label, icon, value, onPress, error }: {
    label: string; icon: keyof typeof Ionicons.glyphMap;
    value?: string; onPress: () => void; error?: string;
  }) {
    return (
      <FieldWrap label={label} error={error}>
        <TouchableOpacity style={[S.inputRow, S.pickerRow]} onPress={onPress} activeOpacity={0.8} accessibilityLabel={label}>
          <Ionicons name={icon} size={17} color={C.textMuted} />
          <Text style={[S.input, { color: value ? C.text : C.textMuted, flex: 1 }]}>
            {value || (lang === "fr" ? "Sélectionner…" : "Select…")}
          </Text>
          <Ionicons name="chevron-down" size={15} color={C.textMuted} />
        </TouchableOpacity>
      </FieldWrap>
    );
  }

  function TermsRow() {
    return (
      <View>
        <TouchableOpacity style={S.termsRow} activeOpacity={0.7} onPress={() => setAcceptedTerms(v => !v)} accessibilityLabel={lang === "fr" ? "Accepter les conditions" : "Accept terms"}>
          <View style={[S.checkbox, acceptedTerms && { backgroundColor: LAVENDER, borderColor: LAVENDER }]}>
            {acceptedTerms && <Ionicons name="checkmark" size={14} color={C.bg} />}
          </View>
          <Text style={S.termsText}>
            {t("acceptTermsLabel")}{" "}
            <Text style={S.termsLink} onPress={e => { e.stopPropagation?.(); router.push("/legal/terms"); }}>
              {t("acceptTermsCgu")}
            </Text>
            {" "}{t("acceptTermsAnd")}{" "}
            <Text style={S.termsLink} onPress={e => { e.stopPropagation?.(); router.push("/legal/privacy"); }}>
              {t("acceptTermsPrivacy")}
            </Text>.
          </Text>
        </TouchableOpacity>
        {!!fe("terms") && (
          <View style={S.fieldErrorRow}>
            <Ionicons name="alert-circle" size={13} color={C.error} />
            <Text style={[S.fieldErrorText, { color: C.error }]}>{fe("terms")}</Text>
          </View>
        )}
      </View>
    );
  }

  function GlobalError() {
    if (!globalError) return null;
    return (
      <View style={S.errorRow}>
        <Ionicons name="alert-circle" size={16} color={C.error} />
        <Text style={S.errorText}>{globalError}</Text>
      </View>
    );
  }

  function SubmitBtn({ label, onPress, color = LAVENDER }: { label: string; onPress: () => void; color?: string }) {
    return (
      <TouchableOpacity onPress={onPress} disabled={loading} activeOpacity={0.88} accessibilityLabel={label} accessibilityRole="button">
        <LinearGradient
          colors={[color, color + "CC"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[S.submitBtn, loading && { opacity: 0.65 }]}
        >
          {loading
            ? <ActivityIndicator color={C.bg} size="small" />
            : <Text style={S.submitBtnText}>{label}</Text>}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // ── Login form ──────────────────────────────────────────────
  function LoginForm() {
    return (
      <>
        {/* Account type toggle — compact */}
        <View style={S.compactToggle}>
          {(["user", "partner"] as const).map(type => {
            const active = loginType === type;
            const label  = type === "user"
              ? (lang === "fr" ? "Utilisateur" : "User")
              : (lang === "fr" ? "Partenaire" : "Partner");
            const icon = type === "user" ? "person" as const : "business" as const;
            return (
              <TouchableOpacity
                key={type}
                style={[S.compactToggleBtn, active && { backgroundColor: active && type === "user" ? LAVENDER : C.gold, borderColor: "transparent" }]}
                onPress={() => setLoginType(type)}
                activeOpacity={0.85}
                accessibilityLabel={label}
              >
                <Ionicons name={icon} size={14} color={active ? C.bg : C.textMuted} />
                <Text style={[S.compactToggleText, { color: active ? C.bg : C.textMuted }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[S.compactToggleHint, { color: C.textMuted }]}>
          {lang === "fr" ? "Choisissez votre type de compte pour vous connecter." : "Select your account type to log in."}
        </Text>

        <FieldWrap label={t("email")} error={fe("email")}>
          <InputBox
            ref={emailRef} value={email} onChange={v => { setEmail(v); clearErrors(); }}
            placeholder="you@example.com" icon="mail-outline" keyboardType="email-address"
            returnKeyType="next" onSubmit={() => passwordRef.current?.focus()}
            accessLabel="Email"
          />
        </FieldWrap>

        <FieldWrap label={t("password")} error={fe("password")}>
          <InputBox
            ref={passwordRef} value={password} onChange={setPassword}
            placeholder="••••••••" icon="lock-closed-outline"
            secure={!showPassword} showToggle onToggle={() => setShowPassword(v => !v)}
            returnKeyType="done" onSubmit={handleLogin}
            accessLabel={t("password")}
          />
          <TouchableOpacity onPress={() => router.push("/forgot-password")} style={{ alignSelf: "flex-end", marginTop: 6 }}>
            <Text style={{ color: LAVENDER, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
              {lang === "fr" ? "Mot de passe oublié ?" : "Forgot password?"}
            </Text>
          </TouchableOpacity>
        </FieldWrap>

        {/* 409 hint */}
        {emailExistsHint && (
          <View style={S.hintCard}>
            <Ionicons name="information-circle-outline" size={16} color={LAVENDER} />
            <Text style={[S.hintCardText, { color: C.textMuted }]}>
              {lang === "fr" ? "Un compte existe avec cet email. " : "An account exists with this email. "}
              <Text style={{ color: LAVENDER, fontFamily: "Inter_600SemiBold" }}
                onPress={() => { switchMode("login"); setEmailExistsHint(false); }}>
                {lang === "fr" ? "Se connecter →" : "Sign in →"}
              </Text>
            </Text>
          </View>
        )}

        <GlobalError />
        <SubmitBtn label={t("login")} onPress={handleLogin} color={loginType === "partner" ? C.gold : LAVENDER} />

        <Text style={S.hint}>
          <Text style={S.hintLabel}>{t("noAccount")} </Text>
          <Text style={S.hintLink} onPress={() => switchMode("register")}>{t("register")}</Text>
        </Text>
      </>
    );
  }

  // ── User register form ─────────────────────────────────────
  function UserRegisterForm() {
    return (
      <>
        <FieldWrap label={lang === "fr" ? "Prénoms *" : "First name *"} error={fe("firstName")}>
          <InputBox
            ref={firstNameRef} value={firstName} onChange={v => { setFirstName(v); setFieldErrors(e => ({ ...e, firstName: "" })); }}
            placeholder={lang === "fr" ? "Vos prénoms" : "Your first name"}
            icon="person-outline" autoCapitalize="words"
            returnKeyType="next" onSubmit={() => lastNameRef.current?.focus()}
            accessLabel={lang === "fr" ? "Prénoms" : "First name"}
          />
        </FieldWrap>

        <FieldWrap label={lang === "fr" ? "Nom *" : "Last name *"} error={fe("lastName")}>
          <InputBox
            ref={lastNameRef} value={lastName} onChange={v => { setLastName(v); setFieldErrors(e => ({ ...e, lastName: "" })); }}
            placeholder={lang === "fr" ? "Votre nom de famille" : "Your last name"}
            icon="person-outline" autoCapitalize="words"
            returnKeyType="next" onSubmit={() => emailRef.current?.focus()}
            accessLabel={lang === "fr" ? "Nom" : "Last name"}
          />
        </FieldWrap>

        <FieldWrap label={t("email")} error={fe("email")}>
          <InputBox
            ref={emailRef} value={email} onChange={v => { setEmail(v); clearErrors(); }}
            placeholder="you@example.com" icon="mail-outline" keyboardType="email-address"
            returnKeyType="next" onSubmit={() => passwordRef.current?.focus()}
            accessLabel="Email"
          />
          {emailExistsHint && (
            <View style={S.hintCard}>
              <Ionicons name="information-circle-outline" size={15} color={LAVENDER} />
              <Text style={[S.hintCardText, { color: C.textMuted }]}>
                {lang === "fr" ? "Déjà inscrit ? " : "Already registered? "}
                <Text style={{ color: LAVENDER, fontFamily: "Inter_600SemiBold" }} onPress={() => switchMode("login")}>
                  {lang === "fr" ? "Se connecter →" : "Sign in →"}
                </Text>
              </Text>
            </View>
          )}
        </FieldWrap>

        <FieldWrap label={lang === "fr" ? "Mot de passe *" : "Password *"} error={fe("password")}>
          <InputBox
            ref={passwordRef} value={password} onChange={setPassword}
            placeholder="••••••••" icon="lock-closed-outline"
            secure={!showPassword} showToggle onToggle={() => setShowPassword(v => !v)}
            returnKeyType="next" onSubmit={() => pwdConfirmRef.current?.focus()}
            accessLabel={t("password")}
          />
          {/* Strength bar */}
          {password.length > 0 && (
            <View style={{ marginTop: 8, gap: 5 }}>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {[1, 2, 3].map(i => (
                  <View key={i} style={[S.strengthSeg, { backgroundColor: strength >= i ? strengthColor : C.border }]} />
                ))}
              </View>
              <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: strengthColor }}>
                {strengthLabel}
              </Text>
            </View>
          )}
          {!password && (
            <Text style={{ marginTop: 5, fontSize: 11, color: C.textMuted, fontFamily: "Inter_400Regular" }}>
              {lang === "fr" ? "8 caractères min · lettres + chiffres" : "Min 8 chars · letters + digits"}
            </Text>
          )}
        </FieldWrap>

        <FieldWrap label={lang === "fr" ? "Confirmer le mot de passe *" : "Confirm password *"} error={fe("passwordConfirm")}>
          <InputBox
            ref={pwdConfirmRef} value={passwordConfirm} onChange={setPasswordConfirm}
            placeholder="••••••••" icon="lock-closed-outline"
            secure={!showPwdConfirm} showToggle onToggle={() => setShowPwdConfirm(v => !v)}
            returnKeyType="done" onSubmit={handleUserRegister}
            accessLabel={lang === "fr" ? "Confirmer le mot de passe" : "Confirm password"}
          />
          {passwordConfirm.length > 0 && !passwordsMatch && (
            <View style={S.fieldErrorRow}>
              <Ionicons name="close-circle" size={13} color={C.error} />
              <Text style={[S.fieldErrorText, { color: C.error }]}>
                {lang === "fr" ? "Les mots de passe ne correspondent pas." : "Passwords do not match."}
              </Text>
            </View>
          )}
          {passwordConfirm.length > 0 && passwordsMatch && passwordConfirm === password && (
            <View style={S.fieldErrorRow}>
              <Ionicons name="checkmark-circle" size={13} color={C.success} />
              <Text style={[S.fieldErrorText, { color: C.success }]}>
                {lang === "fr" ? "Identiques." : "Matching."}
              </Text>
            </View>
          )}
        </FieldWrap>

        <TermsRow />
        <GlobalError />
        <SubmitBtn label={t("register")} onPress={handleUserRegister} />

        <Text style={S.hint}>
          <Text style={S.hintLabel}>{t("hasAccount")} </Text>
          <Text style={S.hintLink} onPress={() => switchMode("login")}>{t("login")}</Text>
        </Text>
      </>
    );
  }

  // ── Partner multi-step form ────────────────────────────────
  function PartnerProgressBar() {
    const steps = [
      lang === "fr" ? "Contact" : "Contact",
      lang === "fr" ? "Structure" : "Business",
      lang === "fr" ? "Localisation" : "Location",
    ];
    return (
      <View style={S.progressWrap}>
        {steps.map((label, i) => {
          const idx     = i + 1;
          const done    = partnerStep > idx;
          const active  = partnerStep === idx;
          const color   = done ? C.success : active ? C.gold : C.border;
          const textClr = done || active ? C.text : C.textMuted;
          return (
            <React.Fragment key={label}>
              <View style={{ alignItems: "center", gap: 5 }}>
                <View style={[S.stepCircle, { borderColor: color, backgroundColor: done ? C.success : active ? C.gold + "22" : "transparent" }]}>
                  {done
                    ? <Ionicons name="checkmark" size={14} color={C.bg} />
                    : <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color }}>{idx}</Text>}
                </View>
                <Text style={{ fontSize: 10, fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular", color: textClr }}>{label}</Text>
              </View>
              {i < 2 && <View style={[S.stepLine, { backgroundColor: partnerStep > idx ? C.success : C.border }]} />}
            </React.Fragment>
          );
        })}
      </View>
    );
  }

  function PartnerStep1() {
    return (
      <>
        <FieldWrap label={lang === "fr" ? "Prénoms du contact *" : "Contact first name *"} error={fe("firstName")}>
          <InputBox
            ref={firstNameRef} value={firstName} onChange={v => { setFirstName(v); setFieldErrors(e => ({ ...e, firstName: "" })); }}
            placeholder={lang === "fr" ? "Prénoms" : "First name"}
            icon="person-outline" autoCapitalize="words"
            returnKeyType="next" onSubmit={() => lastNameRef.current?.focus()}
            accessLabel={lang === "fr" ? "Prénoms du contact" : "Contact first name"}
          />
        </FieldWrap>

        <FieldWrap label={lang === "fr" ? "Nom du contact *" : "Contact last name *"} error={fe("lastName")}>
          <InputBox
            ref={lastNameRef} value={lastName} onChange={v => { setLastName(v); setFieldErrors(e => ({ ...e, lastName: "" })); }}
            placeholder={lang === "fr" ? "Nom" : "Last name"}
            icon="person-outline" autoCapitalize="words"
            returnKeyType="next" onSubmit={() => phoneRef.current?.focus()}
            accessLabel={lang === "fr" ? "Nom du contact" : "Contact last name"}
          />
        </FieldWrap>

        <FieldWrap label={lang === "fr" ? "Téléphone de contact *" : "Contact phone *"} error={fe("phone")}>
          <InputBox
            ref={phoneRef} value={phone} onChange={v => { setPhone(v); setFieldErrors(e => ({ ...e, phone: "" })); }}
            placeholder="+228 XX XX XX XX" icon="call-outline" keyboardType="phone-pad"
            returnKeyType="next" onSubmit={() => emailRef.current?.focus()}
            accessLabel={lang === "fr" ? "Téléphone" : "Phone"}
          />
        </FieldWrap>

        <FieldWrap label={lang === "fr" ? "Email *" : "Email *"} error={fe("email")}>
          <InputBox
            ref={emailRef} value={email} onChange={v => { setEmail(v); clearErrors(); }}
            placeholder="contact@structure.com" icon="mail-outline" keyboardType="email-address"
            returnKeyType="done" onSubmit={handlePartnerNext}
            accessLabel="Email"
          />
          {emailExistsHint && (
            <View style={S.hintCard}>
              <Ionicons name="information-circle-outline" size={15} color={LAVENDER} />
              <Text style={[S.hintCardText, { color: C.textMuted }]}>
                {lang === "fr" ? "Déjà inscrit ? " : "Already registered? "}
                <Text style={{ color: LAVENDER, fontFamily: "Inter_600SemiBold" }} onPress={() => switchMode("login")}>
                  {lang === "fr" ? "Se connecter →" : "Sign in →"}
                </Text>
              </Text>
            </View>
          )}
        </FieldWrap>
      </>
    );
  }

  function PartnerStep2() {
    return (
      <>
        <FieldWrap label={lang === "fr" ? "Nom de la structure *" : "Business name *"} error={fe("businessName")}>
          <InputBox
            ref={businessNameRef} value={businessName} onChange={v => { setBusinessName(v); setFieldErrors(e => ({ ...e, businessName: "" })); }}
            placeholder={lang === "fr" ? "Nom de votre établissement" : "Your establishment name"}
            icon="business-outline" autoCapitalize="words"
            returnKeyType="next" onSubmit={() => descriptionRef.current?.focus()}
            accessLabel={lang === "fr" ? "Nom de la structure" : "Business name"}
          />
        </FieldWrap>

        <PickerButton
          label={lang === "fr" ? "Type d'établissement *" : "Establishment type *"}
          icon="grid-outline"
          value={businessType ? (BUSINESS_TYPES.find(b => b.key === businessType)?.[lang === "fr" ? "labelFr" : "labelEn"] ?? businessType) : undefined}
          onPress={() => setBusinessTypeModal(true)}
          error={fe("businessType")}
        />

        <FieldWrap label={lang === "fr" ? "Description de l'activité" : "Activity description"}>
          <InputBox
            ref={descriptionRef} value={description} onChange={setDescription}
            placeholder={lang === "fr" ? "Décrivez votre établissement…" : "Describe your establishment…"}
            icon="document-text-outline" multiline autoCapitalize="sentences" autoCorrect
            accessLabel={lang === "fr" ? "Description" : "Description"}
          />
        </FieldWrap>

        {/* Info card: password will be sent by email */}
        <View style={S.infoCard}>
          <Ionicons name="mail-open-outline" size={16} color={C.gold} />
          <Text style={S.infoCardText}>
            {lang === "fr"
              ? "Un mot de passe sécurisé vous sera envoyé par email après validation par notre équipe."
              : "A secure password will be emailed to you once our team validates your request."}
          </Text>
        </View>
      </>
    );
  }

  function PartnerStep3() {
    const countryObj = configCountries.find(c => c.name === country);
    const filteredCities = configCities
      .filter(c => c.countryName === country)
      .filter((c, idx, arr) => arr.findIndex(x => x.name === c.name) === idx);
    const cityObj = filteredCities.find(c => c.name === city);
    return (
      <>
        <PickerButton
          label={lang === "fr" ? "Pays" : "Country"}
          icon="globe-outline"
          value={countryObj ? `${countryObj.emoji} ${country}` : country}
          onPress={() => setCountryModalVisible(true)}
        />

        <PickerButton
          label={lang === "fr" ? `Ville (${country}) *` : `City (${country}) *`}
          icon="location-outline"
          value={cityObj ? `${cityObj.emoji ?? ""} ${city}`.trim() : city || undefined}
          onPress={() => setCityModalVisible(true)}
          error={fe("city")}
        />

        <View style={S.infoCard}>
          <Ionicons name="information-circle-outline" size={15} color={C.success} />
          <Text style={S.infoCardText}>
            {lang === "fr"
              ? "Vous définirez la position GPS exacte de votre lieu après votre première connexion."
              : "You will set the exact GPS location of your venue after your first login."}
          </Text>
        </View>

        <TermsRow />
        <GlobalError />
      </>
    );
  }

  function PartnerNavButtons() {
    const isLastStep = partnerStep === 3;
    return (
      <View style={S.partnerNav}>
        {partnerStep > 1 && (
          <TouchableOpacity style={S.prevBtn} onPress={handlePartnerBack} activeOpacity={0.8} accessibilityLabel={lang === "fr" ? "Précédent" : "Previous"}>
            <Ionicons name="chevron-back" size={16} color={C.textMuted} />
            <Text style={[S.prevBtnText, { color: C.textMuted }]}>{lang === "fr" ? "Précédent" : "Previous"}</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          {isLastStep
            ? <SubmitBtn label={lang === "fr" ? "Envoyer la demande" : "Submit request"} onPress={handlePartnerRegister} color={C.gold} />
            : (
              <TouchableOpacity onPress={handlePartnerNext} activeOpacity={0.88} accessibilityLabel={lang === "fr" ? "Suivant" : "Next"}>
                <LinearGradient colors={[C.gold, C.gold + "CC"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.submitBtn}>
                  <Text style={S.submitBtnText}>{lang === "fr" ? "Suivant" : "Next"}</Text>
                  <Ionicons name="chevron-forward" size={16} color={C.bg} />
                </LinearGradient>
              </TouchableOpacity>
            )
          }
        </View>
      </View>
    );
  }

  // ── JSX ──────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={S.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[S.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Close */}
        <TouchableOpacity style={S.closeBtn} onPress={() => router.back()} accessibilityLabel={lang === "fr" ? "Fermer" : "Close"}>
          <Ionicons name="close" size={22} color={C.textMuted} />
        </TouchableOpacity>

        {/* Logo area */}
        <View style={S.logoArea}>
          <View style={[S.logo, { backgroundColor: isPartnerRegister ? C.gold : LAVENDER }]}>
            <Text style={S.logoLetter}>N</Text>
          </View>
          <Text style={S.appName}>NoStress</Text>
          <Text style={S.tagline}>
            {mode === "login"
              ? t("loginTitle")
              : registerRole === "user"
                ? t("registerTitle")
                : (lang === "fr" ? "Devenir partenaire" : "Become a partner")}
          </Text>
        </View>

        {/* Mode toggle */}
        <View style={S.modeToggle} accessibilityRole="tablist">
          <TouchableOpacity
            style={[S.modeBtn, mode === "login" && { backgroundColor: LAVENDER }]}
            onPress={() => switchMode("login")}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === "login" }}
            accessibilityLabel={t("login")}
          >
            <Text style={[S.modeBtnText, { color: mode === "login" ? C.bg : C.textMuted }]}>{t("login")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[S.modeBtn, mode === "register" && { backgroundColor: LAVENDER }]}
            onPress={() => switchMode("register")}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === "register" }}
            accessibilityLabel={t("register")}
          >
            <Text style={[S.modeBtnText, { color: mode === "register" ? C.bg : C.textMuted }]}>{t("register")}</Text>
          </TouchableOpacity>
        </View>

        <View style={S.form}>
          {mode === "login" && <LoginForm />}

          {mode === "register" && (
            <>
              {/* Role selector */}
              <View style={S.roleRow}>
                {(["user", "structure"] as const).map(role => {
                  const active = registerRole === role;
                  const color  = role === "user" ? LAVENDER : C.gold;
                  return (
                    <TouchableOpacity
                      key={role}
                      style={[S.roleCard, active && { borderColor: color, backgroundColor: color + "12" }]}
                      onPress={() => switchRole(role)} activeOpacity={0.8}
                      accessibilityLabel={role === "user" ? t("accountTypeUser") : t("accountTypePartner")}
                    >
                      <View style={[S.roleIconWrap, { backgroundColor: color + "20" }]}>
                        <Ionicons name={role === "user" ? "person" : "business"} size={20} color={color} />
                      </View>
                      <Text style={[S.roleTitle, active && { color }]}>
                        {role === "user" ? t("accountTypeUser") : t("accountTypePartner")}
                      </Text>
                      <Text style={S.roleSub}>
                        {role === "user" ? t("accountTypeUserSub") : t("accountTypePartnerSub")}
                      </Text>
                      {active && <View style={S.roleCheck}><Ionicons name="checkmark-circle" size={17} color={color} /></View>}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* User form */}
              {registerRole === "user" && <UserRegisterForm />}

              {/* Partner multi-step */}
              {registerRole === "structure" && (
                <>
                  <PartnerProgressBar />
                  {partnerStep === 1 && <PartnerStep1 />}
                  {partnerStep === 2 && <PartnerStep2 />}
                  {partnerStep === 3 && <PartnerStep3 />}
                  <PartnerNavButtons />
                  <Text style={S.hint}>
                    <Text style={S.hintLabel}>{t("hasAccount")} </Text>
                    <Text style={S.hintLink} onPress={() => switchMode("login")}>{t("login")}</Text>
                  </Text>
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* ── Modals ── */}
      <Modal visible={businessTypeModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setBusinessTypeModal(false)}>
        <View style={[M.root, { paddingTop: insets.top + 16 }]}>
          <View style={M.header}>
            <Text style={M.title}>{lang === "fr" ? "Type d'activité" : "Business type"}</Text>
            <TouchableOpacity onPress={() => setBusinessTypeModal(false)} style={M.closeBtn} accessibilityLabel={lang === "fr" ? "Fermer" : "Close"} accessibilityRole="button">
              <Ionicons name="close" size={22} color={C.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 20, paddingHorizontal: 16, paddingTop: 8 }}>
            {BUSINESS_TYPES.map(bt => {
              const selected = businessType === bt.key;
              const label    = lang === "fr" ? bt.labelFr : bt.labelEn;
              return (
                <TouchableOpacity
                  key={bt.key}
                  style={[M.item, selected && { backgroundColor: C.gold + "12" }]}
                  onPress={() => { setBusinessType(bt.key); setFieldErrors(e => ({ ...e, businessType: "" })); setBusinessTypeModal(false); }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected }}
                >
                  <Text style={[M.cityName, { flex: 1 }, selected && { color: C.gold }]}>{label}</Text>
                  {selected && <Ionicons name="checkmark-circle" size={20} color={C.gold} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={countryModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCountryModalVisible(false)}>
        <View style={[M.root, { paddingTop: insets.top + 16 }]}>
          <View style={M.header}>
            <Text style={M.title}>{lang === "fr" ? "Choisir un pays" : "Choose a country"}</Text>
            <TouchableOpacity onPress={() => setCountryModalVisible(false)} style={M.closeBtn} accessibilityLabel={lang === "fr" ? "Fermer" : "Close"} accessibilityRole="button">
              <Ionicons name="close" size={22} color={C.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
            {configCountries.map(c => {
              const selected = country === c.name;
              return (
                <TouchableOpacity
                  key={c.code}
                  style={[M.item, selected && { backgroundColor: C.gold + "12" }]}
                  onPress={() => { if (c.name !== country) { setCountry(c.name); setCity(""); setLatitude(""); setLongitude(""); } setCountryModalVisible(false); }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.emoji} ${c.name}`}
                  accessibilityState={{ selected }}
                >
                  <Text style={M.emoji}>{c.emoji}</Text>
                  <Text style={[M.cityName, { flex: 1 }, selected && { color: C.gold }]}>{c.name}</Text>
                  {selected && <Ionicons name="checkmark-circle" size={20} color={C.gold} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={cityModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCityModalVisible(false)}>
        <View style={[M.root, { paddingTop: insets.top + 16 }]}>
          <View style={M.header}>
            <Text style={M.title}>{lang === "fr" ? `Ville (${country})` : `City (${country})`}</Text>
            <TouchableOpacity onPress={() => setCityModalVisible(false)} style={M.closeBtn} accessibilityLabel={lang === "fr" ? "Fermer" : "Close"} accessibilityRole="button">
              <Ionicons name="close" size={22} color={C.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
            {configCities
              .filter(c => c.countryName === country)
              .filter((c, i, arr) => arr.findIndex(x => x.name === c.name) === i)
              .map(c => {
                const selected = city === c.name;
                const cityLabel = `${c.emoji ? c.emoji + " " : ""}${c.name}`;
                return (
                  <TouchableOpacity
                    key={c.slug}
                    style={[M.item, selected && { backgroundColor: C.gold + "12" }]}
                    onPress={() => { handleSelectCity(c); setFieldErrors(e => ({ ...e, city: "" })); }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={cityLabel}
                    accessibilityState={{ selected }}
                  >
                    <Text style={M.emoji}>{c.emoji}</Text>
                    <Text style={[M.cityName, { flex: 1 }, selected && { color: C.gold }]}>{c.name}</Text>
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

// ─── Styles ───────────────────────────────────────────────────────
const makeStyles = (C: ColorPalette) => StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 24, gap: 20 },

  closeBtn: { alignSelf: "flex-end", width: 38, height: 38, backgroundColor: C.card, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },

  logoArea:   { alignItems: "center", gap: 6 },
  logo:       { width: 68, height: 68, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  logoLetter: { fontSize: 34, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  appName:    { fontSize: 24, fontFamily: "Inter_700Bold", color: C.text },
  tagline:    { fontSize: 15, fontFamily: "Inter_400Regular", color: C.textMuted },

  modeToggle: { flexDirection: "row", backgroundColor: C.card, borderRadius: 13, borderWidth: 1, borderColor: C.border, padding: 4, gap: 4 },
  modeBtn:    { flex: 1, paddingVertical: 11, borderRadius: 9, alignItems: "center" },
  modeBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  form: { gap: 14 },

  // Compact login type toggle
  compactToggle:     { flexDirection: "row", borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, overflow: "hidden" },
  compactToggleBtn:  { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 11 },
  compactToggleText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  compactToggleHint: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: -6 },

  // Role cards
  roleRow:     { flexDirection: "row", gap: 10 },
  roleCard:    { flex: 1, backgroundColor: C.card, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, padding: 12, gap: 5, position: "relative" },
  roleIconWrap:{ width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  roleTitle:   { fontSize: 12, fontFamily: "Inter_700Bold", color: C.text },
  roleSub:     { fontSize: 10, fontFamily: "Inter_400Regular", color: C.textMuted, lineHeight: 14 },
  roleCheck:   { position: "absolute", top: 8, right: 8 },

  // Fields
  field:          { gap: 5 },
  fieldLabel:     { fontSize: 12, fontFamily: "Inter_600SemiBold", color: C.textMuted, marginLeft: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  fieldErrorRow:  { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  fieldErrorText: { fontSize: 11, fontFamily: "Inter_400Regular" },

  inputRow:   { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 13, borderWidth: 1, borderColor: C.border, gap: 10 },
  pickerRow:  { justifyContent: "space-between" },
  input:      { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: C.text },

  // Strength bar
  strengthSeg: { flex: 1, height: 4, borderRadius: 2 },

  // Partner progress
  progressWrap: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  stepCircle:   { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  stepLine:     { flex: 1, height: 2, marginHorizontal: 4, marginBottom: 18 },

  // Errors / hints
  errorRow:     { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.error + "1A", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: C.error + "30" },
  errorText:    { fontSize: 13, fontFamily: "Inter_400Regular", color: C.error, flex: 1 },
  hintCard:     { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: C.lavender + "12", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: C.lavender + "30", marginTop: 6 },
  hintCardText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 19 },

  // Info card
  infoCard:     { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: C.gold + "12", borderWidth: 1, borderColor: C.gold + "40", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 },
  infoCardText: { flex: 1, color: C.text, fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },

  // Submit
  submitBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 16 },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },

  // Partner nav
  partnerNav: { flexDirection: "row", alignItems: "center", gap: 10 },
  prevBtn:    { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 16, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  prevBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // Terms
  termsRow:  { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 2, paddingHorizontal: 2 },
  checkbox:  { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.lavender, alignItems: "center", justifyContent: "center", marginTop: 1 },
  termsText: { flex: 1, fontSize: 13, lineHeight: 19, color: C.textMuted, fontFamily: "Inter_400Regular" },
  termsLink: { color: C.lavender, fontFamily: "Inter_600SemiBold", textDecorationLine: "underline" },

  // Hint
  hint:      { textAlign: "center", fontSize: 13, fontFamily: "Inter_400Regular" },
  hintLabel: { color: C.textMuted },
  hintLink:  { color: C.lavender, fontFamily: "Inter_600SemiBold" },
});

const makeModalStyles = (C: ColorPalette) => StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  header:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 4 },
  title:   { fontSize: 17, fontFamily: "Inter_700Bold", color: C.text },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.card, alignItems: "center", justifyContent: "center" },
  item:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 },
  emoji:   { fontSize: 20 },
  cityName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.text },
});
