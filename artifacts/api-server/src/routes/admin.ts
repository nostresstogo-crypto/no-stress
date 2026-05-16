import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db, adminsTable, partnersTable, eventsTable, deletionRequestsTable, usersTable, venuesTable } from "@workspace/db";
import {
  hashPassword,
  verifyPassword,
  signToken,
  rateLimit,
  verifyToken,
  issueRefreshToken,
  revokeRefreshToken,
  generateRandomPassword,
} from "../lib/auth-utils.js";
import { sendManagerCredentialsEmail, sendManagerPasswordResetEmail } from "../email.js";

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
        role: "superadmin",
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
  req.admin = {
    adminId: payload.sub.slice(2),
    email: payload.email,
    adminRole: (payload as any).adminRole ?? "superadmin",
  };
  next();
}

function requireSuperAdmin(req: any, res: any, next: any) {
  requireAdmin(req, res, () => {
    if (req.admin?.adminRole !== "superadmin") {
      return res.status(403).json({ error: "Action réservée au Super Administrateur." });
    }
    next();
  });
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
  const token = signToken({ sub, email: admin.email, role: "admin", adminRole: admin.role } as any);
  const refreshToken = await issueRefreshToken(sub, req.headers["user-agent"] as string | undefined);
  res.json({ token, refreshToken, admin: { id: String(admin.id), name: admin.name, firstName: admin.firstName, email: admin.email, role: admin.role } });
});

router.post("/admin/logout", async (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken && typeof refreshToken === "string") {
    await revokeRefreshToken(refreshToken);
  }
  res.json({ message: "Déconnexion réussie." });
});

router.get("/admin/me", requireAdmin, async (req: any, res) => {
  const id = Number(req.admin.adminId);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Identifiant admin invalide." });
  }
  const [row] = await db
    .select({ id: adminsTable.id, name: adminsTable.name, firstName: adminsTable.firstName, email: adminsTable.email, role: adminsTable.role })
    .from(adminsTable)
    .where(eq(adminsTable.id, id));
  if (!row) {
    return res.status(404).json({ error: "Admin introuvable." });
  }
  res.json({ admin: { adminId: String(row.id), name: row.name, firstName: row.firstName, email: row.email, role: row.role } });
});

router.post("/admin/change-password", requireAdmin, async (req: any, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return res.status(400).json({ error: "Mot de passe actuel et nouveau mot de passe requis." });
  }
  if (newPassword.length < 12) {
    return res
      .status(400)
      .json({ error: "Le nouveau mot de passe doit faire au moins 12 caractères." });
  }
  if (currentPassword === newPassword) {
    return res
      .status(400)
      .json({ error: "Le nouveau mot de passe doit être différent de l'ancien." });
  }
  const id = Number(req.admin.adminId);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Identifiant admin invalide." });
  }
  const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.id, id));
  if (!admin) {
    return res.status(404).json({ error: "Admin introuvable." });
  }
  const ok = await verifyPassword(currentPassword, admin.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Mot de passe actuel incorrect." });
  }
  const passwordHash = await hashPassword(newPassword);
  await db.update(adminsTable).set({ passwordHash }).where(eq(adminsTable.id, id));
  console.log(`[admin] Password changed via UI for id=${id} email=${JSON.stringify(admin.email)}`);
  res.json({ message: "Mot de passe modifié avec succès." });
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
  const [userStats] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(usersTable);
  const [venueStats] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(venuesTable);
  res.json({
    pendingPartners: partnerStats?.pending ?? 0,
    approvedPartners: partnerStats?.approved ?? 0,
    rejectedPartners: partnerStats?.rejected ?? 0,
    totalDeletionRequests: delStats?.total ?? 0,
    pendingDeletionRequests: delStats?.pending ?? 0,
    pendingPublications: eventStats?.pending ?? 0,
    totalPublications: eventStats?.total ?? 0,
    totalUsers: userStats?.total ?? 0,
    totalVenues: venueStats?.total ?? 0,
  });
});

router.get("/admin/managers", requireSuperAdmin, async (_req, res) => {
  const managers = await db
    .select({ id: adminsTable.id, name: adminsTable.name, firstName: adminsTable.firstName, email: adminsTable.email, createdAt: adminsTable.createdAt })
    .from(adminsTable)
    .where(eq(adminsTable.role, "gestionnaire"));
  res.json({ managers: managers.map((m) => ({ ...m, id: String(m.id) })) });
});

router.post("/admin/managers", requireSuperAdmin, async (req, res) => {
  const { name, firstName, email } = req.body || {};
  if (!name || !firstName || !email) {
    return res.status(400).json({ error: "Nom, prénom et email sont requis." });
  }
  const cleanEmail = String(email).trim().toLowerCase();
  const [existing] = await db
    .select({ id: adminsTable.id })
    .from(adminsTable)
    .where(sql`lower(${adminsTable.email}) = ${cleanEmail}`);
  if (existing) {
    return res.status(409).json({ error: "Cet email est déjà utilisé." });
  }
  const password = generateRandomPassword();
  const passwordHash = await hashPassword(password);
  const [created] = await db
    .insert(adminsTable)
    .values({ email: cleanEmail, passwordHash, name: String(name).trim(), firstName: String(firstName).trim(), role: "gestionnaire" })
    .returning({ id: adminsTable.id, name: adminsTable.name, firstName: adminsTable.firstName, email: adminsTable.email });
  const adminUrl = (process.env.ADMIN_BASE_URL || "https://admin.no-stress.net").replace(/\/+$/, "");
  sendManagerCredentialsEmail({
    to: cleanEmail,
    name: String(name).trim(),
    firstName: String(firstName).trim(),
    email: cleanEmail,
    password,
    adminUrl,
  }).catch((e) => console.error("[admin] Failed to send manager credentials email:", e));
  res.status(201).json({ manager: { ...created, id: String(created.id) } });
});

router.post("/admin/managers/:id/reset-password", requireSuperAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Gestionnaire introuvable." });
  const [manager] = await db
    .select()
    .from(adminsTable)
    .where(and(eq(adminsTable.id, id), eq(adminsTable.role, "gestionnaire")));
  if (!manager) return res.status(404).json({ error: "Gestionnaire introuvable." });
  const password = generateRandomPassword();
  const passwordHash = await hashPassword(password);
  await db.update(adminsTable).set({ passwordHash }).where(eq(adminsTable.id, id));
  sendManagerPasswordResetEmail({
    to: manager.email,
    name: manager.name,
    firstName: manager.firstName ?? "",
    password,
  }).catch((e) => console.error("[admin] Failed to send manager password reset email:", e));
  res.json({ message: "Mot de passe réinitialisé et envoyé par email au gestionnaire." });
});

router.delete("/admin/managers/:id", requireSuperAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Gestionnaire introuvable." });
  const [deleted] = await db
    .delete(adminsTable)
    .where(and(eq(adminsTable.id, id), eq(adminsTable.role, "gestionnaire")))
    .returning({ id: adminsTable.id, email: adminsTable.email });
  if (!deleted) return res.status(404).json({ error: "Gestionnaire introuvable." });
  res.json({ message: "Compte gestionnaire supprimé.", deleted: { id: String(deleted.id), email: deleted.email } });
});

export { requireAdmin, requireSuperAdmin };
export default router;
