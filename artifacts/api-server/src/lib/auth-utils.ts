import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Redis } from "ioredis";
import { and, eq, isNull } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import { db, refreshTokensTable } from "@workspace/db";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET env var is required for token signing.");
}
const SECRET: string = JWT_SECRET;

const ACCESS_TTL = "1h";
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface AuthPayload {
  sub: string;
  email: string;
  role: "user" | "structure" | "admin";
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export function generateVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Auto-generated password sent by email (partner approval, forgot-password).
// Exactly 6 chars: 3 letters + 3 digits, shuffled. Avoids ambiguous glyphs
// (no 0/O/o, 1/l/I) so users can retype it from the email without confusion.
// Always contains at least one letter and one digit (matches isStrongPassword
// requirements except the >=8 length bar — auto-passwords are intentionally short
// to "alléger le temps de saisie" and the user is expected to change it).
export function generateRandomPassword(): string {
  const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
  const DIGITS = "23456789";
  const pick = (alphabet: string) =>
    alphabet[crypto.randomBytes(1)[0] % alphabet.length];
  const chars = [
    pick(LETTERS), pick(LETTERS), pick(LETTERS),
    pick(DIGITS), pick(DIGITS), pick(DIGITS),
  ];
  // Fisher-Yates shuffle with crypto bytes
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomBytes(1)[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export function verificationCodeExpiry(): Date {
  return new Date(Date.now() + 15 * 60 * 1000);
}

export async function verifyPassword(plain: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: ACCESS_TTL });
}

// Refresh-token format: "<id>.<secret>" — id lets us look up the row in O(1),
// secret is bcrypt-compared to prevent timing attacks on stored hashes.
export async function issueRefreshToken(subject: string, userAgent?: string): Promise<string> {
  const secret = crypto.randomBytes(32).toString("base64url");
  const tokenHash = await bcrypt.hash(secret, 10);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  const [row] = await db
    .insert(refreshTokensTable)
    .values({ subject, tokenHash, expiresAt, userAgent: userAgent || null })
    .returning({ id: refreshTokensTable.id });
  return `${row.id}.${secret}`;
}

export async function rotateRefreshToken(rawToken: string, userAgent?: string): Promise<{ subject: string; refreshToken: string } | null> {
  const dot = rawToken.indexOf(".");
  if (dot < 0) return null;
  const id = parseInt(rawToken.slice(0, dot), 10);
  const secret = rawToken.slice(dot + 1);
  if (!Number.isFinite(id) || !secret) return null;

  const [row] = await db.select().from(refreshTokensTable).where(eq(refreshTokensTable.id, id));
  if (!row) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt < new Date()) return null;
  const ok = await bcrypt.compare(secret, row.tokenHash);
  if (!ok) return null;

  // Compare-and-swap: atomically claim the rotation. If another request already
  // rotated this token, the WHERE clause returns 0 rows and we abort.
  const claimed = await db
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokensTable.id, row.id), isNull(refreshTokensTable.revokedAt)))
    .returning({ id: refreshTokensTable.id });
  if (claimed.length === 0) return null;

  // We won the race — issue replacement and link it.
  const newSecret = crypto.randomBytes(32).toString("base64url");
  const newHash = await bcrypt.hash(newSecret, 10);
  const newExpires = new Date(Date.now() + REFRESH_TTL_MS);
  const [next] = await db
    .insert(refreshTokensTable)
    .values({ subject: row.subject, tokenHash: newHash, expiresAt: newExpires, userAgent: userAgent || row.userAgent })
    .returning({ id: refreshTokensTable.id });

  await db
    .update(refreshTokensTable)
    .set({ replacedById: next.id })
    .where(eq(refreshTokensTable.id, row.id));

  return { subject: row.subject, refreshToken: `${next.id}.${newSecret}` };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const dot = rawToken.indexOf(".");
  if (dot < 0) return;
  const id = parseInt(rawToken.slice(0, dot), 10);
  if (!Number.isFinite(id)) return;
  await db
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokensTable.id, id), isNull(refreshTokensTable.revokedAt)));
}

export async function revokeAllForSubject(subject: string): Promise<void> {
  await db
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokensTable.subject, subject), isNull(refreshTokensTable.revokedAt)));
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET) as AuthPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function requireAuth(req: any, res: Response, next: NextFunction) {
  const auth = req.headers["authorization"];
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentification requise." });
  }
  const payload = verifyToken(auth.slice(7));
  if (!payload) {
    return res.status(401).json({ error: "Session expirée ou invalide." });
  }
  req.auth = payload;
  next();
}

// Rate limiter — Redis-backed if REDIS_URL is set (multi-instance safe),
// otherwise falls back to an in-memory map (single-instance only).
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

let redis: Redis | null = null;
const REDIS_URL = process.env.REDIS_URL;
if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      lazyConnect: false,
    });
    redis.on("error", (err) => {
      // Don't crash on transient redis errors — limiter falls back per-call.
      console.error("[rate-limit] redis error:", err.message);
    });
    redis.on("connect", () => {
      console.log("[rate-limit] connected to Redis");
    });
  } catch (err) {
    console.error("[rate-limit] failed to init Redis, falling back to in-memory:", err);
    redis = null;
  }
}

function clientIp(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
    || req.socket.remoteAddress
    || "unknown";
}

async function checkRedis(k: string, max: number, windowSec: number): Promise<{ allowed: boolean; retryAfter: number }> {
  if (!redis) return { allowed: true, retryAfter: 0 };
  // Atomic INCR + EXPIRE-on-first-hit, then PTTL for accurate retry-after.
  const pipeline = redis.pipeline();
  pipeline.incr(k);
  pipeline.expire(k, windowSec, "NX");
  pipeline.pttl(k);
  const results = await pipeline.exec();
  if (!results) throw new Error("redis pipeline failed");
  const count = results[0]?.[1] as number;
  const ttlMs = results[2]?.[1] as number;
  const retryAfter = Math.max(1, Math.ceil((ttlMs > 0 ? ttlMs : windowSec * 1000) / 1000));
  return { allowed: count <= max, retryAfter };
}

function checkMemory(k: string, max: number, windowMs: number): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  let b = buckets.get(k);
  if (!b || b.resetAt < now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(k, b);
  }
  b.count++;
  const retryAfter = Math.ceil((b.resetAt - now) / 1000);
  return { allowed: b.count <= max, retryAfter };
}

export function rateLimit(opts: { windowMs: number; max: number; key?: string }) {
  const { windowMs, max, key = "default" } = opts;
  const windowSec = Math.ceil(windowMs / 1000);
  return async (req: Request, res: Response, next: NextFunction) => {
    const k = `rl:${key}:${clientIp(req)}`;
    let result: { allowed: boolean; retryAfter: number };
    try {
      if (redis && redis.status === "ready") {
        result = await checkRedis(k, max, windowSec);
      } else {
        result = checkMemory(k, max, windowMs);
      }
    } catch (err) {
      // Redis hiccup — fail open to in-memory so legitimate traffic isn't dropped.
      result = checkMemory(k, max, windowMs);
    }
    if (!result.allowed) {
      res.setHeader("Retry-After", String(result.retryAfter));
      return res.status(429).json({ error: `Trop de tentatives. Réessayez dans ${result.retryAfter}s.` });
    }
    next();
  };
}

// Periodic cleanup of in-memory buckets so they don't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (b.resetAt < now) buckets.delete(k);
  }
}, 5 * 60 * 1000).unref?.();
