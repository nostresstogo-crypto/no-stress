import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { eq, and, gte, gt, sql, isNull } from "drizzle-orm";
import { db, partnersTable, usersTable, eventsTable, registrationLogTable, refreshTokensTable } from "@workspace/db";
import {
  hashPassword,
  signToken,
  rateLimit,
  issueRefreshToken,
  requireAuth,
  generateVerificationCode,
  generateRandomPassword,
  verificationCodeExpiry,
} from "../lib/auth-utils.js";

const partnerRegisterLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, key: "partner-register" });
import {
  sendPartnerRegistrationEmailToPartner,
  sendPartnerRegistrationEmailToAdmin,
  sendPartnerApprovalEmail,
  sendPartnerRejectionEmail,
  sendPublicationWarningEmail,
  sendAccountDeletedEmail,
  sendVerificationCodeEmail,
  sendPasswordResetEmail,
} from "../email.js";

const partnerForgotLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, key: "partner-forgot" });

// Forgot-password: regenerates a 6-char password, hashes & saves it, revokes
// existing refresh tokens, and emails the new password. Always returns 200 with
// a generic message — never reveals whether the email exists (no enumeration).
async function handlePartnerForgotPassword(req: any, res: any) {
  const email = normEmail(req.body?.email);
  const generic = {
    message:
      "Si un compte partenaire correspond à cet email, un nouveau mot de passe vient d'être envoyé.",
  };
  if (!email) return res.status(200).json(generic);
  const [partner] = await db
    .select()
    .from(partnersTable)
    .where(eq(partnersTable.email, email));
  if (!partner) return res.status(200).json(generic);
  const newPassword = generateRandomPassword();
  const passwordHash = await hashPassword(newPassword);
  await db
    .update(partnersTable)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(partnersTable.id, partner.id));
  // Revoke active sessions so the old password (and any stolen tokens) become
  // useless immediately.
  try {
    await db
      .update(refreshTokensTable)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokensTable.subject, String(partner.id)),
          isNull(refreshTokensTable.revokedAt),
        ),
      );
  } catch {}
  try {
    await sendPasswordResetEmail(partner.email, partner.contactName, newPassword, true);
  } catch (err) {
    console.error("[partners][forgot-password] email send failed:", err);
    // Still return generic — operator can resend manually if needed.
  }
  return res.status(200).json(generic);
}
import { requireAdmin } from "./admin.js";
import { computeNewSubscriptionUntil, subscriptionInfo } from "../lib/subscriptions.js";

const router: IRouter = Router();

function normEmail(s: string) {
  return String(s || "").trim().toLowerCase();
}
function normPhone(s: string) {
  return String(s || "").replace(/[^0-9+]/g, "");
}

function serializePartner(p: any) {
  if (!p) return p;
  const { passwordHash: _ph, ...rest } = p;
  return { ...rest, id: String(p.id), subscription: subscriptionInfo(p) };
}

router.get("/partners", async (req, res) => {
  const { status } = req.query;
  const rows = status
    ? await db.select().from(partnersTable).where(eq(partnersTable.status, String(status)))
    : await db.select().from(partnersTable);
  res.json(rows.map(serializePartner));
});

router.get("/partners/status", async (req, res) => {
  const { email } = req.query;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email requis." });
  }
  const [partner] = await db.select().from(partnersTable).where(eq(partnersTable.email, email));
  if (!partner) {
    return res.status(404).json({ error: "Partenaire introuvable." });
  }
  res.json({
    status: partner.status,
    rejectionReason: partner.rejectionReason ?? null,
    businessName: partner.businessName,
    partnerId: String(partner.id),
    latitude: partner.latitude,
    longitude: partner.longitude,
    subscription: subscriptionInfo(partner),
  });
});

router.get("/partners/approved-map", async (_req, res) => {
  const approved = await db
    .select()
    .from(partnersTable)
    .where(and(eq(partnersTable.status, "approved"), gt(partnersTable.subscriptionUntil, new Date())));
  res.json(
    approved
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => ({
        id: String(p.id),
        businessName: p.businessName,
        businessType: p.businessType,
        city: p.city,
        latitude: p.latitude,
        longitude: p.longitude,
        description: p.description,
        websiteUrl: p.websiteUrl,
        phone: p.phone,
      })),
  );
});

