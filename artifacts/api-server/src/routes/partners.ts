import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, partnersTable, eventsTable, registrationLogTable } from "@workspace/db";
import {
  sendPartnerRegistrationEmailToPartner,
  sendPartnerRegistrationEmailToAdmin,
  sendPartnerApprovalEmail,
  sendPartnerRejectionEmail,
  sendPublicationWarningEmail,
  sendAccountDeletedEmail,
} from "../email.js";
import { requireAdmin } from "./admin.js";
import { users } from "./auth.js";

const router: IRouter = Router();

function normEmail(s: string) {
  return String(s || "").trim().toLowerCase();
}
function normPhone(s: string) {
  return String(s || "").replace(/[^0-9+]/g, "");
}

function serializePartner(p: any) {
  if (!p) return p;
  return { ...p, id: String(p.id) };
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
  });
});

router.get("/partners/approved-map", async (_req, res) => {
  const approved = await db
    .select()
    .from(partnersTable)
    .where(eq(partnersTable.status, "approved"));
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

router.post("/partners/register", async (req, res) => {
  const email = normEmail(req.body?.email);
  const phone = normPhone(req.body?.phone);
  const { contactName, businessName, businessType, city, description, websiteUrl, latitude, longitude, country } = req.body || {};
  if (!email || !contactName || !businessName || !businessType || !phone || !city) {
    return res.status(400).json({ error: "Tous les champs obligatoires doivent être remplis." });
  }
  // Cross-check: same email should not exist as a regular user
  const existingUser = users.find((u: any) => u.email === email || (phone && u.phone && normPhone(u.phone) === phone));
  if (existingUser) {
    return res.status(409).json({ error: "Cet email/numéro est déjà utilisé pour un compte personnel. Utilisez un autre email ou supprimez l'ancien compte." });
  }
  // If a partner with same email exists → friendly 409 telling user to log in (no data leaked).
  const [existingByEmail] = await db
    .select({ id: partnersTable.id })
    .from(partnersTable)
    .where(eq(partnersTable.email, email));
  if (existingByEmail) {
    return res.status(409).json({
      error: "Une demande avec cet email existe déjà. Connectez-vous pour reprendre votre dossier.",
      alreadyRegistered: true,
    });
  }
  // Phone collision under a different email → reject to prevent duplicate businesses
  if (phone) {
    const [existingByPhone] = await db
      .select()
      .from(partnersTable)
      .where(eq(partnersTable.phone, phone));
    if (existingByPhone) {
      return res.status(409).json({ error: "Ce numéro de téléphone est déjà utilisé par un autre partenaire." });
    }
  }
  const [partner] = await db
    .insert(partnersTable)
    .values({
      email,
      contactName,
      businessName,
      businessType,
      phone,
      city: country ? `${city}, ${country}` : city,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      description: description || null,
      websiteUrl: websiteUrl || null,
    })
    .returning();
  await db.insert(registrationLogTable).values({ type: "partner" });
  res.status(201).json({ message: "Demande d'inscription soumise avec succès. Elle sera examinée sous 48h.", partner: serializePartner(partner) });
  sendPartnerRegistrationEmailToPartner(email, contactName, businessName).catch(() => {});
  sendPartnerRegistrationEmailToAdmin(email, contactName, businessName, businessType, city, phone).catch(() => {});
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
  const events = await db
    .select()
    .from(eventsTable)
    .where(and(eq(eventsTable.partnerId, id), eq(eventsTable.status, "approved")));
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

router.post("/admin/partners/:id/approve", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Partenaire introuvable." });
  const [partner] = await db
    .update(partnersTable)
    .set({ status: "approved", rejectionReason: null, updatedAt: new Date() })
    .where(eq(partnersTable.id, id))
    .returning();
  if (!partner) return res.status(404).json({ error: "Partenaire introuvable." });
  res.json({ message: "Partenaire approuvé avec succès.", partner: serializePartner(partner) });
  sendPartnerApprovalEmail(partner.email, partner.contactName, partner.businessName).catch(() => {});
});

router.post("/admin/partners/:id/reject", async (req, res) => {
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
      createdAt: e.createdAt,
    })),
  );
});

router.delete("/admin/events/:id", requireAdmin, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Publication introuvable." });
  const [deleted] = await db.delete(eventsTable).where(eq(eventsTable.id, id)).returning();
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

router.get("/admin/registrations/stats", async (req, res) => {
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
