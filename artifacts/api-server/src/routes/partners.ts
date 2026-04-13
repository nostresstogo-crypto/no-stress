import { Router, type IRouter } from "express";

const router: IRouter = Router();

const partners: any[] = [
  {
    id: "p1",
    email: "contact@elephantblanc.tg",
    contactName: "Kofi Mensah",
    businessName: "Club Éléphant Blanc",
    businessType: "nightclub",
    phone: "+228 90 12 34 56",
    city: "Lomé",
    latitude: 6.1374,
    longitude: 1.2123,
    description: "Le club le plus populaire de Lomé avec une capacité de 500 personnes.",
    websiteUrl: "https://elephantblanc.tg",
    status: "pending",
    rejectionReason: null,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "p2",
    email: "info@festivalvibe.tg",
    contactName: "Ama Aku",
    businessName: "Festival Vibe Productions",
    businessType: "festival",
    phone: "+228 92 45 67 89",
    city: "Lomé",
    latitude: 6.1425,
    longitude: 1.2210,
    description: "Organisateur de festivals et concerts à grande échelle au Togo.",
    websiteUrl: null,
    status: "approved",
    rejectionReason: null,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "p3",
    email: "events@kpalimefest.tg",
    contactName: "Yaw Asante",
    businessName: "Kpalimé Fest",
    businessType: "festival",
    phone: "+228 98 76 54 32",
    city: "Kpalimé",
    latitude: 6.9004,
    longitude: 0.6237,
    description: "Festival culturel annuel à Kpalimé.",
    websiteUrl: null,
    status: "rejected",
    rejectionReason: "Documents incomplets. Veuillez fournir vos pièces justificatives d'entreprise.",
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "p4",
    email: "booking@afrolounge.tg",
    contactName: "Sénamé Agbo",
    businessName: "Afro Lounge Togo",
    businessType: "bar",
    phone: "+228 91 23 45 67",
    city: "Lomé",
    latitude: 6.1320,
    longitude: 1.2060,
    description: "Bar lounge spécialisé dans les soirées afrobeats et jazz.",
    websiteUrl: "https://afrolounge.tg",
    status: "pending",
    rejectionReason: null,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "p5",
    email: "contact@karabeats.tg",
    contactName: "Edem Kokou",
    businessName: "Kara Beats Club",
    businessType: "nightclub",
    phone: "+228 93 11 22 33",
    city: "Kara",
    latitude: 9.5511,
    longitude: 1.1811,
    description: "La meilleure boîte de nuit du nord du Togo, soirées afro et dancehall.",
    websiteUrl: null,
    status: "approved",
    rejectionReason: null,
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

let nextId = partners.length + 1;

const partnerEvents: any[] = [
  {
    id: "pe1",
    partnerId: "p2",
    partnerName: "Festival Vibe Productions",
    title: "Nuit Afrobeats Lomé",
    description: "La plus grande fête afrobeats de l'année avec les meilleurs DJs togolais.",
    date: "2026-05-15",
    time: "22:00",
    city: "Lomé",
    category: "nightclubs",
    priceFCFA: 5000,
    isFree: false,
    status: "approved",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "pe2",
    partnerId: "p5",
    partnerName: "Kara Beats Club",
    title: "Soirée Dancehall Kara",
    description: "Soirée exclusive dancehall et reggae au coeur de Kara.",
    date: "2026-04-20",
    time: "21:00",
    city: "Kara",
    category: "nightclubs",
    priceFCFA: 3000,
    isFree: false,
    status: "approved",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "pe3",
    partnerId: "p2",
    partnerName: "Festival Vibe Productions",
    title: "Concert Jazz & Blues",
    description: "Soirée jazz et blues avec des artistes locaux et internationaux. Contenu inapproprié signalé.",
    date: "2026-04-25",
    time: "20:00",
    city: "Lomé",
    category: "concerts",
    priceFCFA: 8000,
    isFree: false,
    status: "pending",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

let nextEventId = partnerEvents.length + 1;

const registrationLog: any[] = [
  ...Array.from({ length: 12 }, (_, i) => ({
    type: "partner",
    date: new Date(Date.now() - i * 3 * 24 * 60 * 60 * 1000).toISOString(),
  })),
  ...Array.from({ length: 28 }, (_, i) => ({
    type: "client",
    date: new Date(Date.now() - i * 1.2 * 24 * 60 * 60 * 1000).toISOString(),
  })),
];

router.get("/partners", (req, res) => {
  const { status } = req.query;
  if (status) {
    return res.json(partners.filter((p) => p.status === status));
  }
  res.json(partners);
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
});

router.post("/admin/partners/:id/reject", (req, res) => {
  const partner = partners.find((p) => p.id === req.params.id);
  if (!partner) return res.status(404).json({ error: "Partenaire introuvable." });
  const { reason } = req.body;
  partner.status = "rejected";
  partner.rejectionReason = reason || "Demande rejetée par l'administrateur.";
  partner.updatedAt = new Date().toISOString();
  res.json({ message: "Partenaire rejeté.", partner });
});

router.get("/admin/events", (_req, res) => {
  res.json(partnerEvents);
});

router.delete("/admin/events/:id", (req, res) => {
  const idx = partnerEvents.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Publication introuvable." });
  const [deleted] = partnerEvents.splice(idx, 1);
  const partner = partners.find((p) => p.id === deleted.partnerId);
  const autoMessage = `Bonjour ${partner?.businessName ?? "Partenaire"},\n\nNous avons supprimé votre publication "${deleted.title}" car elle ne respecte pas nos Conditions Générales d'Utilisation et/ou notre charte éthique.\n\nNoStress s'engage à offrir un contenu de qualité, sûr et respectueux à tous ses utilisateurs.\n\nPour toute question, contactez notre équipe à support@nostress.tg.\n\nCordialement,\nL'équipe NoStress`;
  res.json({ message: "Publication supprimée et notification envoyée.", notification: autoMessage, deleted });
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
