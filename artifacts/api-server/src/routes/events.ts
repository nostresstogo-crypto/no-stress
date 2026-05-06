import { Router, type IRouter } from "express";
import { eq, and, ilike, gte, lt } from "drizzle-orm";
import { db, eventsTable, venuesTable } from "@workspace/db";
import { requireAuth } from "../lib/auth-utils.js";
import { requireAdmin } from "./admin.js";
import { notifyEventApproved } from "../lib/pushNotifications.js";

const router: IRouter = Router();

function serialize(e: any) {
  if (!e) return e;
  const images = Array.isArray(e.images) ? e.images : [];
  const imageUrl = e.imageUrl || (images.length > 0 ? images[0] : null);
  return {
    ...e,
    id: String(e.id),
    partnerId: e.partnerId != null ? String(e.partnerId) : null,
    venueId: e.venueId != null ? String(e.venueId) : null,
    images,
    imageUrl,
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

const ARCHIVE_AFTER_DAYS = 30;

function archiveCutoffDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - ARCHIVE_AFTER_DAYS);
  return d.toISOString().slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function partnerIdFromAuth(auth: any): number | null {
  if (!auth?.sub || typeof auth.sub !== "string" || !auth.sub.startsWith("p_")) return null;
  const id = parseInt(auth.sub.slice(2), 10);
  return Number.isFinite(id) ? id : null;
}

// ── Public read ────────────────────────────────────────────────────────────
router.get("/events", async (req, res) => {
  const { city, category, partnerId, includeArchived, archivedOnly, page = 1, limit = 20 } = req.query;
  // Public listing: ALWAYS approved-only. Partners use /partners/me/events for their own listing.
  const conds: any[] = [eq(eventsTable.status, "approved")];
  if (partnerId) {
    const pid = parseInt(String(partnerId), 10);
    if (Number.isFinite(pid)) conds.push(eq(eventsTable.partnerId, pid));
  }
  if (city) conds.push(ilike(eventsTable.city, `%${String(city)}%`));
  if (category) conds.push(eq(eventsTable.category, String(category)));
  const cutoff = archiveCutoffDate();
  if (String(archivedOnly) === "1" || String(archivedOnly) === "true") {
    conds.push(lt(eventsTable.date, cutoff));
  } else if (String(includeArchived) !== "1" && String(includeArchived) !== "true") {
    conds.push(gte(eventsTable.date, cutoff));
  }
  const rows = conds.length
    ? await db.select().from(eventsTable).where(and(...conds))
    : await db.select().from(eventsTable);
  res.json({ events: rows.map(serialize), total: rows.length, page: Number(page), limit: Number(limit) });
});

router.get("/events/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Événement introuvable." });
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
  if (!event) return res.status(404).json({ error: "Événement introuvable." });
  // Only approved events are publicly visible. Owners read their own via /partners/me/events.
  if (event.status !== "approved") {
    return res.status(404).json({ error: "Événement introuvable." });
  }
  res.json(serialize(event));
});

// ── Partner-owned events ─────────────────────────────────────────────────
router.get("/partners/me/events", requireAuth, async (req: any, res) => {
  const partnerId = partnerIdFromAuth(req.auth);
  if (!partnerId) return res.status(403).json({ error: "Réservé aux comptes partenaires." });
  const { status } = req.query;
  const conds: any[] = [eq(eventsTable.partnerId, partnerId)];
  if (status) conds.push(eq(eventsTable.status, String(status)));
  const rows = await db.select().from(eventsTable).where(and(...conds));
  res.json({ events: rows.map(serialize), total: rows.length });
});

router.post("/partners/me/events", requireAuth, async (req: any, res) => {
  const partnerId = partnerIdFromAuth(req.auth);
  if (!partnerId) return res.status(403).json({ error: "Réservé aux comptes partenaires." });
  const {
    title, titleFr, description, descriptionFr, date, time, city, category,
    imageUrl, images, price, currency, latitude, longitude, ticketTypes, venueId,
  } = req.body || {};
  if (!title || !date) {
    return res.status(400).json({ error: "Le titre et la date sont obligatoires." });
  }
  if (date < todayISO()) {
    return res.status(400).json({ error: "La date doit être dans le futur." });
  }
  if (!venueId) {
    return res.status(400).json({ error: "Vous devez choisir un lieu approuvé pour cet événement." });
  }
  const venueIdNum = parseInt(String(venueId), 10);
  if (!Number.isFinite(venueIdNum)) {
    return res.status(400).json({ error: "Lieu invalide." });
  }
  const [venue] = await db.select().from(venuesTable).where(eq(venuesTable.id, venueIdNum));
  if (!venue || venue.partnerId !== partnerId) {
    return res.status(403).json({ error: "Ce lieu ne vous appartient pas." });
  }
  if (venue.status !== "approved") {
    return res.status(400).json({ error: "Ce lieu n'est pas encore approuvé par l'administrateur." });
  }
  const imgs = normalizeImages(images || (imageUrl ? [imageUrl] : []));
  const [event] = await db
    .insert(eventsTable)
    .values({
      title,
      titleFr: titleFr || null,
      description: description || null,
      descriptionFr: descriptionFr || null,
      date,
      time: time || null,
      venue: venue.name,
      venueId: venueIdNum,
      city: city || venue.city || null,
      category: category || null,
      imageUrl: imgs[0] || imageUrl || null,
      images: imgs,
      price: price != null ? Number(price) : null,
      currency: currency || "FCFA",
      partnerId,
      latitude: latitude != null ? Number(latitude) : (venue.latitude ?? null),
      longitude: longitude != null ? Number(longitude) : (venue.longitude ?? null),
      ticketTypes: ticketTypes ?? null,
      status: "pending",
    })
    .returning();
  res.status(201).json(serialize(event));
});

