/**
 * imageUpload.ts — pipeline d'upload centralisé pour NoStress.
 *
 * Fonctionnalités :
 *   - Compression + redimensionnement avec expo-image-manipulator
 *   - Conversion HEIC/HEIF → JPEG automatique
 *   - Détection du type MIME basée sur l'URI et le résultat du manipulateur
 *   - Upload via URL présignée (S3-compatible)
 *   - Retry avec backoff pour erreurs temporaires (réseau, 5xx, timeout)
 *   - Pas de retry pour erreurs permanentes (413, 415, 403)
 *   - Callbacks de progression : preparing → compressing → uploading → done / error
 *   - File d'attente pour plusieurs images (concurrency limitée)
 *   - Aucun enregistrement d'URL vide
 */

import * as ImageManipulator from "expo-image-manipulator";
import { API_BASE } from "./apiBase";

// ── Constantes ───────────────────────────────────────────────────────────────
const MAX_RETRY = 2;
const RETRY_DELAYS_MS = [1500, 4000];
const UPLOAD_CONCURRENCY = 2; // max 2 uploads simultanés
const __DEV__ = process.env.NODE_ENV !== "production";

// ── Types ────────────────────────────────────────────────────────────────────

export type UploadContext = "avatar" | "card" | "detail" | "gallery";

export type UploadStage =
  | "idle"
  | "preparing"
  | "compressing"
  | "uploading"
  | "done"
  | "error";

export type UploadErrorKind =
  | "too_large"       // 413
  | "unsupported"     // 415
  | "forbidden"       // 403
  | "server_error"    // 5xx
  | "network"         // fetch failed
  | "local_read"      // impossible de lire le fichier local
  | "empty_file"      // blob de taille 0
  | "unknown";

export interface UploadProgress {
  stage: UploadStage;
  /** 0-100, disponible pendant l'upload */
  percent?: number;
}

export interface UploadResult {
  url: string;
  blurhash: string | null;
}

export interface UploadError {
  kind: UploadErrorKind;
  message: string;
  retryable: boolean;
}

// Cible de compression selon le contexte
interface CompressionTarget {
  maxDimension: number;
  quality: number;
}

const COMPRESSION_TARGETS: Record<UploadContext, CompressionTarget> = {
  avatar:  { maxDimension: 640,  quality: 0.85 },
  card:    { maxDimension: 1200, quality: 0.82 },
  detail:  { maxDimension: 1600, quality: 0.84 },
  gallery: { maxDimension: 1800, quality: 0.85 },
};

// ── Détection MIME ────────────────────────────────────────────────────────────

function detectMime(uri: string): { contentType: string; ext: string } {
  const lower = uri.toLowerCase().split("?")[0]; // ignorer query params
  if (lower.endsWith(".png"))  return { contentType: "image/png",  ext: "png" };
  if (lower.endsWith(".webp")) return { contentType: "image/webp", ext: "webp" };
  if (lower.endsWith(".heic") || lower.endsWith(".heif"))
    return { contentType: "image/jpeg", ext: "jpg" }; // sera converti
  return { contentType: "image/jpeg", ext: "jpg" };
}

function safeFileName(uri: string, ext: string): string {
  if (uri.startsWith("blob:") || uri.startsWith("data:") || uri.startsWith("ph://")) {
    return `upload-${Date.now()}.${ext}`;
  }
  const base = uri.split("/").pop()?.split("?")[0] || `upload-${Date.now()}.${ext}`;
  // Remplacer les extensions HEIC/HEIF par jpg
  return base.replace(/\.(heic|heif)$/i, ".jpg");
}

// ── Compression ───────────────────────────────────────────────────────────────

/**
 * Compresse et redimensionne une image avant upload.
 * Retourne l'URI de l'image traitée (toujours JPEG pour compatibilité max).
 */
