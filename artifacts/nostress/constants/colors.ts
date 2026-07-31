/* ── Togo flag colors ─────────────────────────────────────── */
export const TOGO_GREEN  = "#006A4E";
export const TOGO_YELLOW = "#FFCD00";
export const TOGO_RED    = "#D21034";

/* ── Light theme — pearl lavender, premium & lumineux ──────── */
const LIGHT = {
  /* Backgrounds */
  bg:          "#F5F3FC",  // pearl with lavender tint — riche, pas blanc pur
  card:        "#FFFFFF",  // cartes blanches qui se démarquent du fond
  card2:       "#EDE8FA",  // surface imbriquée lavande douce
  card3:       "#F9F7FE",  // surface glass ultra-légère
  /* Borders */
  border:      "#DDD8F0",  // liseré lavande discret
  /* Primary */
  lavender:    "#6650D8",  // violet profond & saturé — principal
  lavenderDim: "#4A3BB8",  // pressé / actif
  /* Accent */
  gold:        "#9A7010",  // ambre chaud — réservé aux éléments importants
  goldDim:     "#7A5A0C",
  /* Text */
  text:        "#12102A",  // encre profonde, très lisible
  textMuted:   "#6E6A8C",  // secondaire, contraste suffisant
  /* Status */
  success:     "#1A9452",
  error:       "#C83B3B",
  warning:     "#C97A15",
  /* Utility */
  overlay:     "rgba(8,6,24,0.46)",
  shadow:      "#1A1530",
  white:       "#FFFFFF",
  isDark:      false,
};

/* ── Dark theme — bleu nuit profond, luxe & vibrant ─────────── */
const DARK = {
  /* Backgrounds */
  bg:          "#0C0F22",  // navy profond — pas noir pur
  card:        "#141830",  // surface élevée
  card2:       "#1A1F3C",  // imbriqué
  card3:       "#21274A",  // encore plus élevé / glass
  /* Borders */
  border:      "#2C3260",  // visible mais discret
  /* Primary */
  lavender:    "#A898EC",  // violet lumineux et maîtrisé
  lavenderDim: "#8070D4",
  /* Accent */
  gold:        "#DEB85C",  // or chaud, élégant
  goldDim:     "#B08C3A",
  /* Text */
  text:        "#EDE9F8",  // blanc cassé lavande
  textMuted:   "#9490B8",  // secondaire équilibré
  /* Status */
  success:     "#36B870",
  error:       "#E06060",
  warning:     "#E0A030",
  /* Utility */
  overlay:     "rgba(4,3,14,0.62)",
  shadow:      "#000000",
  white:       "#FFFFFF",
  isDark:      true,
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
