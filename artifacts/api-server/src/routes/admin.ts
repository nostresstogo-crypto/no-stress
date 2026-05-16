import { Router, type IRouter } from "express";
import { eq, sql, and, desc, ilike, or, inArray } from "drizzle-orm";
import { db, adminsTable, partnersTable, eventsTable, deletionRequestsTable, usersTable, venuesTable, reviewsTable } from "@workspace/db";
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
import {
  sendManagerCredentialsEmail,
  sendManagerPasswordResetEmail,
  sendUserSuspendedEmail,
  sendUserBannedEmail,
  sendUserReactivatedEmail,
  sendPartnerSuspendedEmail,
  sendPartnerBannedEmail,
  sendPartnerReactivatedEmail,
  sendReviewApprovedToAuthorEmail,
  sendReviewRejectedToAuthorEmail,
  sendReviewApprovedToPartnerEmail,
} from "../email.js";
import { notifyReviewModerationUser, notifyPartnerReviewApproved } from "../lib/pushNotifications.js";

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

// ── User management ──────────────────────────────────────────────────────────
router.get("/admin/users", requireAdmin, async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "50"), 10)));
  const offset = (page - 1) * limit;
  const search = String(req.query.search || "").trim();
  const status = req.query.status ? String(req.query.status) : undefined;

  const conds: any[] = [];
  if (search) {
    conds.push(or(ilike(usersTable.email, `%${search}%`), ilike(usersTable.name, `%${search}%`)));
  }
  if (status) conds.push(eq(usersTable.status, status));
  const whereClause = conds.length ? and(...conds) : undefined;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(whereClause);
  const users = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      firstName: usersTable.firstName,
      phone: usersTable.phone,
      country: usersTable.country,
      status: usersTable.status,
      statusReason: usersTable.statusReason,
      statusUntil: usersTable.statusUntil,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(whereClause)
    .orderBy(desc(usersTable.createdAt))
    .limit(limit)
    .offset(offset);
  res.json({ users: users.map((u) => ({ ...u, id: String(u.id) })), total, page, limit });
});

router.put("/admin/users/:id/suspend", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Utilisateur introuvable." });
  const { reason, until } = req.body || {};
  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return res.status(400).json({ error: "Le motif est requis." });
  }
  let untilDate: Date | null = null;
  if (until) {
    untilDate = new Date(String(until));
    if (isNaN(untilDate.getTime())) return res.status(400).json({ error: "Date de fin invalide." });
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });
  const [updated] = await db
    .update(usersTable)
    .set({ status: "suspended", statusReason: reason.trim(), statusUntil: untilDate })
    .where(eq(usersTable.id, id))
    .returning();
  sendUserSuspendedEmail(user.email, user.name || "Utilisateur", reason.trim(), untilDate).catch(
    (e) => console.error("[admin] Suspension email failed:", e),
  );
  res.json({ user: { ...updated, id: String(updated.id) } });
});

router.put("/admin/users/:id/ban", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Utilisateur introuvable." });
  const { reason } = req.body || {};
  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return res.status(400).json({ error: "Le motif est requis." });
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });
  const [updated] = await db
    .update(usersTable)
    .set({ status: "banned", statusReason: reason.trim(), statusUntil: null })
    .where(eq(usersTable.id, id))
    .returning();
  sendUserBannedEmail(user.email, user.name || "Utilisateur", reason.trim()).catch(
    (e) => console.error("[admin] Ban email failed:", e),
  );
  res.json({ user: { ...updated, id: String(updated.id) } });
});

router.put("/admin/users/:id/reactivate", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Utilisateur introuvable." });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });
  const [updated] = await db
    .update(usersTable)
    .set({ status: "active", statusReason: null, statusUntil: null })
    .where(eq(usersTable.id, id))
    .returning();
  if (user.status !== "active") {
    sendUserReactivatedEmail(user.email, user.name || "Utilisateur").catch(
      (e) => console.error("[admin] Reactivation email failed:", e),
    );
  }
  res.json({ user: { ...updated, id: String(updated.id) } });
});

