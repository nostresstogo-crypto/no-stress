import { API_BASE } from "./apiBase";

/**
 * Construit l'URL d'une image redimensionnée côté serveur.
 *
 * Le serveur expose GET /api/storage/transform?path=...&w=...&h=...&q=...
 * qui redimensionne avec sharp et retourne du WebP avec cache-control 1 an.
 *
 * Si l'URL fournie ne pointe pas vers notre serveur de stockage,
 * elle est retournée telle quelle (images externes, mocks).
 *
 * @param url    URL complète de l'image originale (ex: https://api.no-stress.net/api/storage/objects/...)
 * @param width  Largeur cible en pixels
 * @param height Hauteur cible en pixels (optionnel — crop centré si fourni)
 * @param quality Qualité WebP 1-100 (défaut 80)
 */
export function thumbUrl(
  url: string | null | undefined,
  width: number,
  height?: number,
  quality = 80,
): string | null {
  if (!url) return null;

  // Extrait le path /api/storage/... relatif à la base API
  const storagePrefix = `${API_BASE}/storage/`;
  if (!url.includes("/storage/")) return url; // image externe, pas de transform

  // Récupère la partie après /storage/
  const idx = url.indexOf("/storage/");
  if (idx === -1) return url;
  const storagePath = url.slice(idx); // ex: /storage/objects/uploads/abc123

  const params = new URLSearchParams();
  params.set("path", storagePath);
  params.set("w", String(width));
  if (height) params.set("h", String(height));
  params.set("q", String(quality));

  return `${API_BASE}/storage/transform?${params.toString()}`;
}
