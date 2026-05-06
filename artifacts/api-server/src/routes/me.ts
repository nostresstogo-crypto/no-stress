import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  usersTable,
  partnersTable,
  favoritesTable,
  eventsTable,
  venuesTable,
} from "@workspace/db";
import {
  requireAuth,
  hashPassword,
  verifyPassword,
  revokeAllForSubject,
} from "../lib/auth-utils.js";

const router: IRouter = Router();

function userIdFromAuth(auth: any): number | null {
  const sub: string = auth?.sub || "";
  if (!sub.startsWith("u_")) return null;
  const id = parseInt(sub.slice(2), 10);
  return Number.isFinite(id) ? id : null;
}

function partnerIdFromAuth(auth: any): number | null {
  const sub: string = auth?.sub || "";
  if (!sub.startsWith("p_")) return null;
  const id = parseInt(sub.slice(2), 10);
  return Number.isFinite(id) ? id : null;
}

function publicUser(u: typeof usersTable.$inferSelect) {
  return {
    id: String(u.id),
    email: u.email,
    name: u.name,
    phone: u.phone,
    country: u.country,
    role: u.role,
    profileImage: u.profileImage ?? null,
    emailVerified: !!u.emailVerified,
  };
}

function publicPartner(p: typeof partnersTable.$inferSelect) {
  return {
    id: String(p.id),
    email: p.email,
    contactName: p.contactName,
    businessName: p.businessName,
    businessType: p.businessType,
    phone: p.phone,
    city: p.city,
    description: p.description ?? null,
    websiteUrl: p.websiteUrl ?? null,
    latitude: p.latitude,
    longitude: p.longitude,
    status: p.status,
    rejectionReason: p.rejectionReason ?? null,
    profileImage: p.profileImage ?? null,
    emailVerified: !!p.emailVerified,
  };
}

// ── User profile ────────────────────────────────────────────────────────────
router.patch("/users/me", requireAuth, async (req: any, res) => {
  const id = userIdFromAuth(req.auth);
  if (id == null) return res.status(403).json({ error: "Réservé aux utilisateurs." });
  const allowed: any = {};
  for (const k of ["name", "phone", "country", "profileImage"]) {
    if (k in req.body) {
      const v = req.body[k];
      allowed[k] = typeof v === "string" ? v.trim() || null : v;
    }
  }
  if ("name" in allowed && (!allowed.name || allowed.name.length < 2)) {
    return res.status(400).json({ error: "Le nom doit contenir au moins 2 caractères." });
  }
  if (Object.keys(allowed).length === 0) {
    return res.status(400).json({ error: "Aucun champ à mettre à jour." });
  }
  const [updated] = await db
    .update(usersTable)
    .set(allowed)
    .where(eq(usersTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Compte introuvable." });
  res.json({ user: publicUser(updated) });
});

router.post("/users/me/change-password", requireAuth, async (req: any, res) => {
  const id = userIdFromAuth(req.auth);
  if (id == null) return res.status(403).json({ error: "Réservé aux utilisateurs." });
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return res.status(400).json({ error: "Mot de passe actuel et nouveau requis." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "Le nouveau mot de passe doit faire au moins 8 caractères." });
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) return res.status(404).json({ error: "Compte introuvable." });
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Mot de passe actuel incorrect." });
  const newHash = await hashPassword(newPassword);
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, id));
  // Invalidate all other sessions; current refresh token is also revoked, mobile must re-login.
  await revokeAllForSubject(`u_${id}`);
  res.json({ message: "Mot de passe modifié. Reconnectez-vous." });
});

