import { Router, type IRouter, type Request, type Response, raw } from "express";
import { Readable } from "stream";
import {
  ObjectStorageService,
  ObjectNotFoundError,
  verifyLocalUploadToken,
} from "../lib/objectStorage.js";

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

router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = (req.params as any).filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) return res.status(404).json({ error: "File not found" });
    const response = await objectStorageService.downloadObject(file);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
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
