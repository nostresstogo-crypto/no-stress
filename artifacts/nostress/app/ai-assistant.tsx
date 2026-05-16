import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useApp, useColors } from "@/context/AppContext";
import { API_BASE } from "@/lib/apiBase";
import { ColorPalette } from "@/constants/colors";
import { fetch } from "expo/fetch";
import * as Speech from "expo-speech";

// Graceful degradation: expo-speech-recognition requires a native dev build.
// In Expo Go it will not be available — the mic button will show an informative alert.
let _SpeechModule: any = null;
let _useSpeechRecognitionEvent: (event: any, handler: (e: any) => void) => void =
  (_event, _handler) => {
    /* no-op fallback used in Expo Go */
  };

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sr = require("expo-speech-recognition");
  _SpeechModule = sr.ExpoSpeechRecognitionModule ?? null;
  if (sr.useSpeechRecognitionEvent) {
    _useSpeechRecognitionEvent = sr.useSpeechRecognitionEvent;
  }
} catch {
  // Not available in Expo Go — graceful degradation applies
}

const speechRecognitionAvailable = !!_SpeechModule;

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
};

const QUICK_QUESTIONS = [
  "Quel est l'utilité de NoStress ?",
  "Quels événements sont près de moi ?",
  "Quels lieux me recommandes-tu ?",
  "Comment créer un événement ?",
  "Comment rendre visible mon Local (Bars, Restaurants, Boite de nuit, etc...) sur NoStress ?",
];

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: C.border,
      backgroundColor: C.bg,
    },
    headerBack: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
    },
    headerTitleWrap: { flex: 1 },
    headerTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: C.text,
    },
    headerSub: {
      fontSize: 12,
      color: C.gold,
      marginTop: 1,
    },
    aiDot: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: C.gold + "20",
      alignItems: "center",
      justifyContent: "center",
    },
    list: { flex: 1 },
    listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    emptyWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      paddingTop: 40,
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: C.gold + "18",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: C.text,
      textAlign: "center",
      marginBottom: 8,
    },
    emptySub: {
      fontSize: 14,
      color: C.textMuted,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 28,
    },
    quickWrap: { gap: 8, width: "100%" },
    quickBtn: {
      backgroundColor: C.card,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: C.border,
    },
    quickText: { flex: 1, fontSize: 14, color: C.text },
    quickArrow: { marginLeft: 8 },
    bubbleRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      marginBottom: 8,
    },
    bubbleRowUser: { justifyContent: "flex-end" },
    bubbleRowAssistant: { justifyContent: "flex-start" },
    bubble: {
      maxWidth: "78%",
      borderRadius: 18,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    bubbleUser: {
      backgroundColor: C.gold,
      borderBottomRightRadius: 4,
    },
    bubbleAssistant: {
      backgroundColor: C.card,
      borderBottomLeftRadius: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: C.border,
    },
    bubbleTextUser: { fontSize: 15, color: C.isDark ? "#1A1830" : "#fff", lineHeight: 22 },
    bubbleTextAssistant: { fontSize: 15, color: C.text, lineHeight: 22 },
    loadingDots: { flexDirection: "row", gap: 4, paddingVertical: 4 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.textMuted },
    speakerBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: C.card,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 6,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: C.border,
    },
    inputBar: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: C.border,
      backgroundColor: C.bg,
      gap: 8,
    },
    input: {
      flex: 1,
      backgroundColor: C.card,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === "ios" ? 10 : 8,
      fontSize: 15,
      color: C.text,
      maxHeight: 120,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: C.border,
    },
    micBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: C.card,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: C.border,
    },
    micBtnActive: {
      backgroundColor: "#FF4444",
      borderColor: "#FF4444",
    },
    sendBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: C.gold,
      alignItems: "center",
      justifyContent: "center",
    },
    sendBtnDisabled: { backgroundColor: C.border },
    recordingIndicator: {
      flex: 1,
      backgroundColor: C.card,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === "ios" ? 10 : 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "#FF444440",
    },
    recordingText: {
      fontSize: 14,
      color: "#FF4444",
      fontWeight: "500",
    },
  });
}

