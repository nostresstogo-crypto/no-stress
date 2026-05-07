import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, adminsTable, partnersTable, eventsTable, deletionRequestsTable } from "@workspace/db";
import {
  hashPassword,
  verifyPassword,
  signToken,
  rateLimit,
  verifyToken,
  issueRefreshToken,
  revokeRefreshToken,
} from "../lib/auth-utils.js";

const router: IRouter = Router();

const DEFAULT_ADMIN_EMAIL = process.env.INITIAL_ADMIN_EMAIL || "admin@nostress.tg";
const DEFAULT_ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD || "NoStress@Admin2024!";
const DEFAULT_ADMIN_NAME = "Administrateur NoStress";

// Seed initial admin on startup if none exists
let seedPromise: Promise<void> | null = null;
async function ensureSeedAdmin(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const allAdmins = await db
      .select({ id: adminsTable.id, email: adminsTable.email })
      .from(adminsTable);
    console.log(
      `[admin][seed-debug] total_admin_rows=${allAdmins.length} emails=${JSON.stringify(allAdmins.map((a) => a.email))}`,
    );
    const existing = allAdmins.find(
      (a) => a.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase(),
    );
    if (!existing) {
      const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);
      await db.insert(adminsTable).values({
        email: DEFAULT_ADMIN_EMAIL,
        passwordHash,
        name: DEFAULT_ADMIN_NAME,
      });
      console.log(`[admin] Seeded initial admin account: ${DEFAULT_ADMIN_EMAIL}`);
    } else if (process.env.RESET_ADMIN_PASSWORD === "1") {
      const raw = process.env.ADMIN_PASSWORD_RESET_TO;
      const newPassword = raw?.trim();
      console.log(
        `[admin][reset-debug] raw_len=${raw?.length ?? 0} trimmed_len=${newPassword?.length ?? 0} first_char_code=${raw?.charCodeAt(0) ?? "none"} last_char_code=${raw?.charCodeAt((raw?.length ?? 1) - 1) ?? "none"} matched_admin_id=${existing.id} matched_email=${JSON.stringify(existing.email)}`,
      );
      if (!newPassword || newPassword.length < 12) {
        console.error(
          "[admin] RESET_ADMIN_PASSWORD=1 but ADMIN_PASSWORD_RESET_TO is missing or too short (>=12 chars required). Reset aborted — no fallback to hardcoded default.",
        );
      } else {
        const passwordHash = await hashPassword(newPassword);
        const result: any = await db
          .update(adminsTable)
          .set({ passwordHash })
          .where(eq(adminsTable.id, existing.id));
        console.log(
          `[admin] Password reset for id=${existing.id} email=${JSON.stringify(existing.email)} length=${newPassword.length} rowCount=${result?.rowCount ?? "n/a"} — REMOVE RESET_ADMIN_PASSWORD and ADMIN_PASSWORD_RESET_TO env vars now.`,
        );
      }
    }
  })().catch((e) => {
    seedPromise = null;
    console.error("[admin] Failed to seed admin:", e);
  });
  return seedPromise;
}
// Fire-and-forget on module load
ensureSeedAdmin();

function requireAdmin(req: any, res: any, next: any) {
  const auth = req.headers["authorization"];
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentification requise." });
  }
  const payload = verifyToken(auth.slice(7));
  if (!payload || payload.role !== "admin" || !payload.sub.startsWith("a_")) {
    return res.status(401).json({ error: "Session expirée ou invalide." });
  }
  req.admin = { adminId: payload.sub.slice(2), email: payload.email };
  next();
}

const adminLoginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, key: "admin-login" });

router.post("/admin/login", adminLoginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }
  await ensureSeedAdmin();
  const cleanEmail = String(email).trim().toLowerCase();
  const [admin] = await db
    .select()
    .from(adminsTable)
    .where(sql`lower(${adminsTable.email}) = ${cleanEmail}`);
  if (!admin) {
    console.log(`[admin][login-debug] no admin found for email=${JSON.stringify(cleanEmail)}`);
    return res.status(401).json({ error: "Identifiants incorrects." });
  }
  const ok = await verifyPassword(password, admin.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Identifiants incorrects." });
  }
  const sub = `a_${admin.id}`;
  const token = signToken({ sub, email: admin.email, role: "admin" });
  const refreshToken = await issueRefreshToken(sub, req.headers["user-agent"] as string | undefined);
  res.json({ token, refreshToken, admin: { id: String(admin.id), name: admin.name, email: admin.email } });
});

router.post("/admin/logout", async (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken && typeof refreshToken === "string") {
    await revokeRefreshToken(refreshToken);
  }
  res.json({ message: "Déconnexion réussie." });
});

router.get("/admin/me", requireAdmin, (req: any, res) => {
  res.json({ admin: req.admin });
});

router.get("/admin/stats", requireAdmin, async (_req, res) => {
  const [partnerStats] = await db
    .select({
      pending: sql<number>`count(*) filter (where status = 'pending')::int`,
      approved: sql<number>`count(*) filter (where status = 'approved')::int`,
      rejected: sql<number>`count(*) filter (where status = 'rejected')::int`,
    })
    .from(partnersTable);
  const [eventStats] = await db
    .select({
      pending: sql<number>`count(*) filter (where status = 'pending')::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(eventsTable);
  const [delStats] = await db
    .select({
      pending: sql<number>`count(*) filter (where status = 'pending')::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(deletionRequestsTable);
  res.json({
    pendingPartners: partnerStats?.pending ?? 0,
    approvedPartners: partnerStats?.approved ?? 0,
    rejectedPartners: partnerStats?.rejected ?? 0,
    totalDeletionRequests: delStats?.total ?? 0,
    pendingDeletionRequests: delStats?.pending ?? 0,
    pendingPublications: eventStats?.pending ?? 0,
    totalPublications: eventStats?.total ?? 0,
  });
});

export { requireAdmin };
export default router;
