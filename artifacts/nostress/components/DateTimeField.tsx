import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  StyleProp,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { C } from "@/constants/colors";

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
  lang?: "fr" | "en";
};

// ---- helpers ----------------------------------------------------------------

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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function normalizeDate(v: string): string {
  if (!v) return "";
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(v.trim());
  if (!m) return "";
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12) return "";
  const dim = daysInMonth(y, mo);
  if (d < 1 || d > dim) return "";
  return `${m[1]}-${pad2(mo)}-${pad2(d)}`;
}

const TEXT_STYLE_KEYS = new Set([
  "fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing",
  "lineHeight", "textAlign", "textTransform", "textDecorationLine",
]);

function splitStyle(style: StyleProp<TextStyle>): { container: any; text: any } {
  const flat = (StyleSheet.flatten(style) || {}) as Record<string, any>;
  const container: any = {};
  const text: any = {};
  for (const [k, v] of Object.entries(flat)) {
    if (v == null) continue;
    if (TEXT_STYLE_KEYS.has(k)) text[k] = v;
    else container[k] = v;
  }
  // color stays in text (not container)
  if (flat.color != null) text.color = flat.color;
  return { container, text };
}

function normalizeTime(v: string): string {
  if (!v) return "";
  const m = /^(\d{1,2}):(\d{1,2})/.exec(v.trim());
  if (!m) return "";
  const hh = +m[1], mm = +m[2];
  if (hh > 23 || mm > 59) return "";
  return `${pad2(hh)}:${pad2(mm)}`;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function daysInMonth(y: number, m1to12: number): number {
  return new Date(y, m1to12, 0).getDate();
}

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ---- wheel ------------------------------------------------------------------

const ITEM_HEIGHT = 40;
const VISIBLE = 5; // odd number, selected row in center

type WheelProps = {
  items: string[];
  selectedIndex: number;
  onChange: (idx: number) => void;
  width?: number;
};

function Wheel({ items, selectedIndex, onChange, width = 80 }: WheelProps) {
  const ref = useRef<FlatList<string>>(null);
  const lastReportedRef = useRef(selectedIndex);

  useEffect(() => {
    // Programmatically scroll when externally controlled value changes.
    if (selectedIndex !== lastReportedRef.current) {
      lastReportedRef.current = selectedIndex;
      try {
        ref.current?.scrollToOffset({ offset: selectedIndex * ITEM_HEIGHT, animated: false });
      } catch {}
    }
  }, [selectedIndex]);

  return (
    <View style={[wheelStyles.container, { width, height: ITEM_HEIGHT * VISIBLE }]}>
      <View pointerEvents="none" style={[wheelStyles.highlight, { top: ITEM_HEIGHT * Math.floor(VISIBLE / 2) }]} />
      <FlatList
        ref={ref}
        data={items}
        keyExtractor={(_, i) => String(i)}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        getItemLayout={(_, i) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * i, index: i })}
        initialScrollIndex={Math.max(0, Math.min(selectedIndex, items.length - 1))}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE / 2) }}
        onMomentumScrollEnd={(e) => {
          const offset = e.nativeEvent.contentOffset.y;
          const idx = Math.round(offset / ITEM_HEIGHT);
          const clamped = Math.max(0, Math.min(idx, items.length - 1));
          if (clamped !== lastReportedRef.current) {
            lastReportedRef.current = clamped;
            onChange(clamped);
          }
        }}
        renderItem={({ item, index }) => {
          const isSelected = index === selectedIndex;
          return (
            <View style={{ height: ITEM_HEIGHT, justifyContent: "center", alignItems: "center" }}>
              <Text style={{
                fontSize: isSelected ? 18 : 15,
                fontWeight: isSelected ? "700" : "400",
                color: isSelected ? C.text : C.textMuted,
              }}>
                {item}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const wheelStyles = StyleSheet.create({
  container: { overflow: "hidden", position: "relative" },
  highlight: {
    position: "absolute",
    left: 0, right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.border,
    backgroundColor: "rgba(124,106,247,0.08)",
  },
});

// ---- DateField --------------------------------------------------------------

export function DateField(props: CommonProps) {
  const {
    value, onChange, placeholder, style, placeholderTextColor,
    hasError, errorBorderColor, textColor, min, max, lang = "fr",
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

  // Native: button that opens a modal with 3 wheels (year/month/day).
  const [open, setOpen] = useState(false);
  const today = new Date();
  const minDate = min ? parseISO(min) : null;
  const maxDate = max ? parseISO(max) : null;

  const initial = useMemo(() => {
    const n = normalizeDate(value);
    if (n) {
      const [y, m, d] = n.split("-").map(Number);
      return { y, m, d };
    }
    return { y: today.getFullYear(), m: today.getMonth() + 1, d: today.getDate() };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, open]);

  const [pickY, setPickY] = useState(initial.y);
  const [pickM, setPickM] = useState(initial.m);
  const [pickD, setPickD] = useState(initial.d);

  useEffect(() => {
    if (open) {
      setPickY(initial.y);
      setPickM(initial.m);
      setPickD(initial.d);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const yearMin = minDate ? minDate.getFullYear() : today.getFullYear() - 5;
  const yearMax = maxDate ? maxDate.getFullYear() : today.getFullYear() + 10;
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = yearMin; y <= yearMax; y++) arr.push(y);
    return arr;
  }, [yearMin, yearMax]);
  const months = lang === "fr" ? MONTHS_FR : MONTHS_EN;
  const dim = daysInMonth(pickY, pickM);
  const days = useMemo(() => {
    const arr: number[] = [];
    for (let d = 1; d <= dim; d++) arr.push(d);
    return arr;
  }, [dim]);

  // Clamp day if month/year change reduces days available.
  useEffect(() => {
    if (pickD > dim) setPickD(dim);
  }, [dim, pickD]);

  const display = value ? formatDisplayDate(value, lang) : "";

  const confirm = () => {
    let y = pickY, m = pickM, d = pickD;
    // Enforce min/max
    const candidate = new Date(y, m - 1, d);
    if (minDate && candidate < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) {
      const md = minDate;
      y = md.getFullYear(); m = md.getMonth() + 1; d = md.getDate();
    }
    if (maxDate && candidate > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) {
      const md = maxDate;
      y = md.getFullYear(); m = md.getMonth() + 1; d = md.getDate();
    }
    onChange(`${y}-${pad2(m)}-${pad2(d)}`);
    setOpen(false);
  };

  const { container: dateContainer, text: dateText } = splitStyle(style);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={lang === "fr" ? "Choisir une date" : "Pick a date"}
        accessibilityHint={display || (lang === "fr" ? "Aucune date sélectionnée" : "No date selected")}
        style={[
          dateContainer,
          { justifyContent: "center" },
          hasError && errorBorderColor ? { borderColor: errorBorderColor } : null,
        ]}
      >
        <Text style={[dateText, { color: display ? (textColor || dateText.color || C.text) : (placeholderTextColor || C.textMuted) }]}>
          {display || placeholder || (lang === "fr" ? "AAAA-MM-JJ" : "YYYY-MM-DD")}
        </Text>
      </Pressable>
      <PickerModal
        visible={open}
        title={lang === "fr" ? "Choisir une date" : "Pick a date"}
        confirmLabel={lang === "fr" ? "Valider" : "Confirm"}
        cancelLabel={lang === "fr" ? "Annuler" : "Cancel"}
        onCancel={() => setOpen(false)}
        onConfirm={confirm}
      >
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
          <Wheel
            items={days.map((d) => pad2(d))}
            selectedIndex={Math.max(0, Math.min(pickD - 1, days.length - 1))}
            onChange={(i) => setPickD(days[i])}
            width={70}
          />
          <Wheel
            items={months}
            selectedIndex={Math.max(0, Math.min(pickM - 1, months.length - 1))}
            onChange={(i) => setPickM(i + 1)}
            width={130}
          />
          <Wheel
            items={years.map(String)}
            selectedIndex={Math.max(0, years.indexOf(pickY))}
            onChange={(i) => setPickY(years[i])}
            width={90}
          />
        </View>
      </PickerModal>
    </>
  );
}

function parseISO(s: string): Date | null {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}

function formatDisplayDate(value: string, lang: "fr" | "en"): string {
  const n = normalizeDate(value);
  if (!n) return "";
  const [y, m, d] = n.split("-").map(Number);
  const months = lang === "fr" ? MONTHS_FR : MONTHS_EN;
  return lang === "fr"
    ? `${pad2(d)} ${months[m - 1]} ${y}`
    : `${months[m - 1]} ${pad2(d)}, ${y}`;
}

// ---- TimeField --------------------------------------------------------------

export function TimeField(props: Omit<CommonProps, "min" | "max">) {
  const {
    value, onChange, placeholder, style, placeholderTextColor,
    hasError, errorBorderColor, textColor, lang = "fr",
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

  const [open, setOpen] = useState(false);
  const initial = useMemo(() => {
    const n = normalizeTime(value);
    if (n) {
      const [h, m] = n.split(":").map(Number);
      return { h, m };
    }
    return { h: 20, m: 0 };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, open]);

  const [pickH, setPickH] = useState(initial.h);
  const [pickM, setPickM] = useState(initial.m);

  useEffect(() => {
    if (open) {
      setPickH(initial.h);
      setPickM(initial.m);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => pad2(i)), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => pad2(i)), []);

  const display = normalizeTime(value);

  const confirm = () => {
    onChange(`${pad2(pickH)}:${pad2(pickM)}`);
    setOpen(false);
  };

  const { container: timeContainer, text: timeText } = splitStyle(style);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={lang === "fr" ? "Choisir une heure" : "Pick a time"}
        accessibilityHint={display || (lang === "fr" ? "Aucune heure sélectionnée" : "No time selected")}
        style={[
          timeContainer,
          { justifyContent: "center" },
          hasError && errorBorderColor ? { borderColor: errorBorderColor } : null,
        ]}
      >
        <Text style={[timeText, { color: display ? (textColor || timeText.color || C.text) : (placeholderTextColor || C.textMuted) }]}>
          {display || placeholder || "HH:MM"}
        </Text>
      </Pressable>
      <PickerModal
        visible={open}
        title={lang === "fr" ? "Choisir une heure" : "Pick a time"}
        confirmLabel={lang === "fr" ? "Valider" : "Confirm"}
        cancelLabel={lang === "fr" ? "Annuler" : "Cancel"}
        onCancel={() => setOpen(false)}
        onConfirm={confirm}
      >
        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 }}>
          <Wheel
            items={hours}
            selectedIndex={pickH}
            onChange={setPickH}
            width={80}
          />
          <Text style={{ fontSize: 22, color: C.text, fontWeight: "700" }}>:</Text>
          <Wheel
            items={minutes}
            selectedIndex={pickM}
            onChange={setPickM}
            width={80}
          />
        </View>
      </PickerModal>
    </>
  );
}

// ---- Shared modal -----------------------------------------------------------

type PickerModalProps = {
  visible: boolean;
  title: string;
  confirmLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  children: React.ReactNode;
};

function PickerModal({ visible, title, confirmLabel, cancelLabel, onCancel, onConfirm, children }: PickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={modalStyles.backdrop} onPress={onCancel}>
        <Pressable style={modalStyles.sheet} onPress={() => { /* swallow */ }}>
          <Text style={modalStyles.title}>{title}</Text>
          <View style={{ marginVertical: 12 }}>{children}</View>
          <View style={modalStyles.actions}>
            <TouchableOpacity
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              style={[modalStyles.btn, modalStyles.btnGhost]}
            >
              <Text style={[modalStyles.btnText, { color: C.textMuted }]}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              style={[modalStyles.btn, modalStyles.btnPrimary]}
            >
              <Text style={[modalStyles.btnText, { color: "#fff" }]}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  sheet: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: C.bg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 90,
    alignItems: "center",
  },
  btnGhost: { backgroundColor: "transparent" },
  btnPrimary: { backgroundColor: "#7c6af7" },
  btnText: { fontSize: 14, fontWeight: "700" },
});
