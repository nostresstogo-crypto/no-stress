import { Router, type IRouter } from "express";
import { eq, and, ilike, gte } from "drizzle-orm";
import { db, venuesTable, eventsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth-utils.js";
import { requireAdmin } from "./admin.js";

const router: IRouter = Router();

function serialize(v: any) {
  if (!v) return v;
  const images = Array.isArray(v.images) ? v.images : [];
  const imageUrl = v.imageUrl || (images.length > 0 ? images[0] : null);
  return {
    ...v,
    id: String(v.id),
    partnerId: v.partnerId != null ? String(v.partnerId) : null,
    images,
    imageUrl,
    status: v.status || "pending",
    rejectionReason: v.rejectionReason ?? null,
  };
}

function normalizeImages(input: any): string[] {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : [input];
  return arr
    .filter((x) => typeof x === "string" && x.trim().length > 0)
    .map((x) => String(x).trim())
    .slice(0, 4);
}

function partnerIdFromAuth(auth: any): number | null {
  if (!auth?.sub || typeof auth.sub !== "string") return null;
  if (!auth.sub.startsWith("p_")) return null;
  const id = parseInt(auth.sub.slice(2), 10);
  return Number.isFinite(id) ? id : null;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Public ─────────────────────────────────────────────────────────────────
// Only approved venues are exposed publicly.
router.get("/venues", async (req, res) => {
  const { city, type } = req.query;
  const conds: any[] = [eq(venuesTable.status, "approved")];
  if (city) conds.push(ilike(venuesTable.city, `%${String(city)}%`));
  if (type) conds.push(eq(venuesTable.type, String(type)));
  const rows = await db.select().from(venuesTable).where(and(...conds));
  res.json({ venues: rows.map(serialize), total: rows.length });
});

router.get("/venues/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Lieu introuvable." });
  const [v] = await db.select().from(venuesTable).where(eq(venuesTable.id, id));
  if (!v || v.status !== "approved") return res.status(404).json({ error: "Lieu introuvable." });
  res.json(serialize(v));
});

// ── Partner-owned venues (auth required) ───────────────────────────────────
router.get("/partners/me/venues", requireAuth, async (req: any, res) => {
  const partnerId = partnerIdFromAuth(req.auth);
  if (!partnerId) return res.status(403).json({ error: "Réservé aux comptes partenaires." });
  const { status } = req.query;
  const conds: any[] = [eq(venuesTable.partnerId, partnerId)];
  if (status) conds.push(eq(venuesTable.status, String(status)));
  const rows = await db.select().from(venuesTable).where(and(...conds));
  res.json({ venues: rows.map(serialize), total: rows.length });
});

router.post("/partners/me/venues", requireAuth, async (req: any, res) => {
  const partnerId = partnerIdFromAuth(req.auth);
  if (!partnerId) return res.status(403).json({ error: "Réservé aux comptes partenaires." });
  const { name, type, city, country, address, description, imageUrl, images, latitude, longitude } = req.body || {};
  if (!name || !city) {
    return res.status(400).json({ error: "Le nom et la ville sont obligatoires." });
  }
  const imgs = normalizeImages(images || (imageUrl ? [imageUrl] : []));
  const [v] = await db
    .insert(venuesTable)
    .values({
      name: String(name).trim(),
      type: type || null,
      city: String(city).trim(),
      country: country || null,
      address: address || null,
      description: description || null,
      imageUrl: imgs[0] || imageUrl || null,
      images: imgs,
      latitude: latitude != null ? Number(latitude) : null,
      longitude: longitude != null ? Number(longitude) : null,
      partnerId,
      status: "pending",
    })
    .returning();
  res.status(201).json(serialize(v));
});

