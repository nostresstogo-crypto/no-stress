import { Router, type IRouter } from "express";
import {
  sendPartnerRegistrationEmailToPartner,
  sendPartnerRegistrationEmailToAdmin,
  sendPartnerApprovalEmail,
  sendPartnerRejectionEmail,
  sendPublicationWarningEmail,
  sendAccountDeletedEmail,
} from "../email.js";
import { requireAdmin } from "./admin.js";

const router: IRouter = Router();

const partners: any[] = [];

let nextId = 1;

const partnerEvents: any[] = [];

let nextEventId = 1;

const registrationLog: any[] = [];

router.get("/partners", (req, res) => {
  const { status } = req.query;
  if (status) {
    return res.json(partners.filter((p) => p.status === status));
  }
  res.json(partners);
});

router.get("/partners/status", (req, res) => {
  const { email } = req.query;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email requis." });
  }
  const partner = partners.find((p) => p.email === email);
  if (!partner) {
    return res.status(404).json({ error: "Partenaire introuvable." });
  }
  res.json({
    status: partner.status,
    rejectionReason: partner.rejectionReason ?? null,
    businessName: partner.businessName,
    partnerId: partner.id,
  });
});

router.get("/partners/approved-map", (_req, res) => {
  const approved = partners.filter((p) => p.status === "approved" && p.latitude && p.longitude);
  res.json(approved.map((p) => ({
    id: p.id,
    businessName: p.businessName,
    businessType: p.businessType,
    city: p.city,
    latitude: p.latitude,
    longitude: p.longitude,
    description: p.description,
    websiteUrl: p.websiteUrl,
    phone: p.phone,
  })));
});

router.post("/partners/register", (req, res) => {
  const { email, contactName, businessName, businessType, phone, city, description, websiteUrl, latitude, longitude } = req.body;
  if (!email || !contactName || !businessName || !businessType || !phone || !city) {
    return res.status(400).json({ error: "Tous les champs obligatoires doivent être remplis." });
  }
  const existing = partners.find((p) => p.email === email);
  if (existing) {
    return res.status(409).json({ error: "Une demande avec cet email existe déjà." });
  }
  const partner = {
    id: `p${nextId++}`,
    email,
    contactName,
    businessName,
    businessType,
    phone,
    city,
    latitude: latitude ? parseFloat(latitude) : null,
    longitude: longitude ? parseFloat(longitude) : null,
    description: description || null,
    websiteUrl: websiteUrl || null,
    status: "pending",
    rejectionReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  partners.push(partner);
  registrationLog.push({ type: "partner", date: new Date().toISOString() });
  res.status(201).json({ message: "Demande d'inscription soumise avec succès. Elle sera examinée sous 48h.", partner });
  sendPartnerRegistrationEmailToPartner(email, contactName, businessName).catch(() => {});
  sendPartnerRegistrationEmailToAdmin(email, contactName, businessName, businessType, city, phone).catch(() => {});
});

router.get("/partners/:id", (req, res) => {
  const partner = partners.find((p) => p.id === req.params.id);
  if (!partner) return res.status(404).json({ error: "Partenaire introuvable." });
  res.json(partner);
});

router.post("/admin/partners/:id/approve", (req, res) => {
  const partner = partners.find((p) => p.id === req.params.id);
  if (!partner) return res.status(404).json({ error: "Partenaire introuvable." });
  partner.status = "approved";
  partner.rejectionReason = null;
  partner.updatedAt = new Date().toISOString();
  res.json({ message: "Partenaire approuvé avec succès.", partner });
  sendPartnerApprovalEmail(partner.email, partner.contactName, partner.businessName).catch(() => {});
});

router.post("/admin/partners/:id/reject", (req, res) => {
  const partner = partners.find((p) => p.id === req.params.id);
  if (!partner) return res.status(404).json({ error: "Partenaire introuvable." });
  const { reason } = req.body;
  const rejectionReason = reason || "Demande rejetée par l'administrateur.";
  partner.status = "rejected";
  partner.rejectionReason = rejectionReason;
  partner.updatedAt = new Date().toISOString();
  res.json({ message: "Partenaire rejeté.", partner });
  sendPartnerRejectionEmail(partner.email, partner.contactName, partner.businessName, rejectionReason).catch(() => {});
});

router.get("/admin/events", (_req, res) => {
  res.json(partnerEvents);
});

router.delete("/admin/events/:id", requireAdmin, (req: any, res) => {
  const idx = partnerEvents.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Publication introuvable." });
  const { reason } = req.body || {};
  const deleteReason = reason || "Publication non conforme aux Conditions Générales d'Utilisation.";
  const [deleted] = partnerEvents.splice(idx, 1);
  const partner = partners.find((p) => p.id === deleted.partnerId);
  const autoMessage = `Bonjour ${partner?.businessName ?? "Partenaire"},\n\nNous avons supprimé votre publication "${deleted.title}" car elle ne respecte pas nos Conditions Générales d'Utilisation et/ou notre charte éthique.\n\nMotif : ${deleteReason}\n\nNoStress s'engage à offrir un contenu de qualité, sûr et respectueux à tous ses utilisateurs.\n\n⚠️ Avertissement : En cas de récidive, votre compte partenaire pourra être suspendu ou supprimé.\n\nPour toute question, contactez notre équipe à nostresstogo@gmail.com.\n\nCordialement,\nL'équipe NoStress`;
  if (partner?.email) {
    sendPublicationWarningEmail(partner.email, partner.businessName, deleted.title, deleteReason).catch(() => {});
  }
  res.json({ message: "Publication supprimée et avertissement envoyé au partenaire.", notification: autoMessage, deleted });
});

router.delete("/admin/partners/:id", requireAdmin, (req: any, res) => {
  const idx = partners.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Partenaire introuvable." });
  const { reason } = req.body || {};
  const deleteReason = reason || "Compte jugé frauduleux ou non conforme.";
  const [deleted] = partners.splice(idx, 1);
  const eventsRemoved = partnerEvents.filter((e) => e.partnerId === deleted.id).length;
  for (let i = partnerEvents.length - 1; i >= 0; i--) {
    if (partnerEvents[i].partnerId === deleted.id) partnerEvents.splice(i, 1);
  }
  sendAccountDeletedEmail(deleted.email, deleted.contactName || deleted.businessName, deleteReason).catch(() => {});
  res.json({ message: `Compte partenaire supprimé. ${eventsRemoved} publication(s) retirée(s). Email d'avertissement envoyé.`, deleted });
});

router.get("/admin/registrations/stats", (req, res) => {
  const { period } = req.query;
  const now = Date.now();
  let since: number;
  if (period === "day") since = now - 24 * 60 * 60 * 1000;
  else if (period === "week") since = now - 7 * 24 * 60 * 60 * 1000;
  else if (period === "month") since = now - 30 * 24 * 60 * 60 * 1000;
  else since = now - 365 * 24 * 60 * 60 * 1000;

  const filtered = registrationLog.filter((r) => new Date(r.date).getTime() >= since);
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

export { partners, partnerEvents, registrationLog };
export default router;
