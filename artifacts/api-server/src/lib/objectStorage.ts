/**
 * Object storage abstraction.
 *
 * Two drivers are supported, picked at runtime via OBJECT_STORAGE_DRIVER:
 *   - "gcs"   → Google Cloud Storage via the Replit sidecar (default in dev)
 *   - "local" → Local filesystem (used on self-hosted VPS deployments)
 *
 * Routes interact only with `ObjectStorageService` and the opaque
 * `StorageObject` returned from it, so they don't care which driver is active.
 */
import { Readable } from "stream";
import { randomUUID, createHmac, timingSafeEqual } from "crypto";
import { promises as fs, createReadStream, createWriteStream } from "fs";
import path from "path";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
} from "./objectAcl.js";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const ACL_METADATA_KEY = "custom:aclPolicy";

type Driver = "gcs" | "local";

function pickDriver(): Driver {
  const v = (process.env.OBJECT_STORAGE_DRIVER || "").toLowerCase();
  if (v === "local") return "local";
  if (v === "gcs") return "gcs";
  // No explicit driver: default to GCS (preserves existing Replit dev setup).
  return "gcs";
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

/* ─── Generic storage object interface ───────────────────────────────────── */
export interface StorageObject {
  readonly name: string;
  exists(): Promise<boolean>;
  getContentType(): Promise<string | undefined>;
  getSize(): Promise<number | undefined>;
  createReadStream(): NodeJS.ReadableStream;
  getAclPolicy(): Promise<ObjectAclPolicy | null>;
  setAclPolicy(policy: ObjectAclPolicy): Promise<void>;
}

/* ─── GCS implementation (Replit sidecar) ────────────────────────────────── */
class GcsStorageObject implements StorageObject {
  // Lazy-loaded GCS File instance
  constructor(public readonly name: string, private readonly file: any) {}

  async exists(): Promise<boolean> {
    const [e] = await this.file.exists();
    return e;
  }
  async getContentType() {
    const [m] = await this.file.getMetadata();
    return m.contentType as string | undefined;
  }
  async getSize() {
    const [m] = await this.file.getMetadata();
    return m.size ? Number(m.size) : undefined;
  }
  createReadStream(): NodeJS.ReadableStream {
    return this.file.createReadStream();
  }
  async getAclPolicy(): Promise<ObjectAclPolicy | null> {
    const [m] = await this.file.getMetadata();
    const v = m?.metadata?.[ACL_METADATA_KEY];
    return v ? JSON.parse(v as string) : null;
  }
  async setAclPolicy(policy: ObjectAclPolicy): Promise<void> {
    const [exists] = await this.file.exists();
    if (!exists) throw new Error(`Object not found: ${this.name}`);
    await this.file.setMetadata({
      metadata: { [ACL_METADATA_KEY]: JSON.stringify(policy) },
    });
  }
}

let _gcsClient: any | null = null;
async function getGcsClient(): Promise<any> {
  if (_gcsClient) return _gcsClient;
  // Dynamic import so deployments with OBJECT_STORAGE_DRIVER=local don't
  // need @google-cloud/storage installed at all.
  const { Storage } = await import("@google-cloud/storage");
  _gcsClient = new Storage({
    credentials: {
      audience: "replit",
      subject_token_type: "access_token",
      token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
      type: "external_account",
      credential_source: {
        url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
        format: { type: "json", subject_token_field_name: "access_token" },
      },
      universe_domain: "googleapis.com",
    },
    projectId: "",
  } as any);
  return _gcsClient;
}

function parseGcsPath(p: string): { bucketName: string; objectName: string } {
  if (!p.startsWith("/")) p = `/${p}`;
  const parts = p.split("/");
  if (parts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

async function gcsSignURL(opts: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const r = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bucket_name: opts.bucketName,
        object_name: opts.objectName,
        method: opts.method,
        expires_at: new Date(Date.now() + opts.ttlSec * 1000).toISOString(),
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!r.ok) {
    throw new Error(
      `Failed to sign object URL (status ${r.status}); make sure you're running on Replit`,
    );
  }
  const data = (await r.json()) as { signed_url: string };
  return data.signed_url;
}

/* ─── Local filesystem implementation ────────────────────────────────────── */
class LocalStorageObject implements StorageObject {
  constructor(public readonly name: string, private readonly absPath: string) {}

  async exists(): Promise<boolean> {
    try {
      await fs.access(this.absPath);
      return true;
    } catch {
      return false;
    }
  }
  private async meta(): Promise<{
    contentType?: string;
    size?: number;
    acl?: ObjectAclPolicy;
  }> {
    try {
      const raw = await fs.readFile(this.absPath + ".meta.json", "utf8");
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  async getContentType() {
    return (await this.meta()).contentType;
  }
  async getSize() {
    const m = await this.meta();
    if (m.size != null) return m.size;
    try {
      const st = await fs.stat(this.absPath);
      return st.size;
    } catch {
      return undefined;
    }
  }
  createReadStream(): NodeJS.ReadableStream {
    return createReadStream(this.absPath);
  }
  async getAclPolicy(): Promise<ObjectAclPolicy | null> {
    return (await this.meta()).acl ?? null;
  }
  async setAclPolicy(policy: ObjectAclPolicy): Promise<void> {
    if (!(await this.exists())) {
      throw new Error(`Object not found: ${this.name}`);
    }
    const cur = await this.meta();
    cur.acl = policy;
    await fs.writeFile(
      this.absPath + ".meta.json",
      JSON.stringify(cur, null, 2),
      "utf8",
    );
  }

  /**
   * Internal helper used by the upload route to write incoming bytes.
   *
   * Refuses if `absPath` already exists (single-use upload — also serves as
   * replay protection for the HMAC presigned URL).
   *
   * Writes to a temporary file and renames atomically so a crashed/concurrent
   * upload cannot leave a half-written file at the final location.
   */
  static async writeUpload(
    absPath: string,
    body: NodeJS.ReadableStream,
    contentType?: string,
  ): Promise<void> {
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    // Reject if already uploaded (replay).
    try {
      await fs.access(absPath);
      const err = new Error("Object already exists") as Error & { code?: string };
      err.code = "EEXIST";
      throw err;
    } catch (e: any) {
      if (e?.code === "EEXIST") throw e;
      // ENOENT → ok, proceed.
    }

    const tmpPath = `${absPath}.${randomUUID()}.tmp`;
    try {
      await new Promise<void>((resolve, reject) => {
        // 'wx' = create exclusive; fail if tmp exists.
        const ws = createWriteStream(tmpPath, { flags: "wx" });
        body.pipe(ws);
        ws.on("finish", () => resolve());
        ws.on("error", reject);
        body.on("error", reject);
      });
      // Atomic publish: rename refuses to clobber by default on most FSes,
      // but we re-check with link()+unlink() semantics via { flag: 'wx' } above
      // for the tmp side. For the destination we use renameSync semantics:
      // POSIX rename IS atomic but DOES overwrite. Guard with another exists
      // check just before rename to close the (small) TOCTOU window.
      try {
        await fs.access(absPath);
        const err = new Error("Object already exists") as Error & { code?: string };
        err.code = "EEXIST";
        throw err;
      } catch (e: any) {
        if (e?.code === "EEXIST") throw e;
      }
      await fs.rename(tmpPath, absPath);
    } catch (e) {
      await fs.rm(tmpPath, { force: true }).catch(() => {});
      throw e;
    }

    const st = await fs.stat(absPath);
    await fs.writeFile(
      absPath + ".meta.json",
      JSON.stringify(
        { contentType: contentType || "application/octet-stream", size: st.size },
        null,
        2,
      ),
      "utf8",
    );
  }
}

/**
 * HMAC-signed token used to authorize a single local PUT upload.
 *
 * In production we require an explicit STORAGE_HMAC_SECRET so that upload
 * tokens cannot accidentally be forged using JWT_SECRET (which has a different
 * blast radius and rotation cadence). In dev we accept a fallback to keep DX
 * frictionless.
 */
function localStorageSecret(): string {
  const explicit = process.env.STORAGE_HMAC_SECRET;
  if (explicit && explicit.length >= 16) return explicit;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "STORAGE_HMAC_SECRET is required in production for the local storage driver " +
        "(must be at least 16 chars). Generate one with `openssl rand -base64 48`.",
    );
  }
  // Dev-only fallback.
  return process.env.JWT_SECRET || "dev-only-storage-hmac-secret";
}
function signLocalUpload(objectId: string, expEpochSec: number): string {
  return createHmac("sha256", localStorageSecret())
    .update(`${objectId}.${expEpochSec}`)
    .digest("hex");
}
export function verifyLocalUploadToken(
  objectId: string,
  expEpochSec: number,
  token: string,
): boolean {
  const expected = signLocalUpload(objectId, expEpochSec);
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

/* ─── Public service ─────────────────────────────────────────────────────── */
export class ObjectStorageService {
  private readonly driver: Driver;
  constructor() {
    this.driver = pickDriver();
  }

  // ── Config helpers ──────────────────────────────────────────────────────
  getPublicObjectSearchPaths(): string[] {
    const v = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(v.split(",").map((p) => p.trim()).filter((p) => p.length > 0)),
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS is not set. " +
          (this.driver === "local"
            ? "Set it to one or more local directories (e.g. /var/www/nostress-api/shared/uploads/public)."
            : "Create a bucket and set the env var (comma-separated paths)."),
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR is not set. " +
          (this.driver === "local"
            ? "Set it to a local directory (e.g. /var/www/nostress-api/shared/uploads/private)."
            : "Create a bucket and set the env var."),
      );
    }
    return dir;
  }

  // ── searchPublicObject ──────────────────────────────────────────────────
  async searchPublicObject(filePath: string): Promise<StorageObject | null> {
    if (this.driver === "local") {
      // Disallow path traversal
      const safe = path.posix.normalize("/" + filePath).replace(/^\/+/, "");
      if (safe.includes("..")) return null;
      for (const root of this.getPublicObjectSearchPaths()) {
        const abs = path.join(root, safe);
        if (!abs.startsWith(path.resolve(root))) continue;
        try {
          await fs.access(abs);
          return new LocalStorageObject(safe, abs);
        } catch {}
      }
      return null;
    }

    const gcs = await getGcsClient();
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseGcsPath(fullPath);
      const file = gcs.bucket(bucketName).file(objectName);
      const [exists] = await file.exists();
      if (exists) return new GcsStorageObject(objectName, file);
    }
    return null;
  }

  // ── downloadObject (returns a streamable Response) ──────────────────────
  async downloadObject(
    obj: StorageObject,
    cacheTtlSec: number = 3600,
  ): Promise<Response> {
    const acl = await obj.getAclPolicy();
    const isPublic = acl?.visibility === "public";
    const contentType =
      (await obj.getContentType()) || "application/octet-stream";
    const size = await obj.getSize();

    const nodeStream = obj.createReadStream();
    const webStream = Readable.toWeb(nodeStream as Readable) as ReadableStream;

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
    };
    if (size != null) headers["Content-Length"] = String(size);

    return new Response(webStream, { headers });
  }

  // ── getObjectEntityUploadURL ────────────────────────────────────────────
  async getObjectEntityUploadURL(): Promise<string> {
    const objectId = randomUUID();

    if (this.driver === "local") {
      const ttlSec = 900;
      const exp = Math.floor(Date.now() / 1000) + ttlSec;
      const token = signLocalUpload(objectId, exp);
      const base = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
      if (!base) {
        throw new Error(
          "PUBLIC_BASE_URL is required for the local storage driver " +
            "(e.g. https://api.no-stress.net).",
        );
      }
      return `${base}/api/storage/uploads/local/${objectId}?exp=${exp}&token=${token}`;
    }

    const privateDir = this.getPrivateObjectDir();
    const fullPath = `${privateDir}/uploads/${objectId}`;
    const { bucketName, objectName } = parseGcsPath(fullPath);
    return gcsSignURL({ bucketName, objectName, method: "PUT", ttlSec: 900 });
  }

  // ── getObjectEntityFile ─────────────────────────────────────────────────
  async getObjectEntityFile(objectPath: string): Promise<StorageObject> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const entityId = objectPath.slice("/objects/".length);
    if (!entityId || entityId.includes("..")) throw new ObjectNotFoundError();

    if (this.driver === "local") {
      const root = this.getPrivateObjectDir();
      const abs = path.join(root, entityId);
      if (!abs.startsWith(path.resolve(root))) throw new ObjectNotFoundError();
      try {
        await fs.access(abs);
      } catch {
        throw new ObjectNotFoundError();
      }
      return new LocalStorageObject(entityId, abs);
    }

    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) entityDir += "/";
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseGcsPath(objectEntityPath);
    const gcs = await getGcsClient();
    const file = gcs.bucket(bucketName).file(objectName);
    const [exists] = await file.exists();
    if (!exists) throw new ObjectNotFoundError();
    return new GcsStorageObject(objectName, file);
  }

  // ── normalizeObjectEntityPath ───────────────────────────────────────────
  /** Convert an upload URL into the canonical `/objects/<id>` path stored in DB. */
  normalizeObjectEntityPath(rawPath: string): string {
    if (this.driver === "local") {
      // Local upload URLs look like:
      //   https://api.no-stress.net/api/storage/uploads/local/<id>?exp=…&token=…
      // (Le préfixe /api est obligatoire car nginx ne proxy que /api/*.
      // L'ancien format sans /api est aussi accepté pour compat ascendante.)
      try {
        const u = new URL(rawPath);
        const m = u.pathname.match(/^(?:\/api)?\/storage\/uploads\/local\/([A-Za-z0-9_-]+)/);
        if (m) return `/objects/uploads/${m[1]}`;
      } catch {
        /* not a URL */
      }
      // Already-normalized path passes through unchanged.
      if (rawPath.startsWith("/objects/")) return rawPath;
      return rawPath;
    }

    if (!rawPath.startsWith("https://storage.googleapis.com/")) return rawPath;
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) objectEntityDir += "/";
    if (!rawObjectPath.startsWith(objectEntityDir)) return rawObjectPath;
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  // ── ACL helpers ─────────────────────────────────────────────────────────
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) return normalizedPath;
    const obj = await this.getObjectEntityFile(normalizedPath);
    await obj.setAclPolicy(aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: StorageObject;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }

  // ── Direct upload sink for the local driver (called by storage route) ───
  async writeLocalUpload(
    objectId: string,
    body: NodeJS.ReadableStream,
    contentType?: string,
  ): Promise<{ objectPath: string }> {
    if (this.driver !== "local") {
      throw new Error("writeLocalUpload only available with OBJECT_STORAGE_DRIVER=local");
    }
    const root = this.getPrivateObjectDir();
    const abs = path.join(root, "uploads", objectId);
    if (!abs.startsWith(path.resolve(root))) {
      throw new Error("Invalid object id");
    }
    await LocalStorageObject.writeUpload(abs, body, contentType);
    return { objectPath: `/objects/uploads/${objectId}` };
  }
}