router.post("/partners/register", partnerRegisterLimiter, async (req, res) => {
  const email = normEmail(req.body?.email);
  const phone = normPhone(req.body?.phone);
  const { contactName, businessName, businessType, city, description, websiteUrl, country } = req.body || {};
  if (!email || !contactName || !businessName || !businessType || !phone || !city) {
    return res.status(400).json({ error: "Tous les champs obligatoires doivent être remplis." });
  }
  // Password is auto-generated and emailed only upon admin approval.
  const tempPassword = generateRandomPassword();
  // Note: a same email may coexist as a "user" and as a "partner" account.
  // Only duplicate-within-the-same-role is forbidden (checked just below).
  // If a partner with same email exists AND email already verified → 409 (use login).
  // If exists but NOT yet verified → allow re-submit: update fields, regenerate OTP, resend email.
  const [existingByEmail] = await db
    .select()
    .from(partnersTable)
    .where(eq(partnersTable.email, email));
  if (existingByEmail && existingByEmail.emailVerified) {
    return res.status(409).json({
      error: "Une demande avec cet email existe déjà. Connectez-vous pour reprendre votre dossier.",
      alreadyRegistered: true,
    });
  }
  // Phone collision under a different email → reject to prevent duplicate businesses.
  // Allow same-email pending re-registration to keep / change its phone.
  if (phone) {
    const [existingByPhone] = await db
      .select()
      .from(partnersTable)
      .where(eq(partnersTable.phone, phone));
    if (existingByPhone && existingByPhone.email !== email) {
      return res.status(409).json({ error: "Ce numéro de téléphone est déjà utilisé par un autre partenaire." });
    }
  }
  const code = generateVerificationCode();
  const cityWithCountry = country ? `${city}, ${country}` : city;
  let partner;
  let isNewRegistration = false;
  const passwordHash = await hashPassword(tempPassword);
  if (existingByEmail) {
    // Re-submission for an unverified partner: refresh data + regenerate OTP.
    // Atomic update guarded by `email_verified IS NULL` to prevent a TOCTOU race
    // where the partner verifies their email between our SELECT above and this UPDATE.
    const updated = await db
      .update(partnersTable)
      .set({
        passwordHash,
        contactName,
        businessName,
        businessType,
        phone,
        city: cityWithCountry,
        description: description || null,
        websiteUrl: websiteUrl || null,
        verificationCode: code,
        verificationCodeExpires: verificationCodeExpiry(),
        updatedAt: new Date(),
      })
      .where(and(eq(partnersTable.id, existingByEmail.id), isNull(partnersTable.emailVerified)))
      .returning();
    if (updated.length === 0) {
      // Lost the race — the account became verified between our SELECT and UPDATE.
      return res.status(409).json({
        error: "Une demande avec cet email existe déjà. Connectez-vous pour reprendre votre dossier.",
        alreadyRegistered: true,
      });
    }
    partner = updated[0];
    res.status(200).json({
      message: "Nouveau code de vérification envoyé par email.",
      pendingVerification: true,
      email,
    });
  } else {
    try {
      [partner] = await db
        .insert(partnersTable)
        .values({
          email,
          passwordHash,
          contactName,
          businessName,
          businessType,
          phone,
          city: cityWithCountry,
          latitude: null,
          longitude: null,
          description: description || null,
          websiteUrl: websiteUrl || null,
          verificationCode: code,
          verificationCodeExpires: verificationCodeExpiry(),
        })
        .returning();
      isNewRegistration = true;
    } catch (err: any) {
      // Race on initial creation: another request inserted the partner between our SELECT and INSERT.
      // Re-fetch and route to the re-submission path if the existing row is still unverified.
      if (err?.code === "23505") {
        const [racing] = await db
          .select()
          .from(partnersTable)
          .where(eq(partnersTable.email, email));
        if (racing && !racing.emailVerified) {
          const updated = await db
            .update(partnersTable)
            .set({
              passwordHash,
              contactName,
              businessName,
              businessType,
              phone,
              city: cityWithCountry,
              description: description || null,
              websiteUrl: websiteUrl || null,
              verificationCode: code,
              verificationCodeExpires: verificationCodeExpiry(),
              updatedAt: new Date(),
            })
            .where(and(eq(partnersTable.id, racing.id), isNull(partnersTable.emailVerified)))
            .returning();
          if (updated.length > 0) {
            partner = updated[0];
            res.status(200).json({
              message: "Nouveau code de vérification envoyé par email.",
              pendingVerification: true,
              email,
            });
            sendVerificationCodeEmail(email, contactName, code).catch(() => {});
            return;
          }
        }
        return res.status(409).json({
          error: "Une demande avec cet email existe déjà. Connectez-vous pour reprendre votre dossier.",
          alreadyRegistered: true,
        });
      }
      throw err;
    }
    await db.insert(registrationLogTable).values({ type: "partner" });
    // No token issued — partner must (1) verify email by OTP, (2) wait for admin approval, then login.
    res.status(201).json({
      message: "Code de vérification envoyé par email. Vérifiez votre email pour finaliser l'inscription.",
      pendingVerification: true,
      email,
    });
  }
  sendVerificationCodeEmail(email, contactName, code).catch(() => {});
  // Notify admin only on initial registration (not on re-submissions) to avoid spam.
  if (isNewRegistration) {
    sendPartnerRegistrationEmailToAdmin(partner.id, email, contactName, businessName, businessType, city, phone).catch(() => {});
  }
});

const partnerVerifyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, key: "partner-verify" });
const partnerResendLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, key: "partner-resend" });

// Public OTP verification for partners. Does NOT issue a session — partners must wait for admin approval.
router.post("/partners/verify-email", partnerVerifyLimiter, async (req, res) => {
  const email = normEmail(req.body?.email);
  const code = String(req.body?.code || "").trim();
  if (!email || !code) return res.status(400).json({ error: "Email et code requis." });
  const [partner] = await db.select().from(partnersTable).where(eq(partnersTable.email, email));
  if (!partner) return res.status(404).json({ error: "Partenaire introuvable." });
  if (partner.emailVerified) {
    return res.json({
      message: "Email déjà vérifié.",
      verified: true,
      needsApproval: partner.status === "pending",
      partnerStatus: partner.status,
    });
  }
  if (!partner.verificationCode || !partner.verificationCodeExpires) {
    return res.status(400).json({ error: "Aucun code en attente. Demandez un nouveau code." });
  }
  if (partner.verificationCodeExpires < new Date()) {
    return res.status(400).json({ error: "Code expiré. Demandez un nouveau code." });
  }
  if (partner.verificationCode !== code) {
    return res.status(400).json({ error: "Code incorrect." });
  }
  const [updated] = await db
    .update(partnersTable)
    .set({ emailVerified: new Date(), verificationCode: null, verificationCodeExpires: null, updatedAt: new Date() })
    .where(eq(partnersTable.id, partner.id))
    .returning();
  res.json({
    message: "Email vérifié. Votre compte est en attente d'approbation par l'administrateur.",
    verified: true,
    needsApproval: true,
    partnerStatus: updated.status,
    email: updated.email,
  });
  // Notify partner + admin only after email verification (avoids spam from fake registrations)
  sendPartnerRegistrationEmailToPartner(updated.email, updated.contactName, updated.businessName).catch(() => {});
});

router.post("/partners/forgot-password", partnerForgotLimiter, handlePartnerForgotPassword);

router.post("/partners/resend-verification", partnerResendLimiter, async (req, res) => {
  const email = normEmail(req.body?.email);
  if (!email) return res.status(400).json({ error: "Email requis." });
  const [partner] = await db.select().from(partnersTable).where(eq(partnersTable.email, email));
  if (!partner) return res.status(404).json({ error: "Partenaire introuvable." });
  if (partner.emailVerified) return res.json({ message: "Email déjà vérifié." });
  const code = generateVerificationCode();
  await db
    .update(partnersTable)
    .set({ verificationCode: code, verificationCodeExpires: verificationCodeExpiry(), updatedAt: new Date() })
    .where(eq(partnersTable.id, partner.id));
  res.json({ message: "Code envoyé." });
  sendVerificationCodeEmail(partner.email, partner.contactName, code).catch(() => {});
});

