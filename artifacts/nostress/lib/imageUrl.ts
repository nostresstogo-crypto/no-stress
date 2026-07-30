import { API_BASE } from "./apiBase";

/**
 * Construit l'URL d'une image redimensionnée côté serveur.
 *
 * Le serveur expose GET /api/storage/transform?path=...&w=...&h=...&q=...
 * qui redimensionne avec sharp et retourne du WebP avec cache-control 1 an.
 *
 * La transformation n'est déclenchée que si l'image est hébergée sur le même
 * serveur que API_BASE. Pour toute autre origine (API test, CDN externe, etc.),
 * l'URL originale est retournée telle quelle afin d'éviter des erreurs 404.
 *
 * @param url    URL complète de l'image originale
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

  // Vérifie que l'image est bien hébergée sur le même serveur que l'API.
  // Si l'API est https://test.api.no-stress.net/api, l'origine est https://test.api.no-stress.net.
  // Si l'image vient d'un autre serveur, on la retourne sans transformation.
  try {
    const apiOrigin = new URL(API_BASE).origin;  // ex: https://api.no-stress.net
    const imgOrigin = new URL(url).origin;
    if (apiOrigin !== imgOrigin) return url;
  } catch {
    // URL malformée → on la retourne telle quelle
    return url;
  }

  if (!url.includes("/storage/")) return url;

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
