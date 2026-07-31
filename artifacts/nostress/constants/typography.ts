/**
 * Système de typographie centralisé — NoStress
 *
 * Police principale : Plus Jakarta Sans (accueil + nouveaux composants)
 * Police de fallback : Inter (autres écrans, pendant la migration progressive)
 * Fallback système : sans-serif
 */

// ── Familles ──────────────────────────────────────────────────────────────────
export const Fonts = {
  // Plus Jakarta Sans — accueil & nouveaux composants
  regular:    "PlusJakartaSans_400Regular",
  medium:     "PlusJakartaSans_500Medium",
  semiBold:   "PlusJakartaSans_600SemiBold",
  bold:       "PlusJakartaSans_700Bold",
  extraBold:  "PlusJakartaSans_800ExtraBold",

  // Inter — autres écrans (migration progressive)
  interRegular:   "Inter_400Regular",
  interMedium:    "Inter_500Medium",
  interSemiBold:  "Inter_600SemiBold",
  interBold:      "Inter_700Bold",
} as const;

// ── Échelle de taille ─────────────────────────────────────────────────────────
export const FontSize = {
  xs:   10,
  sm:   12,
  base: 14,
  md:   15,
  lg:   17,
  xl:   20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 34,
} as const;

// ── Hauteurs de ligne ─────────────────────────────────────────────────────────
export const LineHeight = {
  tight:   1.2,  // titres compacts
  snug:    1.35, // titres normaux
  normal:  1.5,  // corps de texte
  relaxed: 1.65, // descriptions longues
} as const;

// ── Espacement des lettres ────────────────────────────────────────────────────
export const LetterSpacing = {
  tighter: -0.6,
  tight:   -0.3,
  normal:   0,
  wide:     0.4,
  wider:    0.8,
  widest:   1.5,
} as const;

// ── Styles sémantiques ────────────────────────────────────────────────────────

/** Très grand titre — héro, splash */
export const displayLarge = {
  fontFamily:    Fonts.extraBold,
  fontSize:      FontSize["4xl"],
  letterSpacing: LetterSpacing.tighter,
  lineHeight:    FontSize["4xl"] * LineHeight.tight,
} as const;

/** Grand titre de page */
export const displayMedium = {
  fontFamily:    Fonts.bold,
  fontSize:      FontSize["3xl"],
  letterSpacing: LetterSpacing.tighter,
  lineHeight:    FontSize["3xl"] * LineHeight.tight,
} as const;

/** Titre de section principal */
export const headingLarge = {
  fontFamily:    Fonts.bold,
  fontSize:      FontSize["2xl"],
  letterSpacing: LetterSpacing.tight,
  lineHeight:    FontSize["2xl"] * LineHeight.snug,
} as const;

/** Titre de section secondaire */
export const headingMedium = {
  fontFamily:    Fonts.bold,
  fontSize:      FontSize.xl,
  letterSpacing: LetterSpacing.tight,
  lineHeight:    FontSize.xl * LineHeight.snug,
} as const;

/** Titre de carte */
export const headingSmall = {
  fontFamily:    Fonts.semiBold,
  fontSize:      FontSize.lg,
  letterSpacing: LetterSpacing.normal,
  lineHeight:    FontSize.lg * LineHeight.snug,
} as const;

/** Corps principal */
export const bodyLarge = {
  fontFamily:    Fonts.regular,
  fontSize:      FontSize.md,
  letterSpacing: LetterSpacing.normal,
  lineHeight:    FontSize.md * LineHeight.normal,
} as const;

/** Corps standard */
export const bodyMedium = {
  fontFamily:    Fonts.regular,
  fontSize:      FontSize.base,
  letterSpacing: LetterSpacing.normal,
  lineHeight:    FontSize.base * LineHeight.normal,
} as const;

/** Corps compact */
export const bodySmall = {
  fontFamily:    Fonts.regular,
  fontSize:      FontSize.sm,
  letterSpacing: LetterSpacing.normal,
  lineHeight:    FontSize.sm * LineHeight.normal,
} as const;

/** Label bouton / action principale */
export const labelLarge = {
  fontFamily:    Fonts.bold,
  fontSize:      FontSize.base,
  letterSpacing: LetterSpacing.wide,
  lineHeight:    FontSize.base * LineHeight.tight,
} as const;

/** Label secondaire / onglet */
export const labelMedium = {
  fontFamily:    Fonts.semiBold,
  fontSize:      FontSize.sm,
  letterSpacing: LetterSpacing.wide,
  lineHeight:    FontSize.sm * LineHeight.tight,
} as const;

/** Badge / tag / pill */
export const caption = {
  fontFamily:    Fonts.semiBold,
  fontSize:      FontSize.xs,
  letterSpacing: LetterSpacing.widest,
  lineHeight:    FontSize.xs * LineHeight.tight,
} as const;

/** Métadonnées très petites (date courte, durée…) */
export const micro = {
  fontFamily:    Fonts.medium,
  fontSize:      FontSize.xs,
  letterSpacing: LetterSpacing.wider,
  lineHeight:    FontSize.xs * LineHeight.normal,
} as const;
