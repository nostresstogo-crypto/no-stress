import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  Platform,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from "react-native";
import { useColors } from "@/context/AppContext";

export interface OTPInputProps {
  length?: number;
  value?: string;
  onChange?: (code: string) => void;
  onComplete?: (code: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  hasError?: boolean;
  testID?: string;
}

const onlyDigits = (s: string) => s.replace(/\D+/g, "");

export function OTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  autoFocus = true,
  disabled = false,
  hasError = false,
  testID,
}: OTPInputProps) {
  const C = useColors();
  const inputs = useRef<Array<TextInput | null>>([]);
  const [internal, setInternal] = useState<string[]>(() =>
    Array.from({ length }, (_, i) => (value && value[i]) || "")
  );
  const [focused, setFocused] = useState<number | null>(null);

  useEffect(() => {
    if (value === undefined) return;
    const digits = onlyDigits(value).slice(0, length).split("");
    setInternal(Array.from({ length }, (_, i) => digits[i] || ""));
  }, [value, length]);

  const emit = useCallback(
    (next: string[]) => {
      const joined = next.join("");
      onChange?.(joined);
      if (joined.length === length && next.every((c) => c !== "")) {
        onComplete?.(joined);
      }
    },
    [length, onChange, onComplete]
  );

  const focusAt = useCallback((i: number) => {
    const target = inputs.current[Math.max(0, Math.min(length - 1, i))];
    target?.focus();
  }, [length]);

  const handleChange = useCallback(
    (index: number, raw: string) => {
      if (disabled) return;
      const digits = onlyDigits(raw);

      if (digits.length === 0) {
        setInternal((prev) => {
          const next = [...prev];
          next[index] = "";
          emit(next);
          return next;
        });
        return;
      }

      if (digits.length === 1) {
        setInternal((prev) => {
          const next = [...prev];
          next[index] = digits;
          emit(next);
          return next;
        });
        if (index < length - 1) focusAt(index + 1);
        else inputs.current[index]?.blur();
        return;
      }

      setInternal((prev) => {
        const next = [...prev];
        let cursor = index;
        for (const d of digits) {
          if (cursor >= length) break;
          next[cursor] = d;
          cursor++;
        }
        emit(next);
        return next;
      });
      const nextIndex = Math.min(length - 1, index + digits.length);
      if (index + digits.length >= length) inputs.current[length - 1]?.blur();
      else focusAt(nextIndex);
    },
    [disabled, emit, focusAt, length]
  );

  const handleKeyPress = useCallback(
    (index: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (disabled) return;
      if (e.nativeEvent.key !== "Backspace") return;
      setInternal((prev) => {
        if (prev[index]) {
          const next = [...prev];
          next[index] = "";
          emit(next);
          return next;
        }
        if (index > 0) {
          const next = [...prev];
          next[index - 1] = "";
          emit(next);
          focusAt(index - 1);
          return next;
        }
        return prev;
      });
    },
    [disabled, emit, focusAt]
  );

  const borderColor = (i: number) => {
    if (hasError) return "#E5484D";
    if (focused === i) return C.lavender;
    if (internal[i]) return C.lavender + "88";
    return C.border;
  };

  return (
    <View style={styles.row} testID={testID}>
      {Array.from({ length }, (_, i) => (
        <TextInput
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          value={internal[i] || ""}
          onChangeText={(txt) => handleChange(i, txt)}
          onKeyPress={(e) => handleKeyPress(i, e)}
          onFocus={() => setFocused(i)}
          onBlur={() => setFocused(null)}
          autoFocus={autoFocus && i === 0}
          editable={!disabled}
          keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
          inputMode="numeric"
          textContentType={i === 0 ? "oneTimeCode" : "none"}
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={i === 0 ? 6 : 1}
          selectTextOnFocus
          accessibilityLabel={`OTP digit ${i + 1}`}
          style={[
            styles.box,
            {
              backgroundColor: (C as any).surface ?? C.card,
              borderColor: borderColor(i),
              color: C.text,
            },
            disabled && { opacity: 0.5 },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    width: "100%",
  },
  box: {
    width: 46,
    height: 56,
    borderWidth: 2,
    borderRadius: 12,
    textAlign: "center",
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
});

export default OTPInput;