// ── Partner profile ─────────────────────────────────────────────────────────
router.patch("/partners/me", requireAuth, async (req: any, res) => {
  const id = partnerIdFromAuth(req.auth);
  if (id == null) return res.status(403).json({ error: "Réservé aux partenaires." });
  const allowed: any = {};
  for (const k of ["contactName", "businessName", "businessType", "phone", "city", "description", "websiteUrl", "profileImage"]) {
    if (k in req.body) {
      const v = req.body[k];
      allowed[k] = typeof v === "string" ? v.trim() || null : v;
    }
  }
  if ("contactName" in allowed && !allowed.contactName) {
    return res.status(400).json({ error: "Nom du contact requis." });
  }
  if ("businessName" in allowed && !allowed.businessName) {
    return res.status(400).json({ error: "Nom de la structure requis." });
  }
  if (Object.keys(allowed).length === 0) {
    return res.status(400).json({ error: "Aucun champ à mettre à jour." });
  }
  allowed.updatedAt = new Date();
  const [updated] = await db
    .update(partnersTable)
    .set(allowed)
    .where(eq(partnersTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Compte introuvable." });
  res.json({ partner: publicPartner(updated) });
});

router.post("/partners/me/change-password", requireAuth, async (req: any, res) => {
  const id = partnerIdFromAuth(req.auth);
  if (id == null) return res.status(403).json({ error: "Réservé aux partenaires." });
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return res.status(400).json({ error: "Mot de passe actuel et nouveau requis." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "Le nouveau mot de passe doit faire au moins 8 caractères." });
  }
  const [partner] = await db.select().from(partnersTable).where(eq(partnersTable.id, id));
  if (!partner) return res.status(404).json({ error: "Compte introuvable." });
  if (!partner.passwordHash) return res.status(400).json({ error: "Mot de passe non défini." });
  const ok = await verifyPassword(currentPassword, partner.passwordHash);
  if (!ok) return res.status(401).json({ error: "Mot de passe actuel incorrect." });
  const newHash = await hashPassword(newPassword);
  await db
    .update(partnersTable)
    .set({ passwordHash: newHash, updatedAt: new Date() })
    .where(eq(partnersTable.id, id));
  await revokeAllForSubject(`p_${id}`);
  res.json({ message: "Mot de passe modifié. Reconnectez-vous." });
});

// ── Favorites (user-only) ───────────────────────────────────────────────────
function parseItem(body: any): { itemType: "event" | "venue"; itemId: number } | null {
  const itemType = String(body?.itemType || "");
  const itemId = parseInt(String(body?.itemId), 10);
  if ((itemType !== "event" && itemType !== "venue") || !Number.isFinite(itemId)) {
    return null;
  }
  return { itemType, itemId };
}

router.get("/me/favorites", requireAuth, async (req: any, res) => {
  const id = userIdFromAuth(req.auth);
  if (id == null) return res.status(403).json({ error: "Réservé aux utilisateurs." });
  const rows = await db.select().from(favoritesTable).where(eq(favoritesTable.userId, id));
  const events = rows.filter((r) => r.itemType === "event").map((r) => String(r.itemId));
  const venues = rows.filter((r) => r.itemType === "venue").map((r) => String(r.itemId));
  res.json({ events, venues });
});

router.post("/me/favorites", requireAuth, async (req: any, res) => {
  const id = userIdFromAuth(req.auth);
  if (id == null) return res.status(403).json({ error: "Réservé aux utilisateurs." });
  const item = parseItem(req.body);
  if (!item) return res.status(400).json({ error: "Type ou identifiant invalide." });
  // Verify the target exists and is publicly visible (approved).
  if (item.itemType === "event") {
    const [e] = await db.select({ id: eventsTable.id, status: eventsTable.status }).from(eventsTable).where(eq(eventsTable.id, item.itemId));
    if (!e || e.status !== "approved") return res.status(404).json({ error: "Événement introuvable." });
  } else {
    const [v] = await db.select({ id: venuesTable.id, status: venuesTable.status }).from(venuesTable).where(eq(venuesTable.id, item.itemId));
    if (!v || v.status !== "approved") return res.status(404).json({ error: "Lieu introuvable." });
  }
  // Idempotent thanks to unique index on (user_id,item_type,item_id).
  await db
    .insert(favoritesTable)
    .values({ userId: id, itemType: item.itemType, itemId: item.itemId })
    .onConflictDoNothing();
  res.json({ ok: true });
});

router.delete("/me/favorites", requireAuth, async (req: any, res) => {
  const id = userIdFromAuth(req.auth);
  if (id == null) return res.status(403).json({ error: "Réservé aux utilisateurs." });
  const itemType = String(req.query.itemType || req.body?.itemType || "");
  const itemId = parseInt(String(req.query.itemId ?? req.body?.itemId), 10);
  if ((itemType !== "event" && itemType !== "venue") || !Number.isFinite(itemId)) {
    return res.status(400).json({ error: "Type ou identifiant invalide." });
  }
  await db
    .delete(favoritesTable)
    .where(and(
      eq(favoritesTable.userId, id),
      eq(favoritesTable.itemType, itemType),
      eq(favoritesTable.itemId, itemId),
    ));
  res.json({ ok: true });
});

export default router;
