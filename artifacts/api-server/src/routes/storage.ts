import { Router, type IRouter, type Request, type Response, raw } from "express";
import { Readable } from "stream";
import sharp from "sharp";
import {
  ObjectStorageService,
  ObjectNotFoundError,
  verifyLocalUploadToken,
} from "../lib/objectStorage.js";

// 1 year cache for immutable images (append ?v= to bust)
const IMAGE_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=31536000, immutable",
} as const;

// 1 hour for transformed variants (size/quality can change)
const TRANSFORM_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
} as const;

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  const { name, size, contentType } = req.body || {};
  if (!name || typeof size !== "number" || !contentType) {
    return res.status(400).json({ error: "Missing or invalid required fields" });
  }
  if (size > 10 * 1024 * 1024) {
    return res.status(400).json({ error: "Le fichier ne doit pas dépasser 10 Mo." });
  }
  if (!/^image\//.test(contentType)) {
    return res.status(400).json({ error: "Seules les images sont autorisées." });
  }
  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
  } catch (error) {
    (req as any).log?.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * Local-driver upload sink. The mobile client receives a presigned URL from
 * /storage/uploads/request-url and PUTs the raw image bytes here.
 *
 *   PUT /storage/uploads/local/:id?exp=<epoch>&token=<hmac>
 *
 * No auth middleware: the HMAC token is the auth.
 */
router.put(
  "/storage/uploads/local/:id",
  raw({ type: "*/*", limit: "10mb" }),
  async (req: Request, res: Response) => {
    try {
      const id = String((req.params as any).id || "");
      const exp = Number(req.query.exp);
      const token = String(req.query.token || "");
      if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
        return res.status(400).json({ error: "Invalid id" });
      }
      if (!exp || !token) {
        return res.status(400).json({ error: "Missing exp/token" });
      }
      if (Math.floor(Date.now() / 1000) > exp) {
        return res.status(410).json({ error: "Upload URL expired" });
      }
      if (!verifyLocalUploadToken(id, exp, token)) {
        return res.status(403).json({ error: "Invalid token" });
      }

      const body = req.body as Buffer | undefined;
      if (!body || !Buffer.isBuffer(body) || body.length === 0) {
        return res.status(400).json({ error: "Empty body" });
      }
      if (body.length > 10 * 1024 * 1024) {
        return res.status(413).json({ error: "Payload too large" });
      }
      const contentType = req.headers["content-type"] || "application/octet-stream";
      if (!/^image\//.test(String(contentType))) {
        return res.status(400).json({ error: "Only images are allowed" });
      }

      const stream = Readable.from(body);
      try {
        const { objectPath } = await objectStorageService.writeLocalUpload(
          id,
          stream,
          String(contentType),
        );
        return res.status(200).json({ ok: true, objectPath });
      } catch (e: any) {
        if (e?.code === "EEXIST") {
          // Token replay or concurrent upload to the same id.
          return res.status(409).json({ error: "Object already exists" });
        }
        throw e;
      }
    } catch (error) {
      (req as any).log?.error({ err: error }, "Error writing local upload");
      return res.status(500).json({ error: "Failed to write upload" });
    }
  },
);

/**
 * GET /api/storage/transform?path=/storage/objects/...&w=400&h=300&q=80
 *
 * Redimensionne une image stockée avec sharp et retourne du WebP.
 * Paramètres:
 *   path  — chemin relatif commençant par /storage/ (ex: /storage/objects/uploads/abc)
 *   w     — largeur cible en pixels (obligatoire)
 *   h     — hauteur cible en pixels (optionnel, crop centré si fourni avec w)
 *   q     — qualité WebP 1-100 (défaut 80)
 */
router.get("/storage/transform", async (req: Request, res: Response) => {
  try {
    const storagePath = String(req.query.path || "");
    const w = parseInt(String(req.query.w || "0"), 10);
    const h = req.query.h ? parseInt(String(req.query.h), 10) : undefined;
    const q = Math.min(100, Math.max(1, parseInt(String(req.query.q || "80"), 10)));

    if (!storagePath.startsWith("/storage/")) {
      return res.status(400).json({ error: "path must start with /storage/" });
    }
    if (!w || w < 1 || w > 4000) {
      return res.status(400).json({ error: "w must be between 1 and 4000" });
    }
    if (h !== undefined && (h < 1 || h > 4000)) {
      return res.status(400).json({ error: "h must be between 1 and 4000" });
    }

    // Résolution du fichier selon le type de chemin
    let objectFile;
    if (storagePath.startsWith("/storage/objects/")) {
      const wildcardPath = storagePath.slice("/storage/objects/".length);
      const objectPath = `/objects/${wildcardPath}`;
      objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    } else if (storagePath.startsWith("/storage/public-objects/")) {
      const filePath = storagePath.slice("/storage/public-objects/".length);
      objectFile = await objectStorageService.searchPublicObject(filePath);
      if (!objectFile) return res.status(404).json({ error: "File not found" });
    } else {
      return res.status(400).json({ error: "Unsupported storage path" });
    }

    const srcStream = objectFile.createReadStream();
    const srcBuffer = await streamToBuffer(srcStream);

    let transformer = sharp(srcBuffer).resize({
      width: w,
      height: h,
      fit: h ? "cover" : "inside",
      withoutEnlargement: true,
      position: "centre",
    });
    transformer = transformer.webp({ quality: q });

    const output = await transformer.toBuffer();

    Object.entries(TRANSFORM_CACHE_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Vary", "Accept");
    res.status(200).send(output);
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      return res.status(404).json({ error: "Object not found" });
    }
    (req as any).log?.error({ err: error }, "Error transforming image");
    res.status(500).json({ error: "Failed to transform image" });
  }
});

router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = (req.params as any).filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) return res.status(404).json({ error: "File not found" });
    const response = await objectStorageService.downloadObject(file);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    Object.entries(IMAGE_CACHE_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    if (response.body) {
      Readable.fromWeb(response.body as any).pipe(res);
    } else res.end();
  } catch (error) {
    (req as any).log?.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = (req.params as any).path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    Object.entries(IMAGE_CACHE_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    if (response.body) {
      Readable.fromWeb(response.body as any).pipe(res);
    } else res.end();
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      return res.status(404).json({ error: "Object not found" });
    }
    (req as any).log?.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
