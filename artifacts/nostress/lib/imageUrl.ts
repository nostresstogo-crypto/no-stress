import { API_BASE } from "./apiBase";

/**
 * Construit l'URL d'une image redimensionnée côté serveur.
 *
 * Le transform (sharp → WebP) n'est tenté que si :
 *   1. EXPO_PUBLIC_HAS_IMAGE_TRANSFORM=true  (endpoint déployé sur ce serveur)
 *   2. L'image est hébergée sur le même serveur que API_BASE
 *
 * Dans tous les autres cas (API test, CDN externe…) l'URL originale est
 * retournée telle quelle pour éviter des 404 silencieux.
 */
const HAS_TRANSFORM = process.env.EXPO_PUBLIC_HAS_IMAGE_TRANSFORM === "true";

export function thumbUrl(
  url: string | null | undefined,
  width: number,
  height?: number,
  quality = 80,
): string | null {
  if (!url) return null;

  // Transform désactivé → image originale
  if (!HAS_TRANSFORM) return url;

  // Vérifie que l'image vient du même serveur que l'API
  try {
    const apiOrigin = new URL(API_BASE).origin;
    const imgOrigin = new URL(url).origin;
    if (apiOrigin !== imgOrigin) return url;
  } catch {
    return url;
  }

  if (!url.includes("/storage/")) return url;

  const idx = url.indexOf("/storage/");
  if (idx === -1) return url;
  const storagePath = url.slice(idx);

  const params = new URLSearchParams();
  params.set("path", storagePath);
  params.set("w", String(width));
  if (height) params.set("h", String(height));
  params.set("q", String(quality));

  return `${API_BASE}/storage/transform?${params.toString()}`;
}