router.patch("/partners/me/events/:id", requireAuth, async (req: any, res) => {
  const partnerId = partnerIdFromAuth(req.auth);
  if (!partnerId) return res.status(403).json({ error: "Réservé aux comptes partenaires." });
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Événement introuvable." });
  const [existing] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
  if (!existing || existing.partnerId !== partnerId) {
    return res.status(404).json({ error: "Événement introuvable." });
  }
  // Editing/deleting is allowed only while the event is still in the future.
  if (existing.date < todayISO()) {
    return res.status(409).json({ error: "Impossible de modifier un événement passé." });
  }
  const allowed: any = {};
  for (const k of ["title", "titleFr", "description", "descriptionFr", "date", "time", "city", "category", "price", "currency", "ticketTypes", "latitude", "longitude"]) {
    if (k in req.body) allowed[k] = req.body[k];
  }
  if ("date" in allowed && allowed.date < todayISO()) {
    return res.status(400).json({ error: "La nouvelle date doit être dans le futur." });
  }
  // Partner can cancel an event without resubmitting it for moderation.
  const isCancelOnly =
    req.body && req.body.status === "cancelled" &&
    Object.keys(req.body).every((k) => k === "status");
  if (isCancelOnly) {
    const [event] = await db.update(eventsTable).set({ status: "cancelled" }).where(eq(eventsTable.id, id)).returning();
    return res.json(serialize(event));
  }
  if ("venueId" in req.body) {
    const vid = req.body.venueId ? parseInt(String(req.body.venueId), 10) : null;
    if (vid != null) {
      const [v] = await db.select().from(venuesTable).where(eq(venuesTable.id, vid));
      if (!v || v.partnerId !== partnerId) return res.status(403).json({ error: "Ce lieu ne vous appartient pas." });
      if (v.status !== "approved") return res.status(400).json({ error: "Ce lieu n'est pas approuvé." });
      allowed.venueId = vid;
      allowed.venue = v.name;
      if (!("city" in allowed) && v.city) allowed.city = v.city;
    }
  }
  if ("images" in req.body || "imageUrl" in req.body) {
    const imgs = normalizeImages(req.body.images || (req.body.imageUrl ? [req.body.imageUrl] : []));
    allowed.images = imgs;
    allowed.imageUrl = imgs[0] || null;
  }
  // Re-edited event goes back to moderation.
  allowed.status = "pending";
  const [event] = await db.update(eventsTable).set(allowed).where(eq(eventsTable.id, id)).returning();
  res.json(serialize(event));
});

router.delete("/partners/me/events/:id", requireAuth, async (req: any, res) => {
  const partnerId = partnerIdFromAuth(req.auth);
  if (!partnerId) return res.status(403).json({ error: "Réservé aux comptes partenaires." });
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Événement introuvable." });
  const [existing] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
  if (!existing || existing.partnerId !== partnerId) {
    return res.status(404).json({ error: "Événement introuvable." });
  }
  if (existing.date < todayISO()) {
    return res.status(409).json({ error: "Impossible de supprimer un événement passé." });
  }
  await db.update(eventsTable).set({ status: "archived" }).where(eq(eventsTable.id, id));
  res.json({ success: true });
});

// ── Admin moderation ──────────────────────────────────────────────────────
router.post("/admin/events/:id/approve", requireAdmin, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Événement introuvable." });
  const [event] = await db.update(eventsTable).set({ status: "approved" }).where(eq(eventsTable.id, id)).returning();
  if (!event) return res.status(404).json({ error: "Événement introuvable." });
  notifyEventApproved(event.id).catch((e) => console.error("[push] notify failed", e));
  res.json(serialize(event));
});

router.post("/admin/events/:id/reject", requireAdmin, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Événement introuvable." });
  const [event] = await db.update(eventsTable).set({ status: "rejected" }).where(eq(eventsTable.id, id)).returning();
  if (!event) return res.status(404).json({ error: "Événement introuvable." });
  res.json(serialize(event));
});

export default router;
