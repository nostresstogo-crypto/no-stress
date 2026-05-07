import { Router, type IRouter } from "express";
import { eq, and, ilike, gte, lt, desc } from "drizzle-orm";
import { db, eventsTable, venuesTable, partnersTable } from "@workspace/db";
import { sendNewEventAdminNotification } from "../email.js";
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
    .slice(0, 3);
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
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

router.get("/events", async (req, res) => {
  const { city, country, category, partnerId, includeArchived, archivedOnly, page = 1, limit = 20, lat, lng, radiusKm } = req.query;
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
  let rows = conds.length
    ? await db.select().from(eventsTable).where(and(...conds)).orderBy(desc(eventsTable.createdAt))
    : await db.select().from(eventsTable).orderBy(desc(eventsTable.createdAt));

  // Country & distance via venue lookup (events store city only)
  const wantCountry = country ? String(country).toLowerCase() : "";
  const latNum = parseFloat(String(lat));
  const lngNum = parseFloat(String(lng));
  const radius = parseFloat(String(radiusKm));
  const wantDistance = Number.isFinite(latNum) && Number.isFinite(lngNum) && Number.isFinite(radius) && radius > 0;

  if (wantCountry || wantDistance) {
    const venueIds = Array.from(new Set(rows.map((r: any) => r.venueId).filter((v: any) => v != null)));
    let venueMap = new Map<number, { latitude: number | null; longitude: number | null; country: string | null }>();
    if (venueIds.length) {
      const venues = await db.select().from(venuesTable);
      for (const v of venues) venueMap.set(v.id, { latitude: v.latitude, longitude: v.longitude, country: v.country });
    }
    rows = rows.filter((r: any) => {
      const v = r.venueId != null ? venueMap.get(r.venueId) : null;
      if (wantCountry) {
        if (!v || !v.country || !v.country.toLowerCase().includes(wantCountry)) return false;
      }
      if (wantDistance) {
        if (!v || v.latitude == null || v.longitude == null) return false;
        if (haversineKm(latNum, lngNum, v.latitude, v.longitude) > radius) return false;
      }
      return true;
    });
  }

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
  if (imgs.length === 0) {
    return res.status(400).json({ error: "Au moins une photo de l'événement est obligatoire (jusqu'à 3 photos)." });
  }
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
      imageUrl: imgs[0],
      images: imgs,
      price: price != null ? Number(price) : null,
      currency: currency || "FCFA",
      partnerId,
      latitude: latitude != null ? Number(latitude) : (venue.latitude ?? null),
      longitude: longitude != null ? Number(longitude) : (venue.longitude ?? null),
      ticketTypes: ticketTypes ?? null,
      status: "approved",
    })
    .returning();
  res.status(201).json(serialize(event));

  // Notify admin about the auto-approved event (best-effort, after response)
  db.select().from(partnersTable).where(eq(partnersTable.id, partnerId)).then(([p]) => {
    if (p) sendNewEventAdminNotification(event, venue, p).catch(() => {});
  }).catch(() => {});
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
    if (imgs.length === 0) {
      return res.status(400).json({ error: "Au moins une photo de l'événement est obligatoire." });
    }
    allowed.images = imgs;
    allowed.imageUrl = imgs[0];
  }
  // Auto-approbation : les événements édités restent visibles immédiatement.
  allowed.status = "approved";
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