export default function AIAssistantScreen() {
  const C = useColors();
  const styles = makeStyles(C);
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

  const userCity = user?.city ?? null;

  useEffect(() => {
    if (isRecording) {
      pulseRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      pulseRef.current.start();
    } else {
      pulseRef.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  useEffect(() => {
    return () => {
      Speech.stop();
      if (isRecording && speechRecognitionAvailable) {
        _SpeechModule?.stop();
      }
    };
  }, []);

  // Speech recognition event listeners (no-op in Expo Go via fallback)
  _useSpeechRecognitionEvent("result", (event: any) => {
    const transcript = event?.results?.[0]?.transcript ?? "";
    if (transcript) {
      setIsRecording(false);
      sendMessage(transcript);
    }
  });

  _useSpeechRecognitionEvent("error", () => {
    setIsRecording(false);
  });

  _useSpeechRecognitionEvent("end", () => {
    setIsRecording(false);
  });

  const toggleRecording = useCallback(async () => {
    if (isStreaming) return;

    if (!speechRecognitionAvailable) {
      Alert.alert(
        "Reconnaissance vocale",
        "La saisie vocale est disponible dans la version installée de l'application NoStress.",
        [{ text: "OK" }]
      );
      return;
    }

    if (isRecording) {
      _SpeechModule.stop();
      setIsRecording(false);
      return;
    }

    await Speech.stop();
    setSpeakingId(null);

    try {
      const result = await _SpeechModule.requestPermissionsAsync();
      if (!result.granted) {
        Alert.alert(
          "Permission refusée",
          "Autorisez l'accès au microphone dans les réglages pour utiliser la saisie vocale.",
          [{ text: "OK" }]
        );
        return;
      }
      setIsRecording(true);
      _SpeechModule.start({ lang: "fr-FR", interimResults: false, maxAlternatives: 1 });
    } catch {
      setIsRecording(false);
    }
  }, [isRecording, isStreaming]);

  const toggleSpeak = useCallback(
    async (msg: Message) => {
      if (speakingId === msg.id) {
        await Speech.stop();
        setSpeakingId(null);
        return;
      }
      await Speech.stop();
      setSpeakingId(msg.id);
      const cleanText = msg.content.replace(/[\u{1F600}-\u{1F64F}]/gu, "").trim();
      Speech.speak(cleanText, {
        language: "fr-FR",
        rate: 0.95,
        onDone: () => setSpeakingId(null),
        onError: () => setSpeakingId(null),
        onStopped: () => setSpeakingId(null),
      });
    },
    [speakingId]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      await Speech.stop();
      setSpeakingId(null);

      const userMsg: Message = { id: Date.now().toString(), role: "user", content: trimmed };
      const loadingId = (Date.now() + 1).toString();
      const loadingMsg: Message = { id: loadingId, role: "assistant", content: "", loading: true };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setInput("");
      setIsStreaming(true);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      abortRef.current = new AbortController();

      try {
        const response = await fetch(`${API_BASE}/openai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, history, city: userCity }),
          signal: abortRef.current.signal,
        });

        if (!response.ok || !response.body) throw new Error("Réponse invalide");

        let assistantText = "";
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                assistantText += data.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === loadingId ? { ...m, content: assistantText, loading: false } : m
                  )
                );
                flatListRef.current?.scrollToEnd({ animated: false });
              }
              if (data.done) break;
            } catch {
              /* skip malformed */
            }
          }
        }

        if (!assistantText) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === loadingId
                ? { ...m, content: "Désolé, je n'ai pas pu répondre.", loading: false }
                : m
            )
          );
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? { ...m, content: "Une erreur est survenue. Réessaie dans un moment.", loading: false }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, isStreaming, userCity]
  );

  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      const isUser = item.role === "user";
      return (
        <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant]}>
          <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
            {item.loading ? (
              <View style={styles.loadingDots}>
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={styles.dot} />
              </View>
            ) : (
              <Text style={isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant}>
                {item.content}
              </Text>
            )}
          </View>
          {!isUser && !item.loading && (
            <TouchableOpacity
              style={styles.speakerBtn}
              onPress={() => toggleSpeak(item)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={speakingId === item.id ? "stop" : "volume-medium"}
                size={14}
                color={speakingId === item.id ? "#FF4444" : C.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      );
    },
    [styles, speakingId, toggleSpeak, C.textMuted]
  );

  const isEmpty = messages.length === 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Assistant NoStress</Text>
          <Text style={styles.headerSub}>Propulsé par IA</Text>
        </View>
        <View style={styles.aiDot}>
          <Ionicons name="sparkles" size={18} color={C.gold} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {isEmpty ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Ionicons name="chatbubble-ellipses" size={34} color={C.gold} />
            </View>
            <Text style={styles.emptyTitle}>Comment puis-je t'aider ?</Text>
            <Text style={styles.emptySub}>
              Pose ta question par écrit ou appuie sur le micro pour parler directement.
            </Text>
            <View style={styles.quickWrap}>
              {QUICK_QUESTIONS.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={styles.quickBtn}
                  onPress={() => sendMessage(q)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.quickText}>{q}</Text>
                  <Ionicons name="arrow-forward" size={16} color={C.textMuted} style={styles.quickArrow} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            style={styles.list}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          {isRecording ? (
            <>
              <View style={styles.recordingIndicator}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <Ionicons name="mic" size={16} color="#FF4444" />
                </Animated.View>
                <Text style={styles.recordingText}>J'écoute…</Text>
              </View>
              <TouchableOpacity
                style={[styles.micBtn, styles.micBtnActive]}
                onPress={toggleRecording}
                activeOpacity={0.8}
              >
                <Ionicons name="stop" size={18} color="#fff" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Pose ta question…"
                placeholderTextColor={C.textMuted}
                multiline
                returnKeyType="send"
                onSubmitEditing={() => sendMessage(input)}
                editable={!isStreaming}
              />
              <TouchableOpacity
                style={[styles.micBtn, isStreaming && styles.sendBtnDisabled]}
                onPress={toggleRecording}
                disabled={isStreaming}
                activeOpacity={0.8}
              >
                <Ionicons name="mic" size={20} color={isStreaming ? C.textMuted : C.gold} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, (!input.trim() || isStreaming) && styles.sendBtnDisabled]}
                onPress={() => sendMessage(input)}
                disabled={!input.trim() || isStreaming}
                activeOpacity={0.8}
              >
                {isStreaming ? (
                  <ActivityIndicator size="small" color={C.isDark ? "#1A1830" : "#fff"} />
                ) : (
                  <Ionicons name="send" size={18} color={C.isDark ? "#1A1830" : "#fff"} />
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