export async function compressImage(
  uri: string,
  context: UploadContext = "card",
): Promise<string> {
  const { maxDimension, quality } = COMPRESSION_TARGETS[context];

  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxDimension } }], // expo-image-manipulator respecte l'aspect ratio
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG, // convertit HEIC → JPEG
      },
    );

    if (__DEV__) {
      console.log(
        `[imageUpload] compression ctx=${context} maxDim=${maxDimension} q=${quality} → ${result.uri.slice(0, 80)}`,
      );
    }

    return result.uri;
  } catch (err: any) {
    if (__DEV__) {
      console.warn("[imageUpload] compression échouée, URI originale utilisée:", err?.message);
    }
    // Fallback : retourner l'URI originale sans compression
    return uri;
  }
}

// ── Classification des erreurs ────────────────────────────────────────────────

function classifyHttpError(status: number): { kind: UploadErrorKind; retryable: boolean; message: string } {
  switch (true) {
    case status === 413:
      return { kind: "too_large",    retryable: false, message: "Fichier trop volumineux (limite dépassée)" };
    case status === 415:
      return { kind: "unsupported",  retryable: false, message: "Format d'image non supporté" };
    case status === 403:
      return { kind: "forbidden",    retryable: false, message: "Accès refusé — vérifiez vos permissions" };
    case status >= 500:
      return { kind: "server_error", retryable: true,  message: `Erreur serveur (${status}) — réessai possible` };
    default:
      return { kind: "unknown",      retryable: false, message: `Erreur HTTP ${status}` };
  }
}

// ── Upload (avec retry) ───────────────────────────────────────────────────────

/**
 * Upload une image vers le stockage via URL présignée.
 * Gère retry, backoff, et classification des erreurs.
 */