// ── Partner account management ────────────────────────────────────────────────
router.get("/admin/partner-accounts", requireAdmin, async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "50"), 10)));
  const offset = (page - 1) * limit;
  const search = String(req.query.search || "").trim();
  const status = req.query.status ? String(req.query.status) : undefined;

  const conds: any[] = [];
  if (search) {
    conds.push(
      or(
        ilike(partnersTable.email, `%${search}%`),
        ilike(partnersTable.businessName, `%${search}%`),
        ilike(partnersTable.contactName, `%${search}%`),
      ),
    );
  }
  if (status) conds.push(eq(partnersTable.status, status));
  const whereClause = conds.length ? and(...conds) : undefined;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(partnersTable)
    .where(whereClause);
  const rows = await db
    .select({
      id: partnersTable.id,
      email: partnersTable.email,
      contactName: partnersTable.contactName,
      businessName: partnersTable.businessName,
      businessType: partnersTable.businessType,
      city: partnersTable.city,
      phone: partnersTable.phone,
      status: partnersTable.status,
      statusReason: (partnersTable as any).statusReason,
      statusUntil: (partnersTable as any).statusUntil,
      createdAt: partnersTable.createdAt,
    })
    .from(partnersTable)
    .where(whereClause)
    .orderBy(desc(partnersTable.createdAt))
    .limit(limit)
    .offset(offset);
  res.json({ partners: rows.map((p) => ({ ...p, id: String(p.id) })), total, page, limit });
});

router.put("/admin/partners/:id/suspend", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Partenaire introuvable." });
  const { reason, until } = req.body || {};
  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return res.status(400).json({ error: "Le motif est requis." });
  }
  let untilDate: Date | null = null;
  if (until) {
    untilDate = new Date(String(until));
    if (isNaN(untilDate.getTime())) return res.status(400).json({ error: "Date de fin invalide." });
  }
  const [partner] = await db.select().from(partnersTable).where(eq(partnersTable.id, id));
  if (!partner) return res.status(404).json({ error: "Partenaire introuvable." });
  const [updated] = await db
    .update(partnersTable)
    .set({ status: "suspended", statusReason: reason.trim(), statusUntil: untilDate, updatedAt: new Date() } as any)
    .where(eq(partnersTable.id, id))
    .returning();
  sendPartnerSuspendedEmail(partner.email, partner.contactName, reason.trim(), untilDate).catch(
    (e) => console.error("[admin] Partner suspension email failed:", e),
  );
  res.json({ partner: { ...updated, id: String((updated as any).id) } });
});

router.put("/admin/partners/:id/ban", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Partenaire introuvable." });
  const { reason } = req.body || {};
  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return res.status(400).json({ error: "Le motif est requis." });
  }
  const [partner] = await db.select().from(partnersTable).where(eq(partnersTable.id, id));
  if (!partner) return res.status(404).json({ error: "Partenaire introuvable." });
  const [updated] = await db
    .update(partnersTable)
    .set({ status: "banned", statusReason: reason.trim(), statusUntil: null, updatedAt: new Date() } as any)
    .where(eq(partnersTable.id, id))
    .returning();
  sendPartnerBannedEmail(partner.email, partner.contactName, reason.trim()).catch(
    (e) => console.error("[admin] Partner ban email failed:", e),
  );
  res.json({ partner: { ...updated, id: String((updated as any).id) } });
});

router.put("/admin/partners/:id/reactivate", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Partenaire introuvable." });
  const [partner] = await db.select().from(partnersTable).where(eq(partnersTable.id, id));
  if (!partner) return res.status(404).json({ error: "Partenaire introuvable." });
  if (partner.status !== "suspended" && partner.status !== "banned") {
    return res.status(400).json({ error: "Le partenaire n'est pas suspendu ou banni." });
  }
  const [updated] = await db
    .update(partnersTable)
    .set({ status: "approved", statusReason: null, statusUntil: null, updatedAt: new Date() } as any)
    .where(eq(partnersTable.id, id))
    .returning();
  sendPartnerReactivatedEmail(partner.email, partner.contactName).catch(
    (e) => console.error("[admin] Partner reactivation email failed:", e),
  );
  res.json({ partner: { ...updated, id: String((updated as any).id) } });
});

