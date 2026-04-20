import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, partnersTable } from "@workspace/db";
import { sendWelcomeEmail, sendAccountDeletedEmail } from "../email.js";
import { requireAdmin } from "./admin.js";

const router: IRouter = Router();

const users: any[] = [];

export { users };

function normEmail(s: string) {
  return String(s || "").trim().toLowerCase();
}
function normPhone(s: string) {
  return String(s || "").replace(/[^0-9+]/g, "");
}

router.post("/auth/login", async (req, res) => {
  const email = normEmail(req.body?.email);
  const { password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const [partner] = await db.select().from(partnersTable).where(eq(partnersTable.email, email));
  if (partner) {
    const token = `mock_token_${Date.now()}`;
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

  let user = users.find((u: any) => u.email === email);
  if (!user) {
    user = {
      id: `u_${Date.now()}`,
      email,
      name: email.split("@")[0],
      role: email.includes("admin") ? "admin" : "user",
      favorites: [],
      createdAt: new Date().toISOString(),
    };
    users.push(user);
  }
  const token = `mock_token_${Date.now()}`;
  res.json({ token, user });
});

router.post("/auth/register", async (req, res) => {
  const email = normEmail(req.body?.email);
  const phone = normPhone(req.body?.phone);
  const { password, name, country } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Email, password, and name are required" });
  }
  const existingUser = users.find((u: any) => u.email === email || (phone && u.phone && normPhone(u.phone) === phone));
  if (existingUser) {
    return res.status(409).json({ error: "Un compte existe déjà avec cet email ou numéro." });
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
  const user = {
    id: `u_${Date.now()}`,
    email,
    name,
    phone,
    country: country || null,
    role: "user",
    favorites: [],
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  const token = `mock_token_${Date.now()}`;
  res.status(201).json({ token, user });
  sendWelcomeEmail(email, name).catch(() => {});
});

router.delete("/admin/users/:id", requireAdmin, (req: any, res) => {
  const idx = users.findIndex((u: any) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Utilisateur introuvable." });
  const { reason } = req.body || {};
  const deleteReason = reason || "Compte jugé frauduleux ou non conforme.";
  const [deleted] = users.splice(idx, 1);
  sendAccountDeletedEmail(deleted.email, deleted.name, deleteReason).catch(() => {});
  res.json({ message: "Compte utilisateur supprimé. Email d'avertissement envoyé.", deleted });
});

export default router;
