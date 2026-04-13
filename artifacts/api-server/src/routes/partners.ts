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
    description: "Bar lounge spécialisé dans les soirées afrobeats et jazz.",
    websiteUrl: "https://afrolounge.tg",
    status: "pending",
    rejectionReason: null,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

let nextId = partners.length + 1;

router.get("/partners", (req, res) => {
  const { status } = req.query;
  if (status) {
    return res.json(partners.filter((p) => p.status === status));
  }
  res.json(partners);
});

router.post("/partners/register", (req, res) => {
  const { email, contactName, businessName, businessType, phone, city, description, websiteUrl } = req.body;
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
    description: description || null,
    websiteUrl: websiteUrl || null,
    status: "pending",
    rejectionReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  partners.push(partner);
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

export default router;