// ── Reviews moderation ────────────────────────────────────────────────────────
router.get("/admin/reviews", requireAdmin, async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "50"), 10)));
  const offset = (page - 1) * limit;
  const status = req.query.status ? String(req.query.status) : undefined;
  const itemType = req.query.itemType ? String(req.query.itemType) : undefined;

  const conds: any[] = [];
  if (status) conds.push(eq(reviewsTable.status, status));
  if (itemType) conds.push(eq(reviewsTable.itemType, itemType));
  const whereClause = conds.length ? and(...conds) : undefined;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(reviewsTable)
    .where(whereClause);
  const rows = await db
    .select()
    .from(reviewsTable)
    .where(whereClause)
    .orderBy(desc(reviewsTable.createdAt))
    .limit(limit)
    .offset(offset);

  // Collect IDs for batch enrichment
  const userIds = [...new Set(rows.filter((r) => r.userId).map((r) => r.userId!))];
  const partnerIds = [...new Set(rows.filter((r) => r.partnerId && !r.userId).map((r) => r.partnerId!))];
  const eventIds = [...new Set(rows.filter((r) => r.itemType === "event").map((r) => r.itemId))];
  const venueIds = [...new Set(rows.filter((r) => r.itemType === "venue").map((r) => r.itemId))];

  const [users, partners, events, venues] = await Promise.all([
    userIds.length
      ? db.select({ id: usersTable.id, name: usersTable.name, firstName: usersTable.firstName, lastName: usersTable.lastName, email: usersTable.email, phone: usersTable.phone, status: usersTable.status, createdAt: usersTable.createdAt }).from(usersTable).where(inArray(usersTable.id, userIds))
      : [],
    partnerIds.length
      ? db.select({ id: partnersTable.id, contactName: partnersTable.contactName, businessName: partnersTable.businessName, email: partnersTable.email, phone: partnersTable.phone, status: partnersTable.status, createdAt: partnersTable.createdAt }).from(partnersTable).where(inArray(partnersTable.id, partnerIds))
      : [],
    eventIds.length
      ? db.select({ id: eventsTable.id, title: eventsTable.title, titleFr: eventsTable.titleFr, city: eventsTable.city, date: eventsTable.date, status: eventsTable.status, partnerId: eventsTable.partnerId, imageUrl: eventsTable.imageUrl }).from(eventsTable).where(inArray(eventsTable.id, eventIds))
      : [],
    venueIds.length
      ? db.select({ id: venuesTable.id, name: venuesTable.name, city: venuesTable.city, type: venuesTable.type, status: venuesTable.status, partnerId: venuesTable.partnerId, imageUrl: venuesTable.imageUrl }).from(venuesTable).where(inArray(venuesTable.id, venueIds))
      : [],
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const partnerMap = new Map(partners.map((p) => [p.id, p]));
  const eventMap = new Map(events.map((e) => [e.id, e]));
  const venueMap = new Map(venues.map((v) => [v.id, v]));

  const enriched = rows.map((r) => {
    let authorName: string | null = null;
    let authorEmail: string | null = null;
    let authorPhone: string | null = null;
    let authorStatus: string | null = null;
    let authorCreatedAt: Date | null = null;
    let authorBusinessName: string | null = null;

    if (r.userId) {
      const u = userMap.get(r.userId);
      if (u) {
        authorName = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || null;
        authorEmail = u.email;
        authorPhone = u.phone ?? null;
        authorStatus = u.status;
        authorCreatedAt = u.createdAt;
      }
    } else if (r.partnerId) {
      const p = partnerMap.get(r.partnerId);
      if (p) {
        authorName = p.contactName;
        authorBusinessName = p.businessName;
        authorEmail = p.email;
        authorPhone = p.phone ?? null;
        authorStatus = p.status;
        authorCreatedAt = p.createdAt;
      }
    }

    let itemTitle: string | null = null;
    let itemCity: string | null = null;
    let itemDate: string | null = null;
    let itemStatus: string | null = null;
    let itemPartnerId: number | null = null;
    let itemImageUrl: string | null = null;
    let itemVenueType: string | null = null;

    if (r.itemType === "event") {
      const e = eventMap.get(r.itemId);
      if (e) {
        itemTitle = e.titleFr || e.title;
        itemCity = e.city ?? null;
        itemDate = e.date;
        itemStatus = e.status;
        itemPartnerId = e.partnerId ?? null;
        itemImageUrl = e.imageUrl ?? null;
      }
    } else if (r.itemType === "venue") {
      const v = venueMap.get(r.itemId);
      if (v) {
        itemTitle = v.name;
        itemCity = v.city;
        itemStatus = v.status;
        itemPartnerId = v.partnerId ?? null;
        itemImageUrl = v.imageUrl ?? null;
        itemVenueType = v.type ?? null;
      }
    }

    return {
      ...r,
      id: String(r.id),
      authorName,
      authorEmail,
      authorPhone,
      authorStatus,
      authorCreatedAt,
      authorBusinessName,
      itemTitle,
      itemCity,
      itemDate,
      itemStatus,
      itemPartnerId,
      itemImageUrl,
      itemVenueType,
    };
  });

  res.json({ reviews: enriched, total, page, limit });
});

