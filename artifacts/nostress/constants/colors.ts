/* ── Togo flag colors ─────────────────────────────────────── */
export const TOGO_GREEN  = "#006A4E";
export const TOGO_YELLOW = "#FFCD00";
export const TOGO_RED    = "#D21034";

/* ── Dark theme (default) ────────────────────────────────── */
const DARK = {
  bg:          "#0E1120",
  card:        "#161829",
  card2:       "#1E2035",
  border:      "#2A2D45",
  lavender:    "#9B8FE8",
  lavenderDim: "#7B6FD4",
  gold:        "#D4AF37",
  goldDim:     "#B8961E",
  text:        "#F0EDF8",
  textMuted:   "#8B89A6",
  success:     "#4CAF82",
  error:       "#E05C5C",
  white:       "#FFFFFF",
  isDark:      true,
};

/* ── Light theme ─────────────────────────────────────────── */
const LIGHT = {
  bg:          "#F5F4FC",
  card:        "#FFFFFF",
  card2:       "#ECEAF8",
  border:      "#D9D7EF",
  lavender:    "#7B6FD4",
  lavenderDim: "#5B50B0",
  gold:        "#B8961E",
  goldDim:     "#9A7A0C",
  text:        "#12101E",
  textMuted:   "#6B6890",
  success:     "#2E8B5A",
  error:       "#C0392B",
  white:       "#FFFFFF",
  isDark:      false,
};

/* Static dark export kept for non-component usage (StyleSheet outside render) */
export const C = DARK;
export const CLight = LIGHT;

/* Convenience getter used by useColors() hook */
export function getThemeColors(isDark: boolean) {
  return isDark ? DARK : LIGHT;
}

export type ColorPalette = typeof DARK;

export default {
  light: {
    text: LIGHT.text,
    background: LIGHT.bg,
    tint: LIGHT.lavender,
    tabIconDefault: LIGHT.textMuted,
    tabIconSelected: LIGHT.lavender,
  },
};