// Deprecated: partner-level GPS location has been removed.
// Locations are now defined per venue via /partners/me/venues/:id/location.
router.patch("/partners/me/location", requireAuth, async (_req, res) => {
  res.status(410).json({
    error: "Endpoint déprécié. Définissez la position de chaque lieu individuellement.",
  });
});

router.get("/partners/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Partenaire introuvable." });
  const [partner] = await db.select().from(partnersTable).where(eq(partnersTable.id, id));
  if (!partner) return res.status(404).json({ error: "Partenaire introuvable." });
  res.json(serializePartner(partner));
});

router.get("/partners/:id/public", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Partenaire introuvable." });
  const [partner] = await db.select().from(partnersTable).where(eq(partnersTable.id, id));
  if (!partner || partner.status !== "approved") {
    return res.status(404).json({ error: "Partenaire introuvable." });
  }
  // Hide the partner page entirely when their subscription has lapsed.
  if (!partner.subscriptionUntil || new Date(partner.subscriptionUntil).getTime() <= Date.now()) {
    return res.status(404).json({ error: "Partenaire introuvable." });
  }
  const archiveCutoff = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 30);
    return d.toISOString().slice(0, 10);
  })();
  const events = await db
    .select()
    .from(eventsTable)
    .where(
      and(
        eq(eventsTable.partnerId, id),
        eq(eventsTable.status, "approved"),
        gte(eventsTable.date, archiveCutoff),
      ),
    );
  res.json({
    partner: {
      id: String(partner.id),
      businessName: partner.businessName,
      businessType: partner.businessType,
      city: partner.city,
      description: partner.description,
      websiteUrl: partner.websiteUrl,
      phone: partner.phone,
      latitude: partner.latitude,
      longitude: partner.longitude,
      createdAt: partner.createdAt,
    },
    events: events.map((e) => ({
      ...e,
      id: String(e.id),
      partnerId: e.partnerId != null ? String(e.partnerId) : null,
    })),
  });
});

router.post("/admin/partners/:id/approve", requireAdmin, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Partenaire introuvable." });
  // Generate a fresh password (sent by email — only delivery channel) and rotate the hash.
  const newPassword = generateRandomPassword();
  const newHash = await hashPassword(newPassword);
  const [partner] = await db
    .update(partnersTable)
    .set({
      status: "approved",
      rejectionReason: null,
      passwordHash: newHash,
      // Grant 3 months of free subscription starting at approval. Reset on each approve
      // so re-approving a previously-rejected partner restarts the trial cleanly.
      subscriptionUntil: computeNewSubscriptionUntil(),
      updatedAt: new Date(),
    })
    .where(eq(partnersTable.id, id))
    .returning();
  if (!partner) return res.status(404).json({ error: "Partenaire introuvable." });
  // Explicitly revoke any active refresh tokens issued before approval (the auto-issued
  // session at registration). The new emailed password is the only valid credential going forward.
  const sub = `p_${partner.id}`;
  await db
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokensTable.subject, sub), isNull(refreshTokensTable.revokedAt)));
  // Await email synchronously so the admin sees a clear failure if SMTP is down,
  // and can use /admin/partners/:id/resend-credentials to retry rather than leaving
  // the partner locked out silently.
  try {
    await sendPartnerApprovalEmail(partner.email, partner.contactName, partner.businessName, newPassword);
    res.json({ message: "Partenaire approuvé avec succès.", partner: serializePartner(partner) });
  } catch (err: any) {
    console.error("[partners.approve] email send failed:", err?.message || err);
    res.status(207).json({
      message: "Partenaire approuvé, mais l'envoi de l'email d'identifiants a échoué. Utilisez 'Renvoyer les identifiants' pour relancer.",
      emailError: true,
      partner: serializePartner(partner),
    });
  }
});

