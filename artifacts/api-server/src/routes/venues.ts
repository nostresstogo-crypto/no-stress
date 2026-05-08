import { Router, type IRouter } from "express";
import { eq, and, ilike, gte, desc, inArray } from "drizzle-orm";
import { db, venuesTable, venueSpecialtiesTable, eventsTable, partnersTable } from "@workspace/db";
import { requireAuth } from "../lib/auth-utils.js";
import { requireAdmin } from "./admin.js";
import { ensurePartnerSubscriptionActive, getActivePartnerIds } from "../lib/subscriptions.js";
import {
  sendNewVenueAdminNotification,
  sendVenueApprovedEmail,
  sendVenueRejectedEmail,
} from "../email.js";

const MAX_GALLERY = 3;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function normalizeTime(v: any): string | null {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  return TIME_RE.test(s) ? s : null;
}

function serializeSpecialty(s: any) {
  if (!s) return s;
  return {
    ...s,
    id: String(s.id),
    venueId: String(s.venueId),
    price: s.price ?? null,
    description: s.description ?? null,
  };
}

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
    .slice(0, MAX_GALLERY);
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

router.get("/venues", async (req, res) => {
  const { city, country, type, lat, lng, radiusKm } = req.query;
  const activeIds = await getActivePartnerIds();
  if (activeIds.length === 0) return res.json({ venues: [], total: 0 });
  const conds: any[] = [eq(venuesTable.status, "approved"), inArray(venuesTable.partnerId, activeIds)];
  if (city) conds.push(ilike(venuesTable.city, `%${String(city)}%`));
  if (country) conds.push(ilike(venuesTable.country as any, `%${String(country)}%`));
  if (type) conds.push(eq(venuesTable.type, String(type)));
  let rows = await db.select().from(venuesTable).where(and(...conds)).orderBy(desc(venuesTable.createdAt));

  const latNum = parseFloat(String(lat));
  const lngNum = parseFloat(String(lng));
  const radius = parseFloat(String(radiusKm));
  if (Number.isFinite(latNum) && Number.isFinite(lngNum) && Number.isFinite(radius) && radius > 0) {
    rows = rows.filter((r: any) =>
      r.latitude != null && r.longitude != null &&
      haversineKm(latNum, lngNum, r.latitude, r.longitude) <= radius,
    );
  }

  res.json({ venues: rows.map(serialize), total: rows.length });
});

router.get("/venues/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Lieu introuvable." });
  const [v] = await db.select().from(venuesTable).where(eq(venuesTable.id, id));
  if (!v || v.status !== "approved") return res.status(404).json({ error: "Lieu introuvable." });
  // Hide venues whose owner partner has an inactive subscription.
  if (v.partnerId != null) {
    const [p] = await db.select({ subscriptionUntil: partnersTable.subscriptionUntil, status: partnersTable.status })
      .from(partnersTable).where(eq(partnersTable.id, v.partnerId));
    if (!p || p.status !== "approved" || !p.subscriptionUntil || new Date(p.subscriptionUntil).getTime() <= Date.now()) {
      return res.status(404).json({ error: "Lieu introuvable." });
    }
  }
  const specs = await db.select().from(venueSpecialtiesTable).where(eq(venueSpecialtiesTable.venueId, id));
  res.json({ ...serialize(v), specialties: specs.map(serializeSpecialty) });
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
  if (!(await ensurePartnerSubscriptionActive(partnerId, res))) return;
  const { name, type, city, country, address, description, imageUrl, images, latitude, longitude, openingTime, closingTime } = req.body || {};
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
      imageUrl: imgs[0] ?? null,
      images: imgs.length > 0 ? imgs : null,
      latitude: latitude != null ? Number(latitude) : null,
      longitude: longitude != null ? Number(longitude) : null,
      openingTime: normalizeTime(openingTime),
      closingTime: normalizeTime(closingTime),
      partnerId,
      status: "pending",
    })
    .returning();
  res.status(201).json(serialize(v));

  // Notification admin (best-effort, hors réponse)
  db.select().from(partnersTable).where(eq(partnersTable.id, partnerId)).then(([p]) => {
    if (p) sendNewVenueAdminNotification(v, p).catch(() => {});
  }).catch(() => {});
});

