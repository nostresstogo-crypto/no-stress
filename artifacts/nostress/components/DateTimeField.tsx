import React from "react";
import { Platform, StyleSheet, TextInput, TextStyle, StyleProp, View } from "react-native";

type CommonProps = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  style?: StyleProp<TextStyle>;
  placeholderTextColor?: string;
  hasError?: boolean;
  errorBorderColor?: string;
  textColor?: string;
  min?: string;
  max?: string;
};

// Resolves registered StyleSheet IDs + arrays + inline objects into a single
// flat style object, then maps to plain CSS for the web <input>.
function styleToCss(style: StyleProp<TextStyle>): React.CSSProperties {
  const flat = (StyleSheet.flatten(style) || {}) as Record<string, any>;
  const out: any = {};
  const numericKeepAsIs = new Set([
    "opacity", "flex", "flexGrow", "flexShrink", "zIndex",
    "fontWeight", "lineHeight",
  ]);
  for (const [k, v] of Object.entries(flat)) {
    if (v == null) continue;
    if (typeof v === "number" && !numericKeepAsIs.has(k)) {
      out[k] = `${v}px`;
    } else {
      out[k] = v;
    }
  }
  return out;
}

function normalizeDate(v: string): string {
  if (!v) return "";
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(v.trim());
  if (!m) return "";
  const yyyy = m[1];
  const mm = m[2].padStart(2, "0");
  const dd = m[3].padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeTime(v: string): string {
  if (!v) return "";
  const m = /^(\d{1,2}):(\d{1,2})/.exec(v.trim());
  if (!m) return "";
  const hh = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  if (+hh > 23 || +mm > 59) return "";
  return `${hh}:${mm}`;
}

function maskDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function maskTime(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/**
 * Cross-platform date input.
 * - Web: native <input type="date"> for the OS date picker.
 * - Native: masked TextInput (auto-inserts dashes), keypad keyboard.
 */
export function DateField(props: CommonProps) {
  const {
    value, onChange, placeholder, style, placeholderTextColor,
    hasError, errorBorderColor, textColor, min, max,
  } = props;

  if (Platform.OS === "web") {
    const css = styleToCss(style);
    if (hasError && errorBorderColor) css.borderColor = errorBorderColor;
    if (textColor) css.color = textColor;
    return (
      <View>
        {/* @ts-ignore react-native-web accepts raw DOM */}
        <input
          type="date"
          value={normalizeDate(value)}
          onChange={(e: any) => onChange(e.target.value || "")}
          min={min}
          max={max}
          style={{
            boxSizing: "border-box",
            outline: "none",
            fontFamily: "inherit",
            ...css,
          }}
        />
      </View>
    );
  }

  return (
    <TextInput
      style={style}
      placeholder={placeholder || "AAAA-MM-JJ"}
      placeholderTextColor={placeholderTextColor}
      value={value}
      onChangeText={(v) => onChange(maskDate(v))}
      keyboardType="number-pad"
      maxLength={10}
    />
  );
}

/**
 * Cross-platform time input (24h format).
 * - Web: native <input type="time"> (browser picker).
 * - Native: masked TextInput (auto-inserts colon), keypad keyboard.
 */
export function TimeField(props: Omit<CommonProps, "min" | "max">) {
  const {
    value, onChange, placeholder, style, placeholderTextColor,
    hasError, errorBorderColor, textColor,
  } = props;

  if (Platform.OS === "web") {
    const css = styleToCss(style);
    if (hasError && errorBorderColor) css.borderColor = errorBorderColor;
    if (textColor) css.color = textColor;
    return (
      <View>
        {/* @ts-ignore react-native-web accepts raw DOM */}
        <input
          type="time"
          value={normalizeTime(value)}
          onChange={(e: any) => onChange(e.target.value || "")}
          style={{
            boxSizing: "border-box",
            outline: "none",
            fontFamily: "inherit",
            ...css,
          }}
        />
      </View>
    );
  }

  return (
    <TextInput
      style={style}
      placeholder={placeholder || "HH:MM"}
      placeholderTextColor={placeholderTextColor}
      value={value}
      onChangeText={(v) => onChange(maskTime(v))}
      keyboardType="number-pad"
      maxLength={5}
    />
  );
}

export function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