// Admin can regenerate + resend credentials if the original approval email failed
// (e.g. SMTP outage) or the partner lost their password.
router.post("/admin/partners/:id/resend-credentials", requireAdmin, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Partenaire introuvable." });
  // Check existence + status BEFORE mutating credentials — avoid unintended side effects on
  // pending/rejected accounts.
  const [existing] = await db.select().from(partnersTable).where(eq(partnersTable.id, id));
  if (!existing) return res.status(404).json({ error: "Partenaire introuvable." });
  if (existing.status !== "approved") {
    return res.status(400).json({ error: "Le partenaire doit d'abord être approuvé." });
  }
  const newPassword = generateRandomPassword();
  const newHash = await hashPassword(newPassword);
  const [partner] = await db
    .update(partnersTable)
    .set({ passwordHash: newHash, updatedAt: new Date() })
    .where(eq(partnersTable.id, id))
    .returning();
  // Invalidate sessions tied to the old password.
  const sub = `p_${partner.id}`;
  await db
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokensTable.subject, sub), isNull(refreshTokensTable.revokedAt)));
  try {
    await sendPartnerApprovalEmail(partner.email, partner.contactName, partner.businessName, newPassword);
    res.json({ message: "Nouveaux identifiants envoyés par email." });
  } catch (err: any) {
    console.error("[partners.resend-credentials] email send failed:", err?.message || err);
    res.status(502).json({ error: "Échec de l'envoi de l'email. Vérifiez la configuration SMTP." });
  }
});

router.post("/admin/partners/:id/reject", requireAdmin, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Partenaire introuvable." });
  const { reason } = req.body;
  const rejectionReason = reason || "Demande rejetée par l'administrateur.";
  const [partner] = await db
    .update(partnersTable)
    .set({ status: "rejected", rejectionReason, updatedAt: new Date() })
    .where(eq(partnersTable.id, id))
    .returning();
  if (!partner) return res.status(404).json({ error: "Partenaire introuvable." });
  res.json({ message: "Partenaire rejeté.", partner: serializePartner(partner) });
  sendPartnerRejectionEmail(partner.email, partner.contactName, partner.businessName, rejectionReason).catch(() => {});
});

router.get("/admin/events", requireAdmin, async (_req: any, res) => {
  const rows = await db
    .select({
      id: eventsTable.id,
      partnerId: eventsTable.partnerId,
      partnerName: partnersTable.businessName,
      title: eventsTable.title,
      description: eventsTable.description,
      date: eventsTable.date,
      time: eventsTable.time,
      city: eventsTable.city,
      category: eventsTable.category,
      price: eventsTable.price,
      status: eventsTable.status,
      createdAt: eventsTable.createdAt,
    })
    .from(eventsTable)
    .leftJoin(partnersTable, eq(eventsTable.partnerId, partnersTable.id));
  const cutoff = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 30);
    return d.toISOString().slice(0, 10);
  })();
  res.json(
    rows.map((e) => ({
      id: String(e.id),
      partnerId: e.partnerId != null ? String(e.partnerId) : "",
      partnerName: e.partnerName ?? "—",
      title: e.title,
      description: e.description ?? "",
      date: e.date,
      time: e.time ?? "",
      city: e.city ?? "",
      category: e.category ?? "",
      priceFCFA: e.price ?? 0,
      isFree: e.price == null || e.price === 0,
      status: e.status,
      isArchived: typeof e.date === "string" && e.date < cutoff,
      createdAt: e.createdAt,
    })),
  );
});

router.delete("/admin/events/:id", requireAdmin, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Publication introuvable." });
  const [deleted] = await db
    .update(eventsTable)
    .set({ status: "archived" })
    .where(eq(eventsTable.id, id))
    .returning();
  if (!deleted) return res.status(404).json({ error: "Publication introuvable." });
  const { reason } = req.body || {};
  const deleteReason = reason || "Publication non conforme aux Conditions Générales d'Utilisation.";
  let partner: any = null;
  if (deleted.partnerId) {
    [partner] = await db.select().from(partnersTable).where(eq(partnersTable.id, deleted.partnerId));
  }
  const autoMessage = `Bonjour ${partner?.businessName ?? "Partenaire"},\n\nNous avons supprimé votre publication "${deleted.title}" car elle ne respecte pas nos Conditions Générales d'Utilisation et/ou notre charte éthique.\n\nMotif : ${deleteReason}\n\nNoStress s'engage à offrir un contenu de qualité, sûr et respectueux à tous ses utilisateurs.\n\n⚠️ Avertissement : En cas de récidive, votre compte partenaire pourra être suspendu ou supprimé.\n\nPour toute question, contactez notre équipe à nostresstogo@gmail.com.\n\nCordialement,\nL'équipe NoStress`;
  if (partner?.email) {
    sendPublicationWarningEmail(partner.email, partner.businessName, deleted.title, deleteReason).catch(() => {});
  }
  res.json({ message: "Publication supprimée et avertissement envoyé au partenaire.", notification: autoMessage, deleted: { ...deleted, id: String(deleted.id) } });
});

