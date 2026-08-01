/**
 * backfill-blurhash.ts
 *
 * Script one-shot : génère et sauvegarde le blurhash pour tous les événements
 * et lieux dont la colonne `blurhash` est NULL en base de données.
 *
 * Usage :
 *   pnpm --filter @workspace/api-server run backfill:blurhash
 *
 * Idempotent : ne traite que les lignes avec blurhash IS NULL.
 * Non-fatal : une image inaccessible est ignorée (log + skip).
 * Compatible local et GCS.
 */

import { isNull, isNotNull } from "drizzle-orm";
import { db, eventsTable, venuesTable } from "@workspace/db";
import { ObjectStorageService } from "../lib/objectStorage.js";
import sharp from "sharp";
import { encode as blurhashEncode } from "blurhash";
import { Readable } from "stream";
import { eq } from "drizzle-orm";

const objectStorage = new ObjectStorageService();

/* ── Helpers ──────────────────────────────────────────────────────────────── */

/** Collecte un NodeJS.ReadableStream en Buffer. */
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer | string) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
    );
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

/**
 * Télécharge les bytes d'une image à partir de son image_url DB.
 *
 * Formats acceptés :
 *  - `/objects/uploads/<uuid>`     → objet privé local/GCS
 *  - `/objects/<entityId>`         → objet privé (GCS)
 *  - `/storage/objects/...`        → alias API, strip /storage puis getObjectEntityFile
 *  - `https://...`                 → URL externe (fetch HTTP)
 */
async function fetchImageBytes(imageUrl: string): Promise<Buffer> {
  // Normalise d'abord via le service (convertit les anciennes URLs upload)
  const normalized = objectStorage.normalizeObjectEntityPath(imageUrl);

  if (normalized.startsWith("/objects/")) {
    const obj = await objectStorage.getObjectEntityFile(normalized);
    return streamToBuffer(obj.createReadStream());
  }

  // "/storage/objects/..." → strip "/storage"
  if (normalized.startsWith("/storage/objects/")) {
    const stripped = normalized.slice("/storage".length);
    const obj = await objectStorage.getObjectEntityFile(stripped);
    return streamToBuffer(obj.createReadStream());
  }

  // URL externe (http/https) — fetch direct
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    const resp = await fetch(normalized, { signal: AbortSignal.timeout(15_000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${normalized}`);
    return Buffer.from(await resp.arrayBuffer());
  }

  throw new Error(`Format d'URL non reconnu : ${imageUrl}`);
}

/** Génère un blurhash depuis un buffer image (même logique que storage.ts). */
async function generateBlurhash(buf: Buffer): Promise<string> {
  const { data, info } = await sharp(buf)
    .resize(32, 32, { fit: "cover", withoutEnlargement: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return blurhashEncode(
    new Uint8ClampedArray(data.buffer),
    info.width,
    info.height,
    4,
    3,
  );
}

/* ── Backfill generique ───────────────────────────────────────────────────── */

interface Row {
  id: number;
  imageUrl: string | null;
}

async function backfillRows(
  label: string,
  rows: Row[],
  updateFn: (id: number, hash: string) => Promise<void>,
): Promise<{ ok: number; skipped: number }> {
  let ok = 0;
  let skipped = 0;

  for (const row of rows) {
    const url = row.imageUrl;
    if (!url) {
      console.warn(`  [SKIP] ${label} id=${row.id} — image_url vide`);
      skipped++;
      continue;
    }
    try {
      const buf = await fetchImageBytes(url);
      const hash = await generateBlurhash(buf);
      await updateFn(row.id, hash);
      console.log(`  [OK]   ${label} id=${row.id} → ${hash}`);
      ok++;
    } catch (err: any) {
      console.warn(
        `  [SKIP] ${label} id=${row.id} (${url}) — ${err?.message ?? err}`,
      );
      skipped++;
    }
  }

  return { ok, skipped };
}

/* ── Main ─────────────────────────────────────────────────────────────────── */

async function main() {
  console.log("=== Backfill blurhash ===\n");

  // ── Événements ──────────────────────────────────────────────────────────
  const events = await db
    .select({ id: eventsTable.id, imageUrl: eventsTable.imageUrl })
    .from(eventsTable)
    .where(
      // blurhash IS NULL AND image_url IS NOT NULL
      isNull(eventsTable.blurhash),
    )
    .then((rows) => rows.filter((r) => r.imageUrl != null));

  console.log(`Événements à traiter : ${events.length}`);
  const evRes = await backfillRows("event", events, async (id, hash) => {
    await db
      .update(eventsTable)
      .set({ blurhash: hash })
      .where(eq(eventsTable.id, id));
  });

  // ── Lieux ───────────────────────────────────────────────────────────────
  const venues = await db
    .select({ id: venuesTable.id, imageUrl: venuesTable.imageUrl })
    .from(venuesTable)
    .where(isNull(venuesTable.blurhash))
    .then((rows) => rows.filter((r) => r.imageUrl != null));

  console.log(`\nLieux à traiter : ${venues.length}`);
  const veRes = await backfillRows("venue", venues, async (id, hash) => {
    await db
      .update(venuesTable)
      .set({ blurhash: hash })
      .where(eq(venuesTable.id, id));
  });

  // ── Résumé ───────────────────────────────────────────────────────────────
  console.log("\n=== Résumé ===");
  console.log(
    `Événements : ${evRes.ok} mis à jour, ${evRes.skipped} ignorés`,
  );
  console.log(`Lieux      : ${veRes.ok} mis à jour, ${veRes.skipped} ignorés`);
  console.log(
    `Total      : ${evRes.ok + veRes.ok} mis à jour, ${evRes.skipped + veRes.skipped} ignorés`,
  );

  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
