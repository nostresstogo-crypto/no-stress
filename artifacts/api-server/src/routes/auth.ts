import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, partnersTable, usersTable, adminsTable } from "@workspace/db";
import { sendWelcomeEmail, sendAccountDeletedEmail, sendVerificationCodeEmail, sendPasswordResetEmail } from "../email.js";
import { requireAdmin } from "./admin.js";
import {
  hashPassword,
  verifyPassword,
  signToken,
  rateLimit,
  requireAuth,
  generateVerificationCode,
  generateRandomPassword,
  verificationCodeExpiry,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from "../lib/auth-utils.js";
import { and, isNull } from "drizzle-orm";
import { refreshTokensTable } from "@workspace/db";

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
    firstName: u.firstName ?? null,
    lastName: u.lastName ?? null,
    gender: u.gender ?? null,
    phone: u.phone,
    country: u.country,
    role: u.role,
    profileImage: u.profileImage ?? null,
    emailVerified: !!u.emailVerified,
    favorites: [],
  };
}

const ALLOWED_GENDERS = new Set(["F", "M", "ND"]);
function isStrongPassword(p: string): boolean {
  return typeof p === "string"
    && p.length >= 6
    && /[A-Za-z]/.test(p)
    && /[0-9]/.test(p);
}

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, key: "login" });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, key: "register" });
const verifyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, key: "verify" });
const resendLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, key: "resend" });
const forgotLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, key: "forgot" });

// Forgot-password (user accounts). Always returns 200 with a generic message
// to prevent email-enumeration. When an account matches, generates a 6-char
// password, hashes & saves it, revokes refresh tokens, and emails the new pwd.
router.post("/auth/forgot-password", forgotLimiter, async (req, res) => {
  const email = normEmail(req.body?.email);
  const generic = {
    message:
      "Si un compte utilisateur correspond à cet email, un nouveau mot de passe vient d'être envoyé.",
  };
  if (!email) return res.status(200).json(generic);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) return res.status(200).json(generic);
  const newPassword = generateRandomPassword();
  const passwordHash = await hashPassword(newPassword);
  await db
    .update(usersTable)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id));
  try {
    await db
      .update(refreshTokensTable)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokensTable.subject, String(user.id)),
          isNull(refreshTokensTable.revokedAt),
        ),
      );
  } catch {}
  try {
    const displayName = user.name || user.firstName || "Utilisateur";
    await sendPasswordResetEmail(user.email, displayName, newPassword, false);
  } catch (err) {
    console.error("[auth][forgot-password] email send failed:", err);
  }
  return res.status(200).json(generic);
});

