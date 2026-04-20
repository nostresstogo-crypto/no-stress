import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET env var is required for token signing.");
}
const SECRET: string = JWT_SECRET;

const TOKEN_TTL = "30d";

export interface AuthPayload {
  sub: string;
  email: string;
  role: "user" | "structure" | "admin";
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: TOKEN_TTL });
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

// Simple in-memory rate limiter (per-IP, per-route key).
// For multi-instance prod deploys, swap for Redis-backed implementation.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(opts: { windowMs: number; max: number; key?: string }) {
  const { windowMs, max, key = "default" } = opts;
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      || req.socket.remoteAddress
      || "unknown";
    const k = `${key}:${ip}`;
    const now = Date.now();
    let b = buckets.get(k);
    if (!b || b.resetAt < now) {
      b = { count: 0, resetAt: now + windowMs };
      buckets.set(k, b);
    }
    b.count++;
    if (b.count > max) {
      const retryAfter = Math.ceil((b.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ error: `Trop de tentatives. Réessayez dans ${retryAfter}s.` });
    }
    next();
  };
}

// Periodic cleanup so buckets don't grow unbounded
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (b.resetAt < now) buckets.delete(k);
  }
}, 5 * 60 * 1000).unref?.();
