/* ── Togo flag colors ─────────────────────────────────────── */
export const TOGO_GREEN  = "#006A4E";
export const TOGO_YELLOW = "#FFCD00";
export const TOGO_RED    = "#D21034";

/* ── Dark theme (default) — obsidian + champagne luxe ────── */
const DARK = {
  bg:          "#07091A",
  card:        "#11142A",
  card2:       "#191D38",
  border:      "#262B4A",
  lavender:    "#B5A8F0",
  lavenderDim: "#8C7FD8",
  gold:        "#E5C46B",
  goldDim:     "#B89A4D",
  text:        "#F2EFFA",
  textMuted:   "#8B89A8",
  success:     "#3FBE7A",
  error:       "#E26B6B",
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