export async function uploadToStorage(
  uri: string,
  options: {
    context?: UploadContext;
    compress?: boolean;
    onProgress?: (p: UploadProgress) => void;
  } = {},
): Promise<UploadResult> {
  const { context = "card", compress = true, onProgress } = options;
  const report = (stage: UploadStage, percent?: number) =>
    onProgress?.({ stage, percent });

  report("preparing");

  // 1. Compression optionnelle
  let processedUri = uri;
  if (compress) {
    report("compressing");
    processedUri = await compressImage(uri, context);
  }

  // 2. Déterminer le MIME (sur l'URI compressée = toujours JPEG si compress=true)
  const { contentType, ext } = compress
    ? { contentType: "image/jpeg", ext: "jpg" }
    : detectMime(uri);
  const name = safeFileName(processedUri, ext);

  // 3. Lire le blob
  let blob: Blob;
  try {
    const fileResp = await fetch(processedUri);
    if (!fileResp.ok) throw new Error(`HTTP ${fileResp.status}`);
    blob = await fileResp.blob();
  } catch (err: any) {
    throw { kind: "local_read", message: `Lecture fichier impossible: ${err?.message ?? err}`, retryable: false } as UploadError;
  }

  const size: number = (blob as any).size ?? 0;
  if (size === 0) {
    throw { kind: "empty_file", message: "Fichier vide ou illisible", retryable: false } as UploadError;
  }

  if (__DEV__) {
    console.log(`[imageUpload] envoi ctx=${context} name=${name} size=${(size / 1024).toFixed(1)} Ko mime=${contentType}`);
  }

  // 4. Upload avec retry
  let lastError: UploadError | null = null;
  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 1] ?? 4000));
      if (__DEV__) console.log(`[imageUpload] retry ${attempt}/${MAX_RETRY}`);
    }

    try {
      report("uploading", 0);

      // Demande URL présignée
      const presignResp = await fetch(`${API_BASE}/storage/uploads/request-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, size, contentType }),
      });

      if (!presignResp.ok) {
        const classified = classifyHttpError(presignResp.status);
        if (!classified.retryable) throw classified as UploadError;
        lastError = classified as UploadError;
        continue;
      }

      const { uploadURL, objectPath } = await presignResp.json();

      // PUT vers le stockage
      report("uploading", 30);
      const putResp = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: blob,
      });

      report("uploading", 90);

      if (!putResp.ok) {
        const classified = classifyHttpError(putResp.status);
        if (!classified.retryable) throw classified as UploadError;
        lastError = classified as UploadError;
        continue;
      }

      const putData = await putResp.json().catch(() => ({}));
      const url = `${API_BASE}/storage${objectPath}`;

      if (!url || url.endsWith("undefined")) {
        throw { kind: "unknown", message: "URL de stockage invalide reçue", retryable: false } as UploadError;
      }

      report("done", 100);
      if (__DEV__) console.log("[imageUpload] ✅ succès →", url.slice(0, 80));
      return { url, blurhash: putData.blurhash ?? null };

    } catch (err: any) {
      // Erreur non-retryable ou UploadError structurée
      if (err && typeof err === "object" && "kind" in err) {
        if (!(err as UploadError).retryable) {
          report("error");
          throw err;
        }
        lastError = err as UploadError;
      } else {
        // Erreur réseau (fetch a levé une exception)
        lastError = {
          kind: "network",
          message: err?.message ?? "Erreur réseau",
          retryable: true,
        };
      }
    }
  }

  report("error");
  throw lastError ?? ({ kind: "unknown", message: "Upload échoué après plusieurs tentatives", retryable: false } as UploadError);
}

// ── Upload groupé (file d'attente) ────────────────────────────────────────────

export interface BatchUploadItem {
  uri: string;
  context?: UploadContext;
}

export interface BatchUploadResult {
  uri: string;
  result?: UploadResult;
  error?: UploadError;
}

/**
 * Upload plusieurs images en parallèle (limité à UPLOAD_CONCURRENCY simultanés).
 * En cas d'échec partiel, les images réussies sont conservées.
 */
export async function uploadBatch(
  items: BatchUploadItem[],
  options: {
    compress?: boolean;
    onItemProgress?: (index: number, p: UploadProgress) => void;
  } = {},
): Promise<BatchUploadResult[]> {
  const results: BatchUploadResult[] = items.map((item) => ({ uri: item.uri }));
  let cursor = 0;

  async function processNext(): Promise<void> {
    while (cursor < items.length) {
      const idx = cursor++;
      const { uri, context = "gallery" } = items[idx];
      try {
        const result = await uploadToStorage(uri, {
          context,
          compress: options.compress ?? true,
          onProgress: (p) => options.onItemProgress?.(idx, p),
        });
        results[idx].result = result;
      } catch (err: any) {
        results[idx].error = err as UploadError;
      }
    }
  }

  // Lance N workers en parallèle
  const workers = Array.from({ length: Math.min(UPLOAD_CONCURRENCY, items.length) }, processNext);
  await Promise.all(workers);
  return results;
}

// ── Message d'erreur lisible ────────────────────────────────────────────────

export function uploadErrorMessage(err: UploadError, lang: "fr" | "en" = "fr"): string {
  if (lang === "en") {
    switch (err.kind) {
      case "too_large":   return "File too large. Please choose a smaller image.";
      case "unsupported": return "Unsupported format. Use JPEG, PNG or WebP.";
      case "forbidden":   return "Permission denied.";
      case "server_error": return "Server error. Please try again.";
      case "network":     return "Network error. Check your connection and retry.";
      case "local_read":  return "Cannot read the image file.";
      case "empty_file":  return "The image file is empty or unreadable.";
      default:            return "Upload failed. Please try again.";
    }
  }
  switch (err.kind) {
    case "too_large":    return "Fichier trop volumineux. Choisissez une image plus petite.";
    case "unsupported":  return "Format non supporté. Utilisez JPEG, PNG ou WebP.";
    case "forbidden":    return "Accès refusé.";
    case "server_error": return "Erreur serveur. Réessayez dans un instant.";
    case "network":      return "Erreur réseau. Vérifiez votre connexion et réessayez.";
    case "local_read":   return "Impossible de lire le fichier image.";
    case "empty_file":   return "Le fichier image est vide ou illisible.";
    default:             return "Upload échoué. Veuillez réessayer.";
  }
}
