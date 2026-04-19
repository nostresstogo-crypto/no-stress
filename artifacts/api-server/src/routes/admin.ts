import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, partnersTable, eventsTable, deletionRequestsTable } from "@workspace/db";

const router: IRouter = Router();

const ADMIN_CREDENTIALS = [
  { id: "a1", email: "admin@nostress.tg", password: "NoStress@Admin2024!", name: "Administrateur NoStress" },
];

const sessions: Record<string, { adminId: string; name: string; email: string; expiresAt: number }> = {};

function generateToken(): string {
  return `admin_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

function requireAdmin(req: any, res: any, next: any) {
  const auth = req.headers["authorization"];
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentification requise." });
  }
  const token = auth.replace("Bearer ", "");
  const session = sessions[token];
  if (!session || session.expiresAt < Date.now()) {
    return res.status(401).json({ error: "Session expirée ou invalide." });
  }
  req.admin = session;
  next();
}

router.post("/admin/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }
  const admin = ADMIN_CREDENTIALS.find((a) => a.email === email && a.password === password);
  if (!admin) {
    return res.status(401).json({ error: "Identifiants incorrects." });
  }
  const token = generateToken();
  sessions[token] = {
    adminId: admin.id,
    name: admin.name,
    email: admin.email,
    expiresAt: Date.now() + 8 * 60 * 60 * 1000,
  };
  res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email } });
});

router.post("/admin/logout", requireAdmin, (req: any, res) => {
  const token = req.headers["authorization"]?.replace("Bearer ", "");
  if (token) delete sessions[token];
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