router.patch("/partners/me/venues/:id", requireAuth, async (req: any, res) => {
  const partnerId = partnerIdFromAuth(req.auth);
  if (!partnerId) return res.status(403).json({ error: "Réservé aux comptes partenaires." });
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Lieu introuvable." });
  const [existing] = await db.select().from(venuesTable).where(eq(venuesTable.id, id));
  if (!existing || existing.partnerId !== partnerId) {
    return res.status(404).json({ error: "Lieu introuvable." });
  }
  const allowed: any = {};
  for (const k of ["name", "type", "city", "country", "address", "description"]) {
    if (k in req.body) allowed[k] = req.body[k];
  }
  if ("images" in req.body || "imageUrl" in req.body) {
    const imgs = normalizeImages(req.body.images || (req.body.imageUrl ? [req.body.imageUrl] : []));
    allowed.images = imgs;
    allowed.imageUrl = imgs[0] || null;
  }
  // Editing core info resets status to pending so admin re-validates.
  if (Object.keys(allowed).length > 0 && existing.status === "approved") {
    allowed.status = "pending";
    allowed.rejectionReason = null;
  }
  const [v] = await db.update(venuesTable).set(allowed).where(eq(venuesTable.id, id)).returning();
  res.json(serialize(v));
});

router.patch("/partners/me/venues/:id/location", requireAuth, async (req: any, res) => {
  const partnerId = partnerIdFromAuth(req.auth);
  if (!partnerId) return res.status(403).json({ error: "Réservé aux comptes partenaires." });
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Lieu introuvable." });
  const lat = Number(req.body?.latitude);
  const lng = Number(req.body?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: "Coordonnées GPS invalides." });
  }
  const [existing] = await db.select().from(venuesTable).where(eq(venuesTable.id, id));
  if (!existing || existing.partnerId !== partnerId) {
    return res.status(404).json({ error: "Lieu introuvable." });
  }
  const [v] = await db
    .update(venuesTable)
    .set({ latitude: lat, longitude: lng })
    .where(eq(venuesTable.id, id))
    .returning();
  res.json(serialize(v));
});

router.delete("/partners/me/venues/:id", requireAuth, async (req: any, res) => {
  const partnerId = partnerIdFromAuth(req.auth);
  if (!partnerId) return res.status(403).json({ error: "Réservé aux comptes partenaires." });
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Lieu introuvable." });
  const [existing] = await db.select().from(venuesTable).where(eq(venuesTable.id, id));
  if (!existing || existing.partnerId !== partnerId) {
    return res.status(404).json({ error: "Lieu introuvable." });
  }
  // Refuse if a future event is attached to this venue.
  const futureEvents = await db
    .select({ id: eventsTable.id })
    .from(eventsTable)
    .where(and(eq(eventsTable.venueId, id), gte(eventsTable.date, todayISO())));
  if (futureEvents.length > 0) {
    return res.status(409).json({
      error: "Ce lieu héberge encore un ou plusieurs événements à venir. Supprimez ou déplacez-les d'abord.",
      futureEventCount: futureEvents.length,
    });
  }
  await db.delete(venuesTable).where(eq(venuesTable.id, id));
  res.json({ success: true });
});

// ── Admin moderation ──────────────────────────────────────────────────────
router.get("/admin/venues", requireAdmin, async (req: any, res) => {
  const { status } = req.query;
  const rows = status
    ? await db.select().from(venuesTable).where(eq(venuesTable.status, String(status)))
    : await db.select().from(venuesTable);
  res.json({ venues: rows.map(serialize), total: rows.length });
});

router.post("/admin/venues/:id/approve", requireAdmin, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Lieu introuvable." });
  const [v] = await db
    .update(venuesTable)
    .set({ status: "approved", rejectionReason: null })
    .where(eq(venuesTable.id, id))
    .returning();
  if (!v) return res.status(404).json({ error: "Lieu introuvable." });
  res.json(serialize(v));
});

router.post("/admin/venues/:id/reject", requireAdmin, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Lieu introuvable." });
  const reason = String(req.body?.reason || "").trim() || null;
  const [v] = await db
    .update(venuesTable)
    .set({ status: "rejected", rejectionReason: reason })
    .where(eq(venuesTable.id, id))
    .returning();
  if (!v) return res.status(404).json({ error: "Lieu introuvable." });
  res.json(serialize(v));
});

export default router;