router.patch("/partners/me/venues/:id", requireAuth, async (req: any, res) => {
  const partnerId = partnerIdFromAuth(req.auth);
  if (!partnerId) return res.status(403).json({ error: "Réservé aux comptes partenaires." });
  if (!(await ensurePartnerSubscriptionActive(partnerId, res))) return;
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
  for (const k of ["openingTime", "closingTime"] as const) {
    if (k in req.body) allowed[k] = normalizeTime(req.body[k]);
  }
  if ("images" in req.body || "imageUrl" in req.body) {
    const imgs = normalizeImages(req.body.images || (req.body.imageUrl ? [req.body.imageUrl] : []));
    allowed.images = imgs.length > 0 ? imgs : null;
    allowed.imageUrl = imgs[0] ?? null;
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
  if (!(await ensurePartnerSubscriptionActive(partnerId, res))) return;
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
  // Left-join partner so the admin UI can show the business name (and a contact
  // fallback) rather than a raw numeric ID. Partner may be null for legacy rows.
  const baseQuery = db
    .select({
      v: venuesTable,
      partnerBusinessName: partnersTable.businessName,
      partnerContactName: partnersTable.contactName,
      partnerEmail: partnersTable.email,
    })
    .from(venuesTable)
    .leftJoin(partnersTable, eq(partnersTable.id, venuesTable.partnerId));
  const rows = status
    ? await baseQuery.where(eq(venuesTable.status, String(status)))
    : await baseQuery;
  const venues = rows.map((r: any) => ({
    ...serialize(r.v),
    partnerName: r.partnerBusinessName || r.partnerContactName || null,
    partnerEmail: r.partnerEmail || null,
  }));
  res.json({ venues, total: venues.length });
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
  // Notify partner — fire-and-forget, never block the admin response on SMTP.
  if (v.partnerId != null) {
    db.select({ email: partnersTable.email, contactName: partnersTable.contactName })
      .from(partnersTable)
      .where(eq(partnersTable.id, v.partnerId))
      .then(([p]) => {
        if (p?.email) {
          return sendVenueApprovedEmail(p.email, p.contactName, v.name);
        }
      })
      .catch((err) => console.error("[admin][venue-approve] notify failed:", err));
  }
  res.json(serialize(v));
});

router.post("/admin/venues/:id/reject", requireAdmin, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Lieu introuvable." });
  const reason = String(req.body?.reason || "").trim();
  if (reason.length < 3) {
    return res.status(400).json({ error: "Un motif d'au moins 3 caractères est requis." });
  }
  const [v] = await db
    .update(venuesTable)
    .set({ status: "rejected", rejectionReason: reason })
    .where(eq(venuesTable.id, id))
    .returning();
  if (!v) return res.status(404).json({ error: "Lieu introuvable." });
  if (v.partnerId != null) {
    db.select({ email: partnersTable.email, contactName: partnersTable.contactName })
      .from(partnersTable)
      .where(eq(partnersTable.id, v.partnerId))
      .then(([p]) => {
        if (p?.email) {
          return sendVenueRejectedEmail(p.email, p.contactName, v.name, reason);
        }
      })
      .catch((err) => console.error("[admin][venue-reject] notify failed:", err));
  }
  res.json(serialize(v));
});

// ── Specialties (menu items / signature dishes) ────────────────────────────

async function ownsVenue(partnerId: number, venueId: number): Promise<boolean> {
  const [v] = await db.select({ partnerId: venuesTable.partnerId }).from(venuesTable).where(eq(venuesTable.id, venueId));
  return !!v && v.partnerId === partnerId;
}

router.get("/partners/me/venues/:id/specialties", requireAuth, async (req: any, res) => {
  const partnerId = partnerIdFromAuth(req.auth);
  if (!partnerId) return res.status(403).json({ error: "Réservé aux comptes partenaires." });
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || !(await ownsVenue(partnerId, id))) {
    return res.status(404).json({ error: "Lieu introuvable." });
  }
  const rows = await db.select().from(venueSpecialtiesTable).where(eq(venueSpecialtiesTable.venueId, id));
  res.json({ specialties: rows.map(serializeSpecialty), total: rows.length });
});