router.delete("/admin/partners/:id", requireAdmin, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Partenaire introuvable." });
  const eventsRemoved = await db.select({ count: sql<number>`count(*)::int` }).from(eventsTable).where(eq(eventsTable.partnerId, id));
  const [deleted] = await db.delete(partnersTable).where(eq(partnersTable.id, id)).returning();
  if (!deleted) return res.status(404).json({ error: "Partenaire introuvable." });
  const { reason } = req.body || {};
  const deleteReason = reason || "Compte jugé frauduleux ou non conforme.";
  sendAccountDeletedEmail(deleted.email, deleted.contactName || deleted.businessName, deleteReason).catch(() => {});
  res.json({ message: `Compte partenaire supprimé. ${eventsRemoved[0]?.count ?? 0} publication(s) retirée(s). Email d'avertissement envoyé.`, deleted: serializePartner(deleted) });
});

router.get("/admin/registrations/stats", requireAdmin, async (req: any, res) => {
  const { period } = req.query;
  const now = Date.now();
  let since: number;
  if (period === "day") since = now - 24 * 60 * 60 * 1000;
  else if (period === "week") since = now - 7 * 24 * 60 * 60 * 1000;
  else if (period === "month") since = now - 30 * 24 * 60 * 60 * 1000;
  else since = now - 365 * 24 * 60 * 60 * 1000;

  const all = await db.select().from(registrationLogTable);
  const filtered = all.filter((r) => new Date(r.date).getTime() >= since);
  const partnerCount = filtered.filter((r) => r.type === "partner").length;
  const clientCount = filtered.filter((r) => r.type === "client").length;

  const buckets: any[] = [];
  if (period === "day") {
    for (let h = 23; h >= 0; h--) {
      const label = `${String(new Date(now - h * 3600000).getHours()).padStart(2, "0")}h`;
      const start = now - (h + 1) * 3600000;
      const end = now - h * 3600000;
      const inBucket = filtered.filter((r) => {
        const t = new Date(r.date).getTime();
        return t >= start && t < end;
      });
      buckets.push({ label, partners: inBucket.filter((r) => r.type === "partner").length, clients: inBucket.filter((r) => r.type === "client").length });
    }
  } else if (period === "week") {
    const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    for (let d = 6; d >= 0; d--) {
      const date = new Date(now - d * 86400000);
      const label = days[date.getDay()];
      const start = new Date(date.toDateString()).getTime();
      const end = start + 86400000;
      const inBucket = filtered.filter((r) => {
        const t = new Date(r.date).getTime();
        return t >= start && t < end;
      });
      buckets.push({ label, partners: inBucket.filter((r) => r.type === "partner").length, clients: inBucket.filter((r) => r.type === "client").length });
    }
  } else if (period === "month") {
    for (let d = 29; d >= 0; d -= 3) {
      const date = new Date(now - d * 86400000);
      const label = `${date.getDate()}/${date.getMonth() + 1}`;
      const start = new Date(date.toDateString()).getTime();
      const end = start + 3 * 86400000;
      const inBucket = filtered.filter((r) => {
        const t = new Date(r.date).getTime();
        return t >= start && t < end;
      });
      buckets.push({ label, partners: inBucket.filter((r) => r.type === "partner").length, clients: inBucket.filter((r) => r.type === "client").length });
    }
  } else {
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
    for (let m = 11; m >= 0; m--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - m);
      const label = months[date.getMonth()];
      const inBucket = filtered.filter((r) => {
        const d = new Date(r.date);
        return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
      });
      buckets.push({ label, partners: inBucket.filter((r) => r.type === "partner").length, clients: inBucket.filter((r) => r.type === "client").length });
    }
  }

  res.json({ partnerCount, clientCount, total: partnerCount + clientCount, buckets });
});

export default router;
