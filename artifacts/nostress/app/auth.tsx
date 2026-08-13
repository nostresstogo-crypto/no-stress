/**
 * auth.tsx — Écran d'authentification NoStress
 *
 * ARCHITECTURE IMPORTANTE — CLAVIER / FOCUS :
 * Tous les sous-composants (FieldWrap, InputBox, GlobalError, SubmitBtn,
 * TermsRow, LocationSearch) sont définis AU NIVEAU MODULE, en dehors de
 * AuthScreen. Si ces composants étaient définis à l'intérieur de AuthScreen,
 * React les traiterait comme de nouveaux types à chaque render, provoquerait
 * un démontage/remontage des TextInput et fermerait le clavier après chaque
 * frappe. En les plaçant au niveau module, React les voit comme des types
 * stables et ne fait qu'un re-render (pas de remontage).
 *
 * Le contenu des étapes (Step 1 / 2 / 3, LoginForm, etc.) est également
 * inliné directement dans le JSX de retour plutôt qu'encapsulé dans des
 * sous-composants locaux, pour la même raison.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Keyboard,
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
type Mode         = "login" | "register";
type RegisterRole = "user" | "structure";
type PartnerStep  = 1 | 2 | 3;

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
] as const;

const SEARCH_DEBOUNCE_MS = 120;
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

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

// ─── Module-level shared styles (sans couleurs thème) ────────────
const $shared = StyleSheet.create({
  fieldGap:       { gap: 5 },
  errorRow:       { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  inputRow:       { flexDirection: "row", alignItems: "center", borderRadius: 12, paddingHorizontal: 13, paddingVertical: 13, borderWidth: 1, gap: 10 },
  pickerRow:      { justifyContent: "space-between" },
  inputBase:      { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  labelBase:      { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginLeft: 2 },
  submitBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 16 },
  submitBtnText:  { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  termsRow:       { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 2, paddingHorizontal: 2 },
  dropdownWrap:   { borderRadius: 12, borderWidth: 1, marginTop: 4, overflow: "hidden" },
  dropdownItem:   { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 13 },
});

// ─── Module-level sub-components ─────────────────────────────────
// Définis ICI, hors de AuthScreen, pour que React voie des types stables.

// ── FieldWrap ──────────────────────────────────────────────────
const FieldWrap = React.memo(function FieldWrap({
  label, error, children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  const C = useColors();
  return (
    <View style={$shared.fieldGap}>
      <Text style={[$shared.labelBase, { color: C.textMuted }]}>{label}</Text>
      {children}
      {!!error && (
        <View style={$shared.errorRow}>
          <Ionicons name="alert-circle" size={13} color={C.error} />
          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: C.error }}>{error}</Text>
        </View>
      )}
    </View>
  );
});

// ── InputBox ───────────────────────────────────────────────────
interface InputBoxProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  secure?: boolean;
  showToggle?: boolean;
  onToggle?: () => void;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "words" | "sentences";
  autoCorrect?: boolean;
  returnKeyType?: "next" | "done" | "go";
  onSubmit?: () => void;
  multiline?: boolean;
  accessLabel?: string;
}

const InputBox = React.memo(
  React.forwardRef<TextInput, InputBoxProps>(function InputBox(
    {
      value, onChange, placeholder, icon,
      secure, showToggle, onToggle,
      keyboardType = "default",
      autoCapitalize = "none",
      autoCorrect = false,
      returnKeyType, onSubmit, multiline, accessLabel,
    },
    ref,
  ) {
    const C = useColors();
    return (
      <View style={[$shared.inputRow, { backgroundColor: C.card, borderColor: C.border }]}>
        <Ionicons name={icon} size={17} color={C.textMuted} />
        <TextInput
          ref={ref as React.RefObject<TextInput>}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          style={[
            $shared.inputBase,
            { color: C.text },
            multiline ? { minHeight: 72, textAlignVertical: "top" } : null,
          ]}
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
          <TouchableOpacity onPress={onToggle} hitSlop={HIT_SLOP}>
            <Ionicons
              name={secure ? "eye-outline" : "eye-off-outline"}
              size={17}
              color={C.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  }),
);

// ── GlobalError ────────────────────────────────────────────────
const GlobalError = React.memo(function GlobalError({ error }: { error: string }) {
  const C = useColors();
  if (!error) return null;
  return (
    <View style={{
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: C.error + "1A", borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10,
      borderWidth: 1, borderColor: C.error + "30",
    }}>
      <Ionicons name="alert-circle" size={16} color={C.error} />
      <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: C.error, flex: 1 }}>{error}</Text>
    </View>
  );
});

// ── SubmitBtn ──────────────────────────────────────────────────
const SubmitBtn = React.memo(function SubmitBtn({
  label, onPress, loading, color,
}: {
  label: string;
  onPress: () => void;
  loading: boolean;
  color: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.88}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={[color, color + "CC"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[$shared.submitBtn, loading && { opacity: 0.65 }]}
      >
        {loading
          ? <ActivityIndicator color="#FFFFFF" size="small" />
          : <Text style={$shared.submitBtnText}>{label}</Text>
        }
      </LinearGradient>
    </TouchableOpacity>
  );
});

// ── TermsRow ───────────────────────────────────────────────────
const TermsRow = React.memo(function TermsRow({
  accepted, onToggle, termsError, lang, t,
}: {
  accepted: boolean;
  onToggle: () => void;
  termsError: string;
  lang: string;
  t: (k: string) => string;
}) {
  const C = useColors();
  return (
    <View>
      <TouchableOpacity
        style={$shared.termsRow}
        activeOpacity={0.7}
        onPress={onToggle}
        accessibilityLabel={lang === "fr" ? "Accepter les conditions" : "Accept terms"}
      >
        <View style={{
          width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
          borderColor: C.lavender, alignItems: "center", justifyContent: "center", marginTop: 1,
          ...(accepted ? { backgroundColor: C.lavender } : {}),
        }}>
          {accepted && <Ionicons name="checkmark" size={14} color={C.bg} />}
        </View>
        <Text style={{ flex: 1, fontSize: 13, lineHeight: 19, color: C.textMuted, fontFamily: "Inter_400Regular" }}>
          {t("acceptTermsLabel")}{" "}
          <Text
            style={{ color: C.lavender, fontFamily: "Inter_600SemiBold", textDecorationLine: "underline" }}
            onPress={e => { e.stopPropagation?.(); router.push("/legal/terms"); }}
          >
            {t("acceptTermsCgu")}
          </Text>
          {" "}{t("acceptTermsAnd")}{" "}
          <Text
            style={{ color: C.lavender, fontFamily: "Inter_600SemiBold", textDecorationLine: "underline" }}
            onPress={e => { e.stopPropagation?.(); router.push("/legal/privacy"); }}
          >
            {t("acceptTermsPrivacy")}
          </Text>.
        </Text>
      </TouchableOpacity>
      {!!termsError && (
        <View style={$shared.errorRow}>
          <Ionicons name="alert-circle" size={13} color={C.error} />
          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: C.error }}>{termsError}</Text>
        </View>
      )}
    </View>
  );
});

// ── LocationSearch — recherche inline avec suggestions ─────────
interface LocationSearchResult {
  key: string;
  emoji?: string | null;
  label: string;
  lat?: number | null;
  lng?: number | null;
}

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
    <View style={$shared.fieldGap}>
      <Text style={[$shared.labelBase, { color: C.textMuted }]}>{fieldLabel}</Text>
      <View style={[
        $shared.inputRow,
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
          style={[$shared.inputBase, { color: C.text }]}
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
        <View style={$shared.errorRow}>
          <Ionicons name="alert-circle" size={13} color={C.error} />
          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: C.error }}>{error}</Text>
        </View>
      )}
      {showDropdown && (
        <View style={[$shared.dropdownWrap, { backgroundColor: C.card, borderColor: C.border }]}>
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
                  $shared.dropdownItem,
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

// ─── Composant principal ──────────────────────────────────────────
export default function AuthScreen() {
  const t   = useT();
  const { user, setUser, setSession, lang, addNotification, configCities, configCountries } = useApp();
  const insets = useSafeAreaInsets();
  const C      = useColors();
  const S      = useMemo(() => makeStyles(C), [C]);
  const M      = useMemo(() => makeModalStyles(C), [C]);

  const params = useLocalSearchParams<{ mode?: string }>();

  // ── État principal ──────────────────────────────────────────
  const [mode,          setMode]          = useState<Mode>(() => params.mode === "register" ? "register" : "login");
  const [registerRole,  setRegisterRole]  = useState<RegisterRole>("user");
  const [partnerStep,   setPartnerStep]   = useState<PartnerStep>(1);
  const [loginType,     setLoginType]     = useState<"user" | "partner">("user");

  // Champs communs
  const [email,            setEmail]           = useState("");
  const [password,         setPassword]        = useState("");
  const [passwordConfirm,  setPasswordConfirm] = useState("");
  const [showPassword,     setShowPassword]    = useState(false);
  const [showPwdConfirm,   setShowPwdConfirm]  = useState(false);
  const [firstName,        setFirstName]       = useState("");
  const [lastName,         setLastName]        = useState("");
  const [phone,            setPhone]           = useState("");

  // Partner step 2
  const [businessName,     setBusinessName]     = useState("");
  const [businessType,     setBusinessType]     = useState("");
  const [description,      setDescription]      = useState("");
  const [businessTypeModal, setBusinessTypeModal] = useState(false);
  const [venueName,        setVenueName]        = useState("");
  const [venueAddress,     setVenueAddress]     = useState("");

  // Partner step 3 — localisation (recherche dynamique)
  const [country,        setCountry]        = useState("Togo");
  const [city,           setCity]           = useState("");
  const [latitude,       setLatitude]       = useState("");
  const [longitude,      setLongitude]      = useState("");

  const [countryQuery,   setCountryQuery]   = useState("Togo");
  const [countryLocked,  setCountryLocked]  = useState(true);
  const [countryResults, setCountryResults] = useState<LocationSearchResult[]>([]);

  const [cityQuery,      setCityQuery]      = useState("");
  const [cityLocked,     setCityLocked]     = useState(false);
  const [cityResults,    setCityResults]    = useState<LocationSearchResult[]>([]);

  const countryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cityTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mise à jour de countryQuery avec l'emoji quand configCountries se charge
  useEffect(() => {
    if (countryLocked && configCountries.length > 0) {
      const c = configCountries.find(c => c.name === country);
      if (c?.emoji) setCountryQuery(`${c.emoji} ${c.name}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configCountries.length]);

  // Recherche pays avec debounce
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

  // Recherche ville avec debounce
  useEffect(() => {
    if (cityLocked || !cityQuery.trim()) { setCityResults([]); return; }
    if (cityTimerRef.current) clearTimeout(cityTimerRef.current);
    cityTimerRef.current = setTimeout(() => {
      const q = cityQuery.toLowerCase().trim();
      const seen = new Set<string>();
      setCityResults(
        configCities
          .filter(c => {
            if (c.countryName !== country) return false;
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

  const [acceptedTerms,  setAcceptedTerms]  = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [globalError,    setGlobalError]    = useState("");
  const [fieldErrors,    setFieldErrors]    = useState<Record<string, string>>({});
  const [emailExistsHint, setEmailExistsHint] = useState(false);

  // ── Auto-dismiss quand la connexion réussit ───────────────────
  // On surveille `user` depuis le contexte. Quand il passe de null à non-null
  // PENDANT cette session (pas au montage initial), React a déjà committé
  // l'update — (tabs) a le bon état auth — on peut dismiss proprement.
  const userOnMount = useRef(user);
  useEffect(() => {
    if (user && !userOnMount.current) {
      router.dismiss();
    }
  }, [user]);

  // Refs
  const scrollRef       = useRef<ScrollView>(null);
  const firstNameRef    = useRef<TextInput>(null);
  const lastNameRef     = useRef<TextInput>(null);
  const phoneRef        = useRef<TextInput>(null);
  const emailRef        = useRef<TextInput>(null);
  const passwordRef     = useRef<TextInput>(null);
  const pwdConfirmRef   = useRef<TextInput>(null);
  const businessNameRef = useRef<TextInput>(null);
  const descriptionRef  = useRef<TextInput>(null);
  const venueNameRef    = useRef<TextInput>(null);
  const venueAddressRef = useRef<TextInput>(null);

  // ── Helpers ──────────────────────────────────────────────────
  const clearErrors = useCallback(() => {
    setGlobalError(""); setFieldErrors({}); setEmailExistsHint(false);
  }, []);

  const fe = useCallback((f: string) => fieldErrors[f] ?? "", [fieldErrors]);

  const LAVENDER = C.lavender;

  const strength      = getStrength(password);
  const strengthLabel = !password ? "" : strength === 1 ? (lang === "fr" ? "Faible" : "Weak") : strength === 2 ? (lang === "fr" ? "Moyen" : "Fair") : (lang === "fr" ? "Fort" : "Strong");
  const strengthColor = strength === 1 ? C.error : strength === 2 ? C.gold : C.success;
  const passwordsMatch    = !passwordConfirm || passwordConfirm === password;
  const isPartnerRegister = mode === "register" && registerRole === "structure";

  function switchMode(m: Mode) {
    setMode(m); setPartnerStep(1); clearErrors();
  }
  function switchRole(r: RegisterRole) {
    setRegisterRole(r); setPartnerStep(1); clearErrors();
  }

  // ── Handlers localisation ────────────────────────────────────
  const handleSelectCountry = useCallback((_key: string, label: string, item: LocationSearchResult) => {
    Keyboard.dismiss();
    const display = item.emoji ? `${item.emoji} ${label}` : label;
    setCountry(label); setCountryQuery(display); setCountryLocked(true); setCountryResults([]);
    setCity(""); setLatitude(""); setLongitude("");
    setCityQuery(""); setCityLocked(false); setCityResults([]);
    setFieldErrors(e => ({ ...e, country: "", city: "" }));
  }, []);

  const handleClearCountry = useCallback(() => {
    setCountryQuery(""); setCountryLocked(false); setCountry(""); setCountryResults([]);
    setCity(""); setCityQuery(""); setCityLocked(false); setCityResults([]);
  }, []);

  const handleSelectCity = useCallback((_key: string, label: string, item: LocationSearchResult) => {
    Keyboard.dismiss();
    setCity(label); setCityQuery(label); setCityLocked(true); setCityResults([]);
    setLatitude(item.lat != null ? String(item.lat) : "");
    setLongitude(item.lng != null ? String(item.lng) : "");
    setFieldErrors(e => ({ ...e, city: "" }));
  }, []);

  const handleClearCity = useCallback(() => {
    setCityQuery(""); setCityLocked(false); setCity(""); setLatitude(""); setLongitude(""); setCityResults([]);
  }, []);

  // ── Validation ───────────────────────────────────────────────
  function validateLogin(): boolean {
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email    = lang === "fr" ? "L'email est requis." : "Email is required.";
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
    if (!passwordConfirm)                 errs.passwordConfirm = lang === "fr" ? "Requis." : "Required.";
    else if (password !== passwordConfirm) errs.passwordConfirm = lang === "fr" ? "Les mots de passe ne correspondent pas." : "Passwords do not match.";
    if (!acceptedTerms) errs.terms = lang === "fr" ? "Vous devez accepter les CGU." : "You must accept the Terms.";
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 80);
    return Object.keys(errs).length === 0;
  }

  function validatePartnerStep(step: PartnerStep): boolean {
    const errs: Record<string, string> = {};
    if (step === 1) {
      if (!firstName.trim()) errs.firstName = lang === "fr" ? "Requis." : "Required.";
      if (!lastName.trim())  errs.lastName  = lang === "fr" ? "Requis." : "Required.";
      if (!phone.trim())     errs.phone     = lang === "fr" ? "Requis." : "Required.";
      if (!email.trim())     errs.email     = lang === "fr" ? "L'email est requis." : "Email is required.";
      if (!password)         errs.password  = lang === "fr" ? "Requis." : "Required.";
      else if (strength < 2) errs.password  = lang === "fr" ? "Mot de passe trop faible." : "Password too weak.";
      if (!passwordConfirm)  errs.passwordConfirm = lang === "fr" ? "Requis." : "Required.";
      else if (password !== passwordConfirm) errs.passwordConfirm = lang === "fr" ? "Les mots de passe ne correspondent pas." : "Passwords do not match.";
    }
    if (step === 2) {
      if (!businessName.trim()) errs.businessName = lang === "fr" ? "Requis." : "Required.";
      if (!businessType)        errs.businessType = lang === "fr" ? "Sélectionnez un type." : "Select a type.";
      if (!venueName.trim())    errs.venueName    = lang === "fr" ? "Requis." : "Required.";
    }
    if (step === 3) {
      if (!countryLocked || !country) errs.country = lang === "fr" ? "Sélectionnez un pays dans la liste." : "Select a country from the list.";
      if (!cityLocked || !city)       errs.city    = lang === "fr" ? "Sélectionnez une ville dans la liste." : "Select a city from the list.";
      if (!acceptedTerms)             errs.terms   = lang === "fr" ? "Vous devez accepter les CGU." : "You must accept the Terms.";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Handlers formulaires ─────────────────────────────────────
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
          Keyboard.dismiss();
          dismissAndReplace({ pathname: "/verify-email", params: { email: data.email || cleanEmail, role: data.role === "partner" ? "partner" : "user" } } as any);
          return;
        }
        if (data?.adminWebOnly) {
          setGlobalError(lang === "fr" ? "L'administration est accessible uniquement depuis l'interface web." : "Administration is accessible only from the web interface.");
          setLoading(false); return;
        }
        if (data?.partnerStatus === "pending") {
          setLoading(false);
          Keyboard.dismiss();
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
      setLoading(false);
      return;
    }
    setLoading(false);
    Keyboard.dismiss();
    // Navigation handled by the useEffect watching `user` above —
    // it fires after React commits the setUser() state update.
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
          email: cleanEmail, password,
          firstName: firstName.trim(), lastName: lastName.trim(),
          gender: "ND", phone: "", country: "Togo",
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
      Keyboard.dismiss();
      dismissAndReplace({ pathname: "/verify-email", params: { email: cleanEmail, role: "user" } } as any);
    } catch {
      setGlobalError(lang === "fr" ? "Erreur réseau. Vérifiez votre connexion." : "Network error. Check your connection.");
      setLoading(false);
    }
  }

  function handlePartnerNext() {
    if (!validatePartnerStep(partnerStep)) return;
    if (partnerStep < 3) {
      setPartnerStep(s => (s + 1) as PartnerStep);
      clearErrors();
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 50);
    }
  }

  function handlePartnerBack() {
    if (partnerStep > 1) { setPartnerStep(s => (s - 1) as PartnerStep); clearErrors(); }
  }

  async function handlePartnerRegister() {
    if (!validatePartnerStep(3)) return;
    setLoading(true); setGlobalError(""); setEmailExistsHint(false);
    const cleanEmail  = email.trim().toLowerCase();
    const contactName = `${firstName.trim()} ${lastName.trim()}`.trim();
    try {
      const res = await fetch(`${API_BASE}/partners/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail, contactName,
          businessName: businessName.trim(), businessType,
          phone: phone.trim(), city, country,
          password,
          description: description.trim() || null,
          venueName: venueName.trim() || null,
          venueType: businessType || null,
          venueAddress: venueAddress.trim() || null,
          venueDescription: description.trim() || null,
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
      Keyboard.dismiss();
      dismissAndReplace({ pathname: "/verify-email", params: { email: cleanEmail, role: "partner" } } as any);
    } catch {
      setGlobalError(lang === "fr" ? "Erreur réseau. Vérifiez votre connexion." : "Network error. Check your connection.");
      setLoading(false);
    }
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
        {/* Fermer */}
        <TouchableOpacity
          style={S.closeBtn}
          onPress={() => router.back()}
          accessibilityLabel={lang === "fr" ? "Fermer" : "Close"}
        >
          <Ionicons name="close" size={22} color={C.textMuted} />
        </TouchableOpacity>

        {/* Logo */}
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

        {/* Toggle Connexion / Inscription */}
        <View style={S.modeToggle} accessibilityRole="tablist">
          {(["login", "register"] as const).map(m => (
            <TouchableOpacity
              key={m}
              style={[S.modeBtn, mode === m && { backgroundColor: LAVENDER }]}
              onPress={() => switchMode(m)}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === m }}
              accessibilityLabel={m === "login" ? t("login") : t("register")}
            >
              <Text style={[S.modeBtnText, { color: mode === m ? C.bg : C.textMuted }]}>
                {m === "login" ? t("login") : t("register")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={S.form}>

          {/* ══════════════════════════════════════════════════════
              CONNEXION
          ══════════════════════════════════════════════════════ */}
          {mode === "login" && (
            <>
              {/* Type de compte — toggle compact */}
              <View style={S.compactToggle}>
                {(["user", "partner"] as const).map(type => {
                  const active = loginType === type;
                  const label  = type === "user" ? (lang === "fr" ? "Utilisateur" : "User") : (lang === "fr" ? "Partenaire" : "Partner");
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[S.compactToggleBtn, active && { backgroundColor: type === "user" ? LAVENDER : C.gold }]}
                      onPress={() => setLoginType(type)}
                      activeOpacity={0.85}
                      accessibilityLabel={label}
                    >
                      <Ionicons name={type === "user" ? "person" : "business"} size={14} color={active ? C.bg : C.textMuted} />
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
                  ref={emailRef}
                  value={email} onChange={v => { setEmail(v); clearErrors(); }}
                  placeholder="you@example.com" icon="mail-outline"
                  keyboardType="email-address" returnKeyType="next"
                  onSubmit={() => passwordRef.current?.focus()} accessLabel="Email"
                />
              </FieldWrap>

              <FieldWrap label={t("password")} error={fe("password")}>
                <InputBox
                  ref={passwordRef}
                  value={password} onChange={setPassword}
                  placeholder="••••••••" icon="lock-closed-outline"
                  secure={!showPassword} showToggle onToggle={() => setShowPassword(v => !v)}
                  returnKeyType="done" onSubmit={handleLogin} accessLabel={t("password")}
                />
                <TouchableOpacity onPress={() => router.push("/forgot-password")} style={{ alignSelf: "flex-end", marginTop: 6 }}>
                  <Text style={{ color: LAVENDER, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                    {lang === "fr" ? "Mot de passe oublié ?" : "Forgot password?"}
                  </Text>
                </TouchableOpacity>
              </FieldWrap>

              {emailExistsHint && (
                <View style={S.hintCard}>
                  <Ionicons name="information-circle-outline" size={16} color={LAVENDER} />
                  <Text style={[S.hintCardText, { color: C.textMuted }]}>
                    {lang === "fr" ? "Un compte existe avec cet email. " : "An account exists with this email. "}
                    <Text style={{ color: LAVENDER, fontFamily: "Inter_600SemiBold" }} onPress={() => { switchMode("login"); setEmailExistsHint(false); }}>
                      {lang === "fr" ? "Se connecter →" : "Sign in →"}
                    </Text>
                  </Text>
                </View>
              )}

              <GlobalError error={globalError} />
              <SubmitBtn label={t("login")} onPress={handleLogin} loading={loading} color={loginType === "partner" ? C.gold : LAVENDER} />

              <Text style={S.hint}>
                <Text style={S.hintLabel}>{t("noAccount")} </Text>
                <Text style={S.hintLink} onPress={() => switchMode("register")}>{t("register")}</Text>
              </Text>
            </>
          )}

          {/* ══════════════════════════════════════════════════════
              INSCRIPTION
          ══════════════════════════════════════════════════════ */}
          {mode === "register" && (
            <>
              {/* Sélecteur de rôle */}
              <View style={S.roleRow}>
                {(["user", "structure"] as const).map(role => {
                  const active = registerRole === role;
                  const color  = role === "user" ? LAVENDER : C.gold;
                  return (
                    <TouchableOpacity
                      key={role}
                      style={[S.roleCard, active && { borderColor: color, backgroundColor: color + "12" }]}
                      onPress={() => switchRole(role)}
                      activeOpacity={0.8}
                    >
                      <View style={[S.roleIconWrap, { backgroundColor: color + "20" }]}>
                        <Ionicons name={role === "user" ? "person" : "business"} size={20} color={color} />
                      </View>
                      <Text style={[S.roleTitle, { color: active ? color : C.text }]}>
                        {role === "user" ? (lang === "fr" ? "Utilisateur" : "User") : (lang === "fr" ? "Partenaire" : "Partner")}
                      </Text>
                      <Text style={S.roleSub}>
                        {role === "user"
                          ? (lang === "fr" ? "Découvrez des événements" : "Discover events")
                          : (lang === "fr" ? "Publiez vos événements" : "Publish your events")}
                      </Text>
                      {active && <Ionicons name="checkmark-circle" size={16} color={color} style={S.roleCheck} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── Inscription Utilisateur ── */}
              {registerRole === "user" && (
                <>
                  <FieldWrap label={lang === "fr" ? "Prénoms *" : "First name *"} error={fe("firstName")}>
                    <InputBox
                      ref={firstNameRef}
                      value={firstName} onChange={v => { setFirstName(v); setFieldErrors(e => ({ ...e, firstName: "" })); }}
                      placeholder={lang === "fr" ? "Vos prénoms" : "Your first name"}
                      icon="person-outline" autoCapitalize="words"
                      returnKeyType="next" onSubmit={() => lastNameRef.current?.focus()}
                      accessLabel={lang === "fr" ? "Prénoms" : "First name"}
                    />
                  </FieldWrap>

                  <FieldWrap label={lang === "fr" ? "Nom *" : "Last name *"} error={fe("lastName")}>
                    <InputBox
                      ref={lastNameRef}
                      value={lastName} onChange={v => { setLastName(v); setFieldErrors(e => ({ ...e, lastName: "" })); }}
                      placeholder={lang === "fr" ? "Votre nom de famille" : "Your last name"}
                      icon="person-outline" autoCapitalize="words"
                      returnKeyType="next" onSubmit={() => emailRef.current?.focus()}
                      accessLabel={lang === "fr" ? "Nom" : "Last name"}
                    />
                  </FieldWrap>

                  <FieldWrap label={t("email")} error={fe("email")}>
                    <InputBox
                      ref={emailRef}
                      value={email} onChange={v => { setEmail(v); clearErrors(); }}
                      placeholder="you@example.com" icon="mail-outline"
                      keyboardType="email-address" returnKeyType="next"
                      onSubmit={() => passwordRef.current?.focus()} accessLabel="Email"
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
                      ref={passwordRef}
                      value={password} onChange={setPassword}
                      placeholder="••••••••" icon="lock-closed-outline"
                      secure={!showPassword} showToggle onToggle={() => setShowPassword(v => !v)}
                      returnKeyType="next" onSubmit={() => pwdConfirmRef.current?.focus()}
                      accessLabel={t("password")}
                    />
                    {password.length > 0 && (
                      <View style={{ marginTop: 8, gap: 5 }}>
                        <View style={{ flexDirection: "row", gap: 4 }}>
                          {[1, 2, 3].map(i => (
                            <View key={i} style={[S.strengthSeg, { backgroundColor: strength >= i ? strengthColor : C.border }]} />
                          ))}
                        </View>
                        <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: strengthColor }}>{strengthLabel}</Text>
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
                      ref={pwdConfirmRef}
                      value={passwordConfirm} onChange={setPasswordConfirm}
                      placeholder="••••••••" icon="lock-closed-outline"
                      secure={!showPwdConfirm} showToggle onToggle={() => setShowPwdConfirm(v => !v)}
                      returnKeyType="done" onSubmit={handleUserRegister}
                      accessLabel={lang === "fr" ? "Confirmer le mot de passe" : "Confirm password"}
                    />
                    {passwordConfirm.length > 0 && !passwordsMatch && (
                      <View style={$shared.errorRow}>
                        <Ionicons name="close-circle" size={13} color={C.error} />
                        <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: C.error }}>
                          {lang === "fr" ? "Les mots de passe ne correspondent pas." : "Passwords do not match."}
                        </Text>
                      </View>
                    )}
                    {passwordConfirm.length > 0 && passwordsMatch && passwordConfirm === password && (
                      <View style={$shared.errorRow}>
                        <Ionicons name="checkmark-circle" size={13} color={C.success} />
                        <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: C.success }}>
                          {lang === "fr" ? "Identiques." : "Matching."}
                        </Text>
                      </View>
                    )}
                  </FieldWrap>

                  <TermsRow accepted={acceptedTerms} onToggle={() => setAcceptedTerms(v => !v)} termsError={fe("terms")} lang={lang} t={t} />
                  <GlobalError error={globalError} />
                  <SubmitBtn label={t("register")} onPress={handleUserRegister} loading={loading} color={LAVENDER} />

                  <Text style={S.hint}>
                    <Text style={S.hintLabel}>{t("hasAccount")} </Text>
                    <Text style={S.hintLink} onPress={() => switchMode("login")}>{t("login")}</Text>
                  </Text>
                </>
              )}

              {/* ── Inscription Partenaire (multi-étapes) ── */}
              {registerRole === "structure" && (
                <>
                  {/* Barre de progression — JSX inline (pas de sous-composant) */}
                  <View style={S.progressWrap}>
                    {[
                      lang === "fr" ? "Contact" : "Contact",
                      lang === "fr" ? "Structure & Lieu" : "Business & Venue",
                      lang === "fr" ? "Localisation" : "Location",
                    ].map((label, i) => {
                      const idx    = i + 1;
                      const done   = partnerStep > idx;
                      const active = partnerStep === idx;
                      const col    = done ? C.success : active ? C.gold : C.border;
                      const textCol = done || active ? C.text : C.textMuted;
                      return (
                        <React.Fragment key={label}>
                          <View style={{ alignItems: "center", gap: 5 }}>
                            <View style={[S.stepCircle, { borderColor: col, backgroundColor: done ? C.success : active ? C.gold + "22" : "transparent" }]}>
                              {done
                                ? <Ionicons name="checkmark" size={14} color={C.bg} />
                                : <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: col }}>{idx}</Text>
                              }
                            </View>
                            <Text style={{ fontSize: 10, fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular", color: textCol }}>{label}</Text>
                          </View>
                          {i < 2 && <View style={[S.stepLine, { backgroundColor: partnerStep > idx ? C.success : C.border }]} />}
                        </React.Fragment>
                      );
                    })}
                  </View>

                  {/* ── Étape 1 : Contact ── */}
                  {partnerStep === 1 && (
                    <>
                      <FieldWrap label={lang === "fr" ? "Prénoms du contact *" : "Contact first name *"} error={fe("firstName")}>
                        <InputBox
                          ref={firstNameRef}
                          value={firstName} onChange={v => { setFirstName(v); setFieldErrors(e => ({ ...e, firstName: "" })); }}
                          placeholder={lang === "fr" ? "Prénoms" : "First name"}
                          icon="person-outline" autoCapitalize="words"
                          returnKeyType="next" onSubmit={() => lastNameRef.current?.focus()}
                          accessLabel={lang === "fr" ? "Prénoms du contact" : "Contact first name"}
                        />
                      </FieldWrap>

                      <FieldWrap label={lang === "fr" ? "Nom du contact *" : "Contact last name *"} error={fe("lastName")}>
                        <InputBox
                          ref={lastNameRef}
                          value={lastName} onChange={v => { setLastName(v); setFieldErrors(e => ({ ...e, lastName: "" })); }}
                          placeholder={lang === "fr" ? "Nom" : "Last name"}
                          icon="person-outline" autoCapitalize="words"
                          returnKeyType="next" onSubmit={() => phoneRef.current?.focus()}
                          accessLabel={lang === "fr" ? "Nom du contact" : "Contact last name"}
                        />
                      </FieldWrap>

                      <FieldWrap label={lang === "fr" ? "Téléphone de contact *" : "Contact phone *"} error={fe("phone")}>
                        <InputBox
                          ref={phoneRef}
                          value={phone} onChange={v => { setPhone(v); setFieldErrors(e => ({ ...e, phone: "" })); }}
                          placeholder="+228 XX XX XX XX" icon="call-outline"
                          keyboardType="phone-pad" returnKeyType="next"
                          onSubmit={() => emailRef.current?.focus()}
                          accessLabel={lang === "fr" ? "Téléphone" : "Phone"}
                        />
                      </FieldWrap>

                      <FieldWrap label={lang === "fr" ? "Email *" : "Email *"} error={fe("email")}>
                        <InputBox
                          ref={emailRef}
                          value={email} onChange={v => { setEmail(v); clearErrors(); }}
                          placeholder="contact@structure.com" icon="mail-outline"
                          keyboardType="email-address" returnKeyType="next"
                          onSubmit={() => passwordRef.current?.focus()} accessLabel="Email"
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

                      <FieldWrap label={t("password")} error={fe("password")}>
                        <InputBox
                          ref={passwordRef}
                          value={password} onChange={v => { setPassword(v); setFieldErrors(e => ({ ...e, password: "" })); }}
                          placeholder="••••••••" icon="lock-closed-outline"
                          secure={!showPassword} showToggle onToggle={() => setShowPassword(v => !v)}
                          returnKeyType="next" onSubmit={() => pwdConfirmRef.current?.focus()}
                          accessLabel={t("password")}
                        />
                        {password.length > 0 && (
                          <View style={$shared.errorRow}>
                            <Ionicons name={strength >= 2 ? "checkmark-circle" : "alert-circle"} size={13} color={strengthColor} />
                            <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: strengthColor }}>{strengthLabel}</Text>
                          </View>
                        )}
                      </FieldWrap>

                      <FieldWrap label={lang === "fr" ? "Confirmer le mot de passe *" : "Confirm password *"} error={fe("passwordConfirm")}>
                        <InputBox
                          ref={pwdConfirmRef}
                          value={passwordConfirm} onChange={v => { setPasswordConfirm(v); setFieldErrors(e => ({ ...e, passwordConfirm: "" })); }}
                          placeholder="••••••••" icon="lock-closed-outline"
                          secure={!showPwdConfirm} showToggle onToggle={() => setShowPwdConfirm(v => !v)}
                          returnKeyType="done" onSubmit={handlePartnerNext}
                          accessLabel={lang === "fr" ? "Confirmer le mot de passe" : "Confirm password"}
                        />
                        {!passwordsMatch && passwordConfirm.length > 0 && (
                          <View style={$shared.errorRow}>
                            <Ionicons name="alert-circle" size={13} color={C.error} />
                            <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: C.error }}>
                              {lang === "fr" ? "Les mots de passe ne correspondent pas." : "Passwords do not match."}
                            </Text>
                          </View>
                        )}
                        {passwordConfirm.length > 0 && passwordsMatch && passwordConfirm === password && (
                          <View style={$shared.errorRow}>
                            <Ionicons name="checkmark-circle" size={13} color={C.success} />
                            <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: C.success }}>
                              {lang === "fr" ? "Identiques." : "Matching."}
                            </Text>
                          </View>
                        )}
                      </FieldWrap>
                    </>
                  )}

                  {/* ── Étape 2 : Structure & Premier lieu ── */}
                  {partnerStep === 2 && (
                    <>
                      <FieldWrap label={lang === "fr" ? "Nom de la structure *" : "Business name *"} error={fe("businessName")}>
                        <InputBox
                          ref={businessNameRef}
                          value={businessName} onChange={v => { setBusinessName(v); setFieldErrors(e => ({ ...e, businessName: "" })); }}
                          placeholder={lang === "fr" ? "Nom de votre établissement" : "Your establishment name"}
                          icon="business-outline" autoCapitalize="words"
                          returnKeyType="next" onSubmit={() => descriptionRef.current?.focus()}
                          accessLabel={lang === "fr" ? "Nom de la structure" : "Business name"}
                        />
                      </FieldWrap>

                      {/* Type d'établissement */}
                      <View style={$shared.fieldGap}>
                        <Text style={[$shared.labelBase, { color: C.textMuted }]}>
                          {lang === "fr" ? "Type d'établissement *" : "Establishment type *"}
                        </Text>
                        <TouchableOpacity
                          style={[$shared.inputRow, $shared.pickerRow, {
                            backgroundColor: C.card,
                            borderColor: fe("businessType") ? C.error : C.border,
                          }]}
                          onPress={() => setBusinessTypeModal(true)}
                          activeOpacity={0.8}
                          accessibilityLabel={lang === "fr" ? "Type d'établissement" : "Establishment type"}
                        >
                          <Ionicons name="grid-outline" size={17} color={C.textMuted} />
                          <Text style={[$shared.inputBase, { color: businessType ? C.text : C.textMuted }]}>
                            {businessType
                              ? (BUSINESS_TYPES.find(b => b.key === businessType)?.[lang === "fr" ? "labelFr" : "labelEn"] ?? businessType)
                              : (lang === "fr" ? "Sélectionner…" : "Select…")}
                          </Text>
                          <Ionicons name="chevron-down" size={15} color={C.textMuted} />
                        </TouchableOpacity>
                        {!!fe("businessType") && (
                          <View style={$shared.errorRow}>
                            <Ionicons name="alert-circle" size={13} color={C.error} />
                            <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: C.error }}>{fe("businessType")}</Text>
                          </View>
                        )}
                      </View>

                      <FieldWrap label={lang === "fr" ? "Description de l'activité" : "Activity description"}>
                        <InputBox
                          ref={descriptionRef}
                          value={description} onChange={setDescription}
                          placeholder={lang === "fr" ? "Décrivez votre établissement…" : "Describe your establishment…"}
                          icon="document-text-outline" multiline autoCapitalize="sentences" autoCorrect
                          accessLabel={lang === "fr" ? "Description" : "Description"}
                        />
                      </FieldWrap>

                      {/* Séparateur Premier lieu */}
                      <View style={S.sectionDivider}>
                        <View style={S.sectionDividerLine} />
                        <Text style={S.sectionDividerLabel}>{lang === "fr" ? "Premier lieu" : "First venue"}</Text>
                        <View style={S.sectionDividerLine} />
                      </View>

                      <FieldWrap label={lang === "fr" ? "Nom du lieu *" : "Venue name *"} error={fe("venueName")}>
                        <InputBox
                          ref={venueNameRef}
                          value={venueName} onChange={v => { setVenueName(v); setFieldErrors(e => ({ ...e, venueName: "" })); }}
                          placeholder={lang === "fr" ? "Ex : Club X, Bar Y…" : "e.g. Club X, Bar Y…"}
                          icon="location-outline" autoCapitalize="words"
                          returnKeyType="next" onSubmit={() => venueAddressRef.current?.focus()}
                          accessLabel={lang === "fr" ? "Nom du lieu" : "Venue name"}
                        />
                      </FieldWrap>

                      <FieldWrap label={lang === "fr" ? "Adresse du lieu" : "Venue address"}>
                        <InputBox
                          ref={venueAddressRef}
                          value={venueAddress} onChange={setVenueAddress}
                          placeholder={lang === "fr" ? "Adresse complète (optionnelle)" : "Full address (optional)"}
                          icon="map-outline" autoCapitalize="sentences"
                          accessLabel={lang === "fr" ? "Adresse du lieu" : "Venue address"}
                        />
                      </FieldWrap>

                    </>
                  )}

                  {/* ── Étape 3 : Localisation (recherche dynamique) ── */}
                  {partnerStep === 3 && (
                    <>
                      <LocationSearch
                        fieldLabel={lang === "fr" ? "Pays *" : "Country *"}
                        placeholder={lang === "fr" ? "Rechercher un pays…" : "Search a country…"}
                        query={countryQuery}
                        locked={countryLocked}
                        results={countryResults}
                        onChangeQuery={text => {
                          setCountryQuery(text);
                          setCountryLocked(false);
                          setCountry("");
                          setCity(""); setCityQuery(""); setCityLocked(false);
                          setFieldErrors(e => ({ ...e, country: "" }));
                        }}
                        onSelect={handleSelectCountry}
                        onClear={handleClearCountry}
                        error={fe("country")}
                        emptyLabel={lang === "fr" ? "Aucun pays trouvé" : "No country found"}
                      />

                      <LocationSearch
                        fieldLabel={lang === "fr" ? `Ville (${country || "…"}) *` : `City (${country || "…"}) *`}
                        placeholder={lang === "fr" ? "Rechercher une ville…" : "Search a city…"}
                        query={cityQuery}
                        locked={cityLocked}
                        results={cityResults}
                        onChangeQuery={text => {
                          setCityQuery(text);
                          setCityLocked(false);
                          setCity("");
                          setFieldErrors(e => ({ ...e, city: "" }));
                        }}
                        onSelect={handleSelectCity}
                        onClear={handleClearCity}
                        error={fe("city")}
                        emptyLabel={
                          !countryLocked
                            ? (lang === "fr" ? "Sélectionnez d'abord un pays" : "Select a country first")
                            : (lang === "fr" ? "Aucune ville trouvée" : "No city found")
                        }
                        disabled={!countryLocked}
                      />

                      <View style={S.infoCard}>
                        <Ionicons name="information-circle-outline" size={15} color={C.success} />
                        <Text style={S.infoCardText}>
                          {lang === "fr"
                            ? "Vous définirez la position GPS exacte de votre lieu après votre première connexion."
                            : "You will set the exact GPS location of your venue after your first login."}
                        </Text>
                      </View>

                      <TermsRow accepted={acceptedTerms} onToggle={() => setAcceptedTerms(v => !v)} termsError={fe("terms")} lang={lang} t={t} />
                      <GlobalError error={globalError} />
                    </>
                  )}

                  {/* Boutons navigation étapes — inline */}
                  <View style={S.partnerNav}>
                    {partnerStep > 1 && (
                      <TouchableOpacity
                        style={S.prevBtn}
                        onPress={handlePartnerBack}
                        activeOpacity={0.8}
                        accessibilityLabel={lang === "fr" ? "Précédent" : "Previous"}
                      >
                        <Ionicons name="chevron-back" size={16} color={C.textMuted} />
                        <Text style={[S.prevBtnText, { color: C.textMuted }]}>{lang === "fr" ? "Précédent" : "Previous"}</Text>
                      </TouchableOpacity>
                    )}
                    <View style={{ flex: 1 }}>
                      {partnerStep === 3
                        ? (
                          <SubmitBtn
                            label={lang === "fr" ? "Envoyer la demande" : "Submit request"}
                            onPress={handlePartnerRegister}
                            loading={loading}
                            color={C.gold}
                          />
                        )
                        : (
                          <TouchableOpacity
                            onPress={handlePartnerNext}
                            activeOpacity={0.88}
                            accessibilityLabel={lang === "fr" ? "Suivant" : "Next"}
                          >
                            <LinearGradient colors={[C.gold, C.gold + "CC"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={$shared.submitBtn}>
                              <Text style={$shared.submitBtnText}>{lang === "fr" ? "Suivant" : "Next"}</Text>
                              <Ionicons name="chevron-forward" size={16} color={C.bg} />
                            </LinearGradient>
                          </TouchableOpacity>
                        )
                      }
                    </View>
                  </View>
                </>
              )}
            </>
          )}

        </View>
      </ScrollView>

      {/* ── Modal type d'activité (liste fixe — conservée telle quelle) ── */}
      <Modal
        visible={businessTypeModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setBusinessTypeModal(false)}
      >
        <View style={[M.root, { paddingTop: insets.top + 16 }]}>
          <View style={M.header}>
            <Text style={M.title}>{lang === "fr" ? "Type d'activité" : "Business type"}</Text>
            <TouchableOpacity
              onPress={() => setBusinessTypeModal(false)}
              style={M.closeBtn}
              accessibilityLabel={lang === "fr" ? "Fermer" : "Close"}
              accessibilityRole="button"
            >
              <Ionicons name="close" size={22} color={C.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20, paddingHorizontal: 16, paddingTop: 8 }}
          >
            {BUSINESS_TYPES.map(bt => {
              const sel   = businessType === bt.key;
              const label = lang === "fr" ? bt.labelFr : bt.labelEn;
              return (
                <TouchableOpacity
                  key={bt.key}
                  style={[M.item, sel && { backgroundColor: C.gold + "12" }]}
                  onPress={() => { setBusinessType(bt.key); setFieldErrors(e => ({ ...e, businessType: "" })); setBusinessTypeModal(false); }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: sel }}
                >
                  <Text style={[M.cityName, { flex: 1 }, sel && { color: C.gold }]}>{label}</Text>
                  {sel && <Ionicons name="checkmark-circle" size={20} color={C.gold} />}
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

  modeToggle:  { flexDirection: "row", backgroundColor: C.card, borderRadius: 13, borderWidth: 1, borderColor: C.border, padding: 4, gap: 4 },
  modeBtn:     { flex: 1, paddingVertical: 11, borderRadius: 9, alignItems: "center" },
  modeBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  form: { gap: 14 },

  compactToggle:     { flexDirection: "row", borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, overflow: "hidden" },
  compactToggleBtn:  { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 11 },
  compactToggleText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  compactToggleHint: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: -6 },

  roleRow:      { flexDirection: "row", gap: 10 },
  roleCard:     { flex: 1, backgroundColor: C.card, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, padding: 12, gap: 5, position: "relative" },
  roleIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  roleTitle:    { fontSize: 12, fontFamily: "Inter_700Bold", color: C.text },
  roleSub:      { fontSize: 10, fontFamily: "Inter_400Regular", color: C.textMuted, lineHeight: 14 },
  roleCheck:    { position: "absolute", top: 8, right: 8 },

  strengthSeg: { flex: 1, height: 4, borderRadius: 2 },

  progressWrap: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  stepCircle:   { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  stepLine:     { flex: 1, height: 2, marginHorizontal: 4, marginBottom: 18 },

  hintCard:     { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: C.lavender + "12", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: C.lavender + "30", marginTop: 6 },
  hintCardText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 19 },

  infoCard:     { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: C.gold + "12", borderWidth: 1, borderColor: C.gold + "40", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 },
  infoCardText: { flex: 1, color: C.text, fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },

  partnerNav:  { flexDirection: "row", alignItems: "center", gap: 10 },
  prevBtn:     { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 16, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  prevBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  hint:      { textAlign: "center", fontSize: 13, fontFamily: "Inter_400Regular" },
  hintLabel: { color: C.textMuted },
  hintLink:  { color: C.lavender, fontFamily: "Inter_600SemiBold" },

  sectionDivider:      { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 },
  sectionDividerLine:  { flex: 1, height: 1, backgroundColor: C.border },
  sectionDividerLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8 },
});

const makeModalStyles = (C: ColorPalette) => StyleSheet.create({
  root:     { flex: 1, backgroundColor: C.bg },
  header:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 4 },
  title:    { fontSize: 17, fontFamily: "Inter_700Bold", color: C.text },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.card, alignItems: "center", justifyContent: "center" },
  item:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 },
  emoji:    { fontSize: 20 },
  cityName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.text },
});
