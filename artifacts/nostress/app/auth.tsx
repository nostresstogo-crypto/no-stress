import React, { useState } from "react";
import {
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

import { C } from "@/constants/colors";
import { useT, useApp, useColors } from "@/context/AppContext";

type Mode = "login" | "register";
type RegisterRole = "user" | "structure";

export default function AuthScreen() {
  const t = useT();
  const { setUser, setToken } = useApp();
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

  const handleSubmit = async () => {
    if (!email || !password) {
      setError(t("error"));
      return;
    }
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    const role = mode === "register"
      ? registerRole
      : email.includes("admin") ? "admin" as const
      : email.includes("partner") || email.includes("structure") || email.includes("partenaire") ? "structure" as const
      : "user" as const;
    const mockUser = {
      id: "u_" + Date.now(),
      email,
      name: name || email.split("@")[0],
      phone,
      role,
      favorites: [],
    };
    await setUser(mockUser);
    await setToken("mock_token_" + Date.now());
    setLoading(false);
    router.back();
  };

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
        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={C.textMuted} />
        </TouchableOpacity>

        {/* Logo / header */}
        <View style={styles.logoArea}>
          <View style={styles.logo}>
            <Text style={styles.logoLetter}>N</Text>
          </View>
          <Text style={styles.appName}>NoStress</Text>
          <Text style={styles.tagline}>
            {mode === "login" ? t("loginTitle") : t("registerTitle")}
          </Text>
        </View>

        {/* Mode toggle */}
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

        {/* Form */}
        <View style={styles.form}>
          {mode === "register" && (
            <>
              {/* Account type selector */}
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
    </KeyboardAvoidingView>
  );
}

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
