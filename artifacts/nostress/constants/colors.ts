/* ── Togo flag colors ─────────────────────────────────────── */
export const TOGO_GREEN  = "#006A4E";
export const TOGO_YELLOW = "#FFCD00";
export const TOGO_RED    = "#D21034";

/* ── Dark theme (default) — midnight lavender, luxe & chaleureux ── */
const DARK = {
  bg:          "#161A33",  // bleu nuit avec teinte lavande, moins corbeau
  card:        "#1F2447",  // surface élevée, contraste doux
  card2:       "#2A2F58",  // surface imbriquée, bien différenciée
  border:      "#3A3F6B",  // liseré plus visible sur fond plus clair
  lavender:    "#B5A8F0",
  lavenderDim: "#8C7FD8",
  gold:        "#E5C46B",
  goldDim:     "#B89A4D",
  text:        "#F2EFFA",
  textMuted:   "#A6A3C4",  // contraste rééquilibré pour le nouveau bg
  success:     "#3FBE7A",
  error:       "#E26B6B",
  white:       "#FFFFFF",
  isDark:      true,
};

/* ── Light theme — soft pearl + champagne, premium & airy ─── */
const LIGHT = {
  bg:          "#FBFAFE",  // soft pearl, very subtle lavender tint
  card:        "#FFFFFF",  // pure white cards pop on the bg
  card2:       "#F4F1FB",  // gentle lavender-pearl for nested surfaces
  border:      "#E8E5F4",  // soft, low-contrast hairline
  lavender:    "#6E5BD0",  // richer, more saturated primary
  lavenderDim: "#4F3FAE",  // deep accent for hover/pressed
  gold:        "#A07A14",  // warm bronze-champagne, readable as text on light surfaces (~5:1)
  goldDim:     "#7E5F0E",
  text:        "#1A1830",  // deep ink, easier on eyes than pure black
  textMuted:   "#7B7898",  // balanced muted with adequate contrast
  success:     "#1F9D5A",
  error:       "#D14343",
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
