import { API_BASE } from "./apiBase";

/**
 * imageUrl.ts — pipeline centralisé de construction et normalisation des URLs d'images.
 *
 * Formats pris en charge :
 *   - URL absolue valide          → normalisée (HTTPS si API est HTTPS)
 *   - URL relative /storage/...   → préfixée avec l'origine de API_BASE
 *   - URI locale expo (file://, blob://, data:) → retournée telle quelle
 *   - null / undefined / vide     → null retourné proprement
 *
 * Transform (sharp → WebP) activé via EXPO_PUBLIC_HAS_IMAGE_TRANSFORM=true
 */

const HAS_TRANSFORM = process.env.EXPO_PUBLIC_HAS_IMAGE_TRANSFORM === "true";
const __DEV__ = process.env.NODE_ENV !== "production";

// ── Utilitaires ────────────────────────────────────────────────────────────

/** Résout l'origine de l'API (ex. https://myapp.replit.dev) */
function apiOrigin(): string {
  try {
    return new URL(API_BASE).origin;
  } catch {
    return "";
  }
}

/** Corrige les doubles slashs dans le chemin (hors schéma) */
function fixDoubleSlashes(url: string): string {
  // Ne pas toucher au schéma (https://)
  return url.replace(/(https?:\/\/)|(\/\/+)/g, (m, scheme) =>
    scheme ? scheme : "/",
  );
}

/** Encode les caractères invalides dans une URL déjà formée (espaces, etc.) */
function safeEncodeUrl(url: string): string {
  try {
    // Si l'URL est déjà valide, ne rien faire
    new URL(url);
    return url;
  } catch {
    // Tenter un encodage partiel des espaces uniquement
    return url.replace(/ /g, "%20");
  }
}

/** Détecte si l'URI est une ressource locale Expo (file, blob, data) */
function isLocalUri(url: string): boolean {
  return (
    url.startsWith("file://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:") ||
    url.startsWith("ph://") // iOS PhotoKit
  );
}

/** Dégrade HTTP → HTTPS si l'API tourne en HTTPS (évite le mixed-content) */
function upgradeToHttps(url: string): string {
  const origin = apiOrigin();
  if (origin.startsWith("https://") && url.startsWith("http://")) {
    // Upgrade uniquement si même hôte que l'API
    try {
      const u = new URL(url);
      const api = new URL(API_BASE);
      if (u.hostname === api.hostname) {
        u.protocol = "https:";
        return u.toString();
      }
    } catch {
      // Laisser passer
    }
  }
  return url;
}

// ── normalizeImageUrl ──────────────────────────────────────────────────────

/**
 * Normalise une URL d'image brute (relative, absolue, locale, null…).
 * Retourne null si l'URL est inexploitable.
 */
export function normalizeImageUrl(
  rawUrl: string | null | undefined,
): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const url = rawUrl.trim();
  if (url.length === 0) return null;

  // URIs locales → pass-through (expo-image les gère nativement)
  if (isLocalUri(url)) return url;

  // URL relative (/storage/... ou /uploads/...)
  if (url.startsWith("/")) {
    const origin = apiOrigin();
    if (!origin) {
      if (__DEV__) console.warn("[imageUrl] URL relative sans origine API connue:", url);
      return null;
    }
    const resolved = fixDoubleSlashes(`${origin}${url}`);
    return upgradeToHttps(safeEncodeUrl(resolved));
  }

  // URL absolue classique
  if (url.startsWith("http://") || url.startsWith("https://")) {
    const fixed = fixDoubleSlashes(url);
    return upgradeToHttps(safeEncodeUrl(fixed));
  }

  // Ni relative ni absolue ni locale → invalide
  if (__DEV__) console.warn("[imageUrl] Format URL non reconnu (ignoré):", url.slice(0, 80));
  return null;
}

// ── thumbUrl ────────────────────────────────────────────────────────────────

/**
 * Construit l'URL d'une image redimensionnée côté serveur (via endpoint /storage/transform).
 *
 * Retourne :
 *   - L'URL du transform si HAS_TRANSFORM=true et image hébergée sur le même serveur.
 *   - L'URL originale normalisée dans tous les autres cas.
 *   - null si l'URL source est vide ou invalide.
 */
export function thumbUrl(
  url: string | null | undefined,
  width: number,
  height?: number,
  quality = 80,
): string | null {
  const normalized = normalizeImageUrl(url);
  if (!normalized) return null;

  // URIs locales ou transform désactivé → image originale normalisée
  if (!HAS_TRANSFORM || isLocalUri(normalized)) return normalized;

  // Transform uniquement si l'image vient du même serveur
  try {
    const origin = apiOrigin();
    const imgOrigin = new URL(normalized).origin;
    if (!origin || origin !== imgOrigin) return normalized;
  } catch {
    return normalized;
  }

  if (!normalized.includes("/storage/")) return normalized;

  const idx = normalized.indexOf("/storage/");
  if (idx === -1) return normalized;
  const storagePath = normalized.slice(idx);

  const params = new URLSearchParams();
  params.set("path", storagePath);
  params.set("w", String(width));
  if (height) params.set("h", String(height));
  params.set("q", String(quality));

  if (__DEV__) {
    console.log(
      `[imageUrl] transform → w=${width} h=${height ?? "auto"} q=${quality}`,
      storagePath.slice(0, 60),
    );
  }

  return `${API_BASE}/storage/transform?${params.toString()}`;
}

// ── Tests unitaires légers (exécutés uniquement en DEV) ────────────────────
// Uncomment to run during development:
// runImageUrlTests();

export function runImageUrlTests(): void {
  const cases: Array<{ input: string | null | undefined; desc: string }> = [
    { input: null, desc: "null" },
    { input: undefined, desc: "undefined" },
    { input: "", desc: "empty string" },
    { input: "  ", desc: "whitespace only" },
    { input: "https://cdn.example.com/img.jpg", desc: "absolute HTTPS externe" },
    { input: "http://cdn.example.com/img.jpg", desc: "absolute HTTP externe" },
    { input: "/storage/events/abc.jpg", desc: "chemin relatif /storage" },
    { input: "/uploads/avatar.png", desc: "chemin relatif /uploads" },
    { input: "file:///var/mobile/Containers/photo.jpg", desc: "local file://" },
    { input: "blob:https://example.com/uuid", desc: "blob URI" },
    { input: "data:image/png;base64,abc123", desc: "data URI" },
    { input: "https://api.com//storage//img.jpg", desc: "doubles slashes" },
    { input: "https://api.com/storage/my image.jpg", desc: "espace dans URL" },
    { input: "not-a-url", desc: "chaîne invalide" },
    { input: "https://api.com/storage/img.jpg", desc: "URL valide normale" },
  ];

  console.group("[imageUrl] Tests normalizeImageUrl");
  let passed = 0;
  for (const c of cases) {
    const result = normalizeImageUrl(c.input);
    const ok = result === null || result.startsWith("http") || result.startsWith("file") || result.startsWith("blob") || result.startsWith("data");
    console.log(`${ok ? "✅" : "❌"} ${c.desc}: ${JSON.stringify(c.input)} → ${JSON.stringify(result)}`);
    if (ok) passed++;
  }
  console.log(`${passed}/${cases.length} tests passés`);
  console.groupEnd();
}