router.post("/auth/login", loginLimiter, async (req, res) => {
  const email = normEmail(req.body?.email);
  const { password } = req.body || {};
  // Optional discriminator when the same email exists as both a user and a partner.
  // Accepted values: "user" | "partner" | "structure". Anything else is ignored.
  const rawAccountType = String(req.body?.accountType || "").toLowerCase();
  const accountType: "user" | "partner" | null =
    rawAccountType === "partner" || rawAccountType === "structure"
      ? "partner"
      : rawAccountType === "user"
      ? "user"
      : null;
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }

  // Try partner first (skipped if caller explicitly asked for "user")
  const [partner] = accountType === "user"
    ? [undefined as any]
    : await db.select().from(partnersTable).where(eq(partnersTable.email, email));
  if (partner) {
    const ok = partner.passwordHash ? await verifyPassword(password, partner.passwordHash) : false;
    if (!ok) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }
    if (!partner.emailVerified) {
      return res.status(403).json({
        error: "Email non vérifié. Saisissez le code envoyé par email.",
        needsVerification: true,
        role: "partner",
        email: partner.email,
      });
    }
    if (partner.status === "rejected") {
      return res.status(403).json({
        error: partner.rejectionReason || "Demande rejetée par l'administrateur.",
        partnerStatus: "rejected",
        partnerRejectionReason: partner.rejectionReason ?? null,
      });
    }
    if (partner.status !== "approved") {
      // Pending (or any other non-approved state) — no session until admin approves.
      return res.status(403).json({
        error: "Compte partenaire en attente d'approbation par l'administrateur.",
        partnerStatus: partner.status,
        email: partner.email,
      });
    }
    const sub = `p_${partner.id}`;
    const token = signToken({ sub, email: partner.email, role: "structure" });
    const refreshToken = await issueRefreshToken(sub, req.headers["user-agent"] as string | undefined);
    return res.json({
      token,
      refreshToken,
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
        profileImage: partner.profileImage ?? null,
      },
    });
  }

  // If caller explicitly asked for "partner" but no partner row matched, do NOT fall back to user.
  if (accountType === "partner") {
    return res.status(401).json({ error: "Email ou mot de passe incorrect." });
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    return res.status(401).json({ error: "Email ou mot de passe incorrect." });
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Email ou mot de passe incorrect." });
  }
  // Mobile clients are not allowed to log in as admin — admin access is web-only.
  if (user.role === "admin") {
    return res.status(403).json({
      error: "L'administration est accessible uniquement depuis l'interface web.",
      adminWebOnly: true,
    });
  }
  if (!user.emailVerified) {
    return res.status(403).json({
      error: "Email non vérifié. Saisissez le code envoyé par email.",
      needsVerification: true,
      role: "user",
      email: user.email,
    });
  }
  const sub = `u_${user.id}`;
  const token = signToken({ sub, email: user.email, role: user.role as any });
  const refreshToken = await issueRefreshToken(sub, req.headers["user-agent"] as string | undefined);
  res.json({ token, refreshToken, user: publicUser(user) });
});

router.post("/auth/register", registerLimiter, async (req, res) => {
  const email = normEmail(req.body?.email);
  const phone = normPhone(req.body?.phone);
  const firstName = String(req.body?.firstName || "").trim();
  const lastName = String(req.body?.lastName || "").trim();
  const country = String(req.body?.country || "").trim();
  const gender = String(req.body?.gender || "").trim().toUpperCase();
  const { password } = req.body || {};
  const fullName = `${firstName} ${lastName}`.trim();
  if (!email || !password || !firstName || !lastName || !country || !gender) {
    return res.status(400).json({ error: "Tous les champs sont obligatoires : prénoms, nom, email, pays, sexe et mot de passe." });
  }
  if (!ALLOWED_GENDERS.has(gender)) {
    return res.status(400).json({ error: "Sexe invalide. Valeurs acceptées : F, M, ND." });
  }
  if (!isStrongPassword(password)) {
    return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères, avec lettres et chiffres." });
  }
  const name = fullName;
  const [existingUser] = await db.select({ id: usersTable.id, emailVerified: usersTable.emailVerified }).from(usersTable).where(eq(usersTable.email, email));
  if (existingUser) {
    // Allow re-trigger of OTP if account exists but isn't verified yet
    if (!existingUser.emailVerified) {
      const code = generateVerificationCode();
      await db
        .update(usersTable)
        .set({ verificationCode: code, verificationCodeExpires: verificationCodeExpiry() })
        .where(eq(usersTable.id, existingUser.id));
      sendVerificationCodeEmail(email, name, code).catch(() => {});
      return res.status(200).json({ pendingVerification: true, email, message: "Nouveau code envoyé par email." });
    }
    return res.status(409).json({ error: "Un compte existe déjà avec cet email." });
  }
  // Note: a same email may coexist as a "user" and as a "partner" account.
  // Only duplicate-within-the-same-role is forbidden (handled above).
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
  await db
    .insert(usersTable)
    .values({
      email,
      passwordHash,
      name,
      firstName,
      lastName,
      gender,
      phone: phone || null,
      country: country || null,
      // Public registration NEVER creates an admin account, regardless of email format.
      role: "user",
      verificationCode: code,
      verificationCodeExpires: verificationCodeExpiry(),
    });
  // No token issued — user must verify email first.
  res.status(201).json({
    pendingVerification: true,
    email,
    message: "Code de vérification envoyé par email.",
  });
  sendVerificationCodeEmail(email, name, code).catch(() => {});
});

const refreshLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, key: "refresh" });

router.post("/auth/refresh", refreshLimiter, async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken || typeof refreshToken !== "string") {
    return res.status(400).json({ error: "Refresh token requis." });
  }
  const rotated = await rotateRefreshToken(refreshToken, req.headers["user-agent"] as string | undefined);
  if (!rotated) {
    return res.status(401).json({ error: "Refresh token invalide ou expiré." });
  }
  const sub = rotated.subject;
  let email = "";
  let role: "user" | "structure" | "admin" = "user";
  if (sub.startsWith("u_")) {
    const id = parseInt(sub.slice(2), 10);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!user) return res.status(401).json({ error: "Compte introuvable." });
    email = user.email;
    role = user.role as any;
  } else if (sub.startsWith("p_")) {
    const id = parseInt(sub.slice(2), 10);
    const [partner] = await db.select().from(partnersTable).where(eq(partnersTable.id, id));
    if (!partner) return res.status(401).json({ error: "Compte introuvable." });
    email = partner.email;
    role = "structure";
  } else if (sub.startsWith("a_")) {
    const id = parseInt(sub.slice(2), 10);
    const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.id, id));
    if (!admin) return res.status(401).json({ error: "Compte introuvable." });
    email = admin.email;
    role = "admin";
  } else {
    return res.status(400).json({ error: "Sujet inconnu." });
  }
  const token = signToken({ sub, email, role });
  res.json({ token, refreshToken: rotated.refreshToken });
});

router.post("/auth/logout", async (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken && typeof refreshToken === "string") {
    await revokeRefreshToken(refreshToken);
  }
  res.json({ message: "Déconnexion réussie." });
});

// Public verify-email endpoint (no auth) — verifies code by email and issues a session for users.
// Partners use /partners/verify-email which does NOT issue a session (admin approval required).
router.post("/auth/verify-email", verifyLimiter, async (req, res) => {
  const email = normEmail(req.body?.email);
  const code = String(req.body?.code || "").trim();
  if (!email || !code) {
    return res.status(400).json({ error: "Email et code requis." });
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) return res.status(404).json({ error: "Compte introuvable." });
  if (user.emailVerified) {
    // Already verified — DO NOT mint a session here (would allow account takeover with email only).
    // Tell the client to log in normally with their password.
    return res.status(400).json({
      error: "Email déjà vérifié. Connectez-vous avec votre mot de passe.",
      alreadyVerified: true,
    });
  }
  if (!user.verificationCode || !user.verificationCodeExpires) {
    return res.status(400).json({ error: "Aucun code en attente. Demandez un nouveau code." });
  }
  if (user.verificationCodeExpires < new Date()) {
    return res.status(400).json({ error: "Code expiré. Demandez un nouveau code." });
  }
  if (user.verificationCode !== code) {
    return res.status(400).json({ error: "Code incorrect." });
  }
  const [updated] = await db
    .update(usersTable)
    .set({ emailVerified: new Date(), verificationCode: null, verificationCodeExpires: null })
    .where(eq(usersTable.id, user.id))
    .returning();
  // Now issue a session — user is fully activated.
  const sub = `u_${updated.id}`;
  const token = signToken({ sub, email: updated.email, role: updated.role as any });
  const refreshToken = await issueRefreshToken(sub, req.headers["user-agent"] as string | undefined);
  res.json({ message: "Email vérifié.", token, refreshToken, user: publicUser(updated) });
  sendWelcomeEmail(updated.email, updated.name).catch(() => {});
});

router.post("/auth/resend-verification", resendLimiter, async (req, res) => {
  const email = normEmail(req.body?.email);
  if (!email) return res.status(400).json({ error: "Email requis." });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) return res.status(404).json({ error: "Compte introuvable." });
  if (user.emailVerified) return res.json({ message: "Email déjà vérifié." });
  const code = generateVerificationCode();
  await db
    .update(usersTable)
    .set({ verificationCode: code, verificationCodeExpires: verificationCodeExpiry() })
    .where(eq(usersTable.id, user.id));
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