router.post("/partners/me/venues/:id/specialties", requireAuth, async (req: any, res) => {
  const partnerId = partnerIdFromAuth(req.auth);
  if (!partnerId) return res.status(403).json({ error: "Réservé aux comptes partenaires." });
  if (!(await ensurePartnerSubscriptionActive(partnerId, res))) return;
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || !(await ownsVenue(partnerId, id))) {
    return res.status(404).json({ error: "Lieu introuvable." });
  }
  const { name, imageUrl, description, price } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: "Le nom est obligatoire." });
  if (!imageUrl || !String(imageUrl).trim()) return res.status(400).json({ error: "Une image est obligatoire." });
  const priceNum = price == null || price === "" ? null : Number(price);
  if (priceNum != null && (!Number.isFinite(priceNum) || priceNum < 0)) {
    return res.status(400).json({ error: "Prix invalide." });
  }
  const [s] = await db
    .insert(venueSpecialtiesTable)
    .values({
      venueId: id,
      name: String(name).trim(),
      imageUrl: String(imageUrl).trim(),
      description: description ? String(description).trim() : null,
      price: priceNum,
    })
    .returning();
  res.status(201).json(serializeSpecialty(s));
});

router.patch("/partners/me/venues/:id/specialties/:specId", requireAuth, async (req: any, res) => {
  const partnerId = partnerIdFromAuth(req.auth);
  if (!partnerId) return res.status(403).json({ error: "Réservé aux comptes partenaires." });
  if (!(await ensurePartnerSubscriptionActive(partnerId, res))) return;
  const id = parseInt(req.params.id, 10);
  const specId = parseInt(req.params.specId, 10);
  if (!Number.isFinite(id) || !Number.isFinite(specId) || !(await ownsVenue(partnerId, id))) {
    return res.status(404).json({ error: "Spécialité introuvable." });
  }
  const allowed: any = {};
  if ("name" in req.body) {
    const n = String(req.body.name || "").trim();
    if (!n) return res.status(400).json({ error: "Le nom est obligatoire." });
    allowed.name = n;
  }
  if ("imageUrl" in req.body) {
    const u = String(req.body.imageUrl || "").trim();
    if (!u) return res.status(400).json({ error: "Une image est obligatoire." });
    allowed.imageUrl = u;
  }
  if ("description" in req.body) {
    allowed.description = req.body.description ? String(req.body.description).trim() : null;
  }
  if ("price" in req.body) {
    const p = req.body.price == null || req.body.price === "" ? null : Number(req.body.price);
    if (p != null && (!Number.isFinite(p) || p < 0)) return res.status(400).json({ error: "Prix invalide." });
    allowed.price = p;
  }
  const [s] = await db
    .update(venueSpecialtiesTable)
    .set(allowed)
    .where(and(eq(venueSpecialtiesTable.id, specId), eq(venueSpecialtiesTable.venueId, id)))
    .returning();
  if (!s) return res.status(404).json({ error: "Spécialité introuvable." });
  res.json(serializeSpecialty(s));
});

router.delete("/partners/me/venues/:id/specialties/:specId", requireAuth, async (req: any, res) => {
  const partnerId = partnerIdFromAuth(req.auth);
  if (!partnerId) return res.status(403).json({ error: "Réservé aux comptes partenaires." });
  const id = parseInt(req.params.id, 10);
  const specId = parseInt(req.params.specId, 10);
  if (!Number.isFinite(id) || !Number.isFinite(specId) || !(await ownsVenue(partnerId, id))) {
    return res.status(404).json({ error: "Spécialité introuvable." });
  }
  await db
    .delete(venueSpecialtiesTable)
    .where(and(eq(venueSpecialtiesTable.id, specId), eq(venueSpecialtiesTable.venueId, id)));
  res.json({ success: true });
});

export default router;