router.put("/admin/reviews/:id/approve", requireAdmin, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Avis introuvable." });
  const adminId = parseInt(req.admin.adminId, 10);
  const [updated] = await db
    .update(reviewsTable)
    .set({ status: "approved", adminId: Number.isFinite(adminId) ? adminId : null })
    .where(eq(reviewsTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Avis introuvable." });
  res.json({ review: { ...updated, id: String(updated.id) } });

  // Push + email notifications — fire-and-forget
  notifyReviewModerationUser({
    userId: updated.userId,
    partnerId: updated.partnerId,
    status: "approved",
    itemType: updated.itemType as "event" | "venue",
    itemId: updated.itemId,
  }).catch(() => {});

  (async () => {
    try {
      // Fetch author info
      let authorEmail: string | null = null;
      let authorName = "Utilisateur";
      if (updated.userId) {
        const [u] = await db
          .select({ email: usersTable.email, name: usersTable.name, firstName: usersTable.firstName, lastName: usersTable.lastName })
          .from(usersTable).where(eq(usersTable.id, updated.userId));
        if (u) { authorEmail = u.email; authorName = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || "Utilisateur"; }
      } else if (updated.partnerId) {
        const [p] = await db
          .select({ email: partnersTable.email, contactName: partnersTable.contactName })
          .from(partnersTable).where(eq(partnersTable.id, updated.partnerId));
        if (p) { authorEmail = p.email; authorName = p.contactName; }
      }

      // Fetch item info + item partner
      let itemTitle = `#${updated.itemId}`;
      let itemPartnerId: number | null = null;
      if (updated.itemType === "event") {
        const [e] = await db
          .select({ title: eventsTable.title, titleFr: eventsTable.titleFr, partnerId: eventsTable.partnerId })
          .from(eventsTable).where(eq(eventsTable.id, updated.itemId));
        if (e) { itemTitle = e.titleFr || e.title; itemPartnerId = e.partnerId ?? null; }
      } else if (updated.itemType === "venue") {
        const [v] = await db
          .select({ name: venuesTable.name, partnerId: venuesTable.partnerId })
          .from(venuesTable).where(eq(venuesTable.id, updated.itemId));
        if (v) { itemTitle = v.name; itemPartnerId = v.partnerId ?? null; }
      }

      // Email to author
      if (authorEmail) {
        sendReviewApprovedToAuthorEmail(authorEmail, {
          name: authorName,
          itemType: updated.itemType as "event" | "venue",
          itemTitle,
          rating: updated.rating,
          comment: updated.comment ?? null,
        }).catch((e) => console.error("[review-email] author approve failed:", e));
      }

      // Push + email to item partner (skip if the author IS the item partner)
      if (itemPartnerId && itemPartnerId !== updated.partnerId) {
        const [partner] = await db
          .select({ email: partnersTable.email, contactName: partnersTable.contactName })
          .from(partnersTable).where(eq(partnersTable.id, itemPartnerId));
        if (partner) {
          notifyPartnerReviewApproved({
            partnerId: itemPartnerId,
            itemType: updated.itemType as "event" | "venue",
            itemId: updated.itemId,
            rating: updated.rating,
            comment: updated.comment ?? null,
          }).catch(() => {});
          sendReviewApprovedToPartnerEmail(partner.email, {
            partnerName: partner.contactName,
            itemType: updated.itemType as "event" | "venue",
            itemTitle,
            rating: updated.rating,
            comment: updated.comment ?? null,
          }).catch((e) => console.error("[review-email] partner approve failed:", e));
        }
      } else if (itemPartnerId && itemPartnerId === updated.partnerId) {
        // Author is the item partner — only push, no separate email
        notifyPartnerReviewApproved({
          partnerId: itemPartnerId,
          itemType: updated.itemType as "event" | "venue",
          itemId: updated.itemId,
          rating: updated.rating,
          comment: updated.comment ?? null,
        }).catch(() => {});
      }
    } catch (err) {
      console.error("[review-email] approve enrichment failed:", err);
    }
  })();
});

router.put("/admin/reviews/:id/reject", requireAdmin, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Avis introuvable." });
  const adminId = parseInt(req.admin.adminId, 10);
  const [updated] = await db
    .update(reviewsTable)
    .set({ status: "rejected", adminId: Number.isFinite(adminId) ? adminId : null })
    .where(eq(reviewsTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Avis introuvable." });
  res.json({ review: { ...updated, id: String(updated.id) } });

  // Push notification — fire-and-forget
  notifyReviewModerationUser({
    userId: updated.userId,
    partnerId: updated.partnerId,
    status: "rejected",
    itemType: updated.itemType as "event" | "venue",
    itemId: updated.itemId,
  }).catch(() => {});

  // Email to author only — fire-and-forget
  (async () => {
    try {
      let authorEmail: string | null = null;
      let authorName = "Utilisateur";
      if (updated.userId) {
        const [u] = await db
          .select({ email: usersTable.email, name: usersTable.name, firstName: usersTable.firstName, lastName: usersTable.lastName })
          .from(usersTable).where(eq(usersTable.id, updated.userId));
        if (u) { authorEmail = u.email; authorName = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || "Utilisateur"; }
      } else if (updated.partnerId) {
        const [p] = await db
          .select({ email: partnersTable.email, contactName: partnersTable.contactName })
          .from(partnersTable).where(eq(partnersTable.id, updated.partnerId));
        if (p) { authorEmail = p.email; authorName = p.contactName; }
      }

      let itemTitle = `#${updated.itemId}`;
      if (updated.itemType === "event") {
        const [e] = await db
          .select({ title: eventsTable.title, titleFr: eventsTable.titleFr })
          .from(eventsTable).where(eq(eventsTable.id, updated.itemId));
        if (e) itemTitle = e.titleFr || e.title;
      } else if (updated.itemType === "venue") {
        const [v] = await db.select({ name: venuesTable.name }).from(venuesTable).where(eq(venuesTable.id, updated.itemId));
        if (v) itemTitle = v.name;
      }

      if (authorEmail) {
        sendReviewRejectedToAuthorEmail(authorEmail, {
          name: authorName,
          itemType: updated.itemType as "event" | "venue",
          itemTitle,
          rating: updated.rating,
          comment: updated.comment ?? null,
        }).catch((e) => console.error("[review-email] author reject failed:", e));
      }
    } catch (err) {
      console.error("[review-email] reject enrichment failed:", err);
    }
  })();
});

router.delete("/admin/reviews/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Avis introuvable." });
  const [deleted] = await db.delete(reviewsTable).where(eq(reviewsTable.id, id)).returning();
  if (!deleted) return res.status(404).json({ error: "Avis introuvable." });
  res.json({ message: "Avis supprimé.", deleted: { ...deleted, id: String(deleted.id) } });
});

export { requireAdmin, requireSuperAdmin };
export default router;
