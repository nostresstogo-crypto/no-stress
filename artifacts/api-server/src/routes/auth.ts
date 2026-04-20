import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, partnersTable, usersTable } from "@workspace/db";
import { sendWelcomeEmail, sendAccountDeletedEmail, sendVerificationCodeEmail } from "../email.js";
import { requireAdmin } from "./admin.js";
import {
  hashPassword,
  verifyPassword,
  signToken,
  rateLimit,
  requireAuth,
  generateVerificationCode,
  verificationCodeExpiry,
} from "../lib/auth-utils.js";

const router: IRouter = Router();

function normEmail(s: string) {
  return String(s || "").trim().toLowerCase();
}
function normPhone(s: string) {
  return String(s || "").replace(/[^0-9+]/g, "");
}

function publicUser(u: typeof usersTable.$inferSelect) {
  return {
    id: String(u.id),
    email: u.email,
    name: u.name,
    phone: u.phone,
    country: u.country,
    role: u.role,
    emailVerified: !!u.emailVerified,
    favorites: [],
  };
}

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, key: "login" });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, key: "register" });

router.post("/auth/login", loginLimiter, async (req, res) => {
  const email = normEmail(req.body?.email);
  const { password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }

  // Try partner first
  const [partner] = await db.select().from(partnersTable).where(eq(partnersTable.email, email));
  if (partner) {
    const ok = await verifyPassword(password, partner.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }
    const token = signToken({ sub: `p_${partner.id}`, email: partner.email, role: "structure" });
    return res.json({
      token,
      user: {
        id: String(partner.id),
        email: partner.email,
        name: partner.contactName || partner.businessName,
        phone: partner.phone,
        role: "structure",
        favorites: [],
        partnerStatus: partner.status,
        partnerRejectionReason: partner.rejectionReason ?? null,
        businessName: partner.businessName,
        city: partner.city,
        latitude: partner.latitude,
        longitude: partner.longitude,
      },
    });
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    return res.status(401).json({ error: "Email ou mot de passe incorrect." });
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Email ou mot de passe incorrect." });
  }
  const token = signToken({ sub: `u_${user.id}`, email: user.email, role: user.role as any });
  res.json({ token, user: publicUser(user) });
});

router.post("/auth/register", registerLimiter, async (req, res) => {
  const email = normEmail(req.body?.email);
  const phone = normPhone(req.body?.phone);
  const { password, name, country } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Email, mot de passe et nom requis." });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Le mot de passe doit faire au moins 8 caractères." });
  }
  const [existingUser] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  if (existingUser) {
    return res.status(409).json({ error: "Un compte existe déjà avec cet email." });
  }
  const [existingPartner] = await db
    .select({ id: partnersTable.id })
    .from(partnersTable)
    .where(eq(partnersTable.email, email));
  if (existingPartner) {
    return res.status(409).json({ error: "Cet email est déjà associé à un compte partenaire. Utilisez la connexion." });
  }
  if (phone) {
    const [partnerByPhone] = await db
      .select({ id: partnersTable.id })
      .from(partnersTable)
      .where(eq(partnersTable.phone, phone));
    if (partnerByPhone) {
      return res.status(409).json({ error: "Ce numéro est déjà utilisé par un compte partenaire." });
    }
  }
  const passwordHash = await hashPassword(password);
  const code = generateVerificationCode();
  const [user] = await db
    .insert(usersTable)
    .values({
      email,
      passwordHash,
      name,
      phone: phone || null,
      country: country || null,
      role: email.includes("admin") ? "admin" : "user",
      verificationCode: code,
      verificationCodeExpires: verificationCodeExpiry(),
    })
    .returning();
  const token = signToken({ sub: `u_${user.id}`, email: user.email, role: user.role as any });
  res.status(201).json({ token, user: publicUser(user) });
  sendVerificationCodeEmail(email, name, code).catch(() => {});
});

const verifyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, key: "verify" });
const resendLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, key: "resend" });

router.post("/auth/verify-email", verifyLimiter, requireAuth, async (req: any, res) => {
  const { code } = req.body || {};
  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Code requis." });
  }
  const sub: string = req.auth.sub;
  if (!sub.startsWith("u_")) {
    return res.status(400).json({ error: "Vérification email réservée aux comptes utilisateurs." });
  }
  const id = parseInt(sub.slice(2), 10);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) return res.status(404).json({ error: "Compte introuvable." });
  if (user.emailVerified) {
    return res.json({ message: "Email déjà vérifié.", user: publicUser(user) });
  }
  if (!user.verificationCode || !user.verificationCodeExpires) {
    return res.status(400).json({ error: "Aucun code en attente. Demandez un nouveau code." });
  }
  if (user.verificationCodeExpires < new Date()) {
    return res.status(400).json({ error: "Code expiré. Demandez un nouveau code." });
  }
  if (user.verificationCode !== code.trim()) {
    return res.status(400).json({ error: "Code incorrect." });
  }
  const [updated] = await db
    .update(usersTable)
    .set({ emailVerified: new Date(), verificationCode: null, verificationCodeExpires: null })
    .where(eq(usersTable.id, id))
    .returning();
  res.json({ message: "Email vérifié.", user: publicUser(updated) });
  sendWelcomeEmail(updated.email, updated.name).catch(() => {});
});

router.post("/auth/resend-verification", resendLimiter, requireAuth, async (req: any, res) => {
  const sub: string = req.auth.sub;
  if (!sub.startsWith("u_")) {
    return res.status(400).json({ error: "Réservé aux comptes utilisateurs." });
  }
  const id = parseInt(sub.slice(2), 10);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) return res.status(404).json({ error: "Compte introuvable." });
  if (user.emailVerified) {
    return res.json({ message: "Email déjà vérifié." });
  }
  const code = generateVerificationCode();
  await db
    .update(usersTable)
    .set({ verificationCode: code, verificationCodeExpires: verificationCodeExpiry() })
    .where(eq(usersTable.id, id));
  res.json({ message: "Code envoyé." });
  sendVerificationCodeEmail(user.email, user.name, code).catch(() => {});
});

router.delete("/admin/users/:id", requireAdmin, async (req: any, res) => {
  const idStr = req.params.id;
  const numericId = parseInt(idStr.replace(/^u_/, ""), 10);
  if (!Number.isFinite(numericId)) {
    return res.status(400).json({ error: "ID utilisateur invalide." });
  }
  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, numericId));
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  const { reason } = req.body || {};
  const deleteReason = reason || "Compte jugé frauduleux ou non conforme.";
  await db.delete(usersTable).where(eq(usersTable.id, numericId));
  sendAccountDeletedEmail(target.email, target.name, deleteReason).catch(() => {});
  res.json({ message: "Compte utilisateur supprimé. Email d'avertissement envoyé.", deleted: publicUser(target) });
});

export default router;
