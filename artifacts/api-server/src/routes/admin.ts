import { Router, type IRouter } from "express";

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

router.get("/admin/stats", requireAdmin, (_req, res) => {
  res.json({
    pendingPartners: 2,
    approvedPartners: 1,
    rejectedPartners: 1,
    totalDeletionRequests: 3,
    pendingDeletionRequests: 2,
  });
});

export { requireAdmin };
export default router;
