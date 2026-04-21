import { Router, type IRouter } from "express";
import { eq, and, ilike, gte, lt } from "drizzle-orm";
import { db, eventsTable } from "@workspace/db";
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

router.get("/events", async (req, res) => {
  const { city, category, partnerId, status, includeArchived, archivedOnly, page = 1, limit = 20 } = req.query;
  const conds: any[] = [];
  if (partnerId) {
    const pid = parseInt(String(partnerId), 10);
    if (Number.isFinite(pid)) conds.push(eq(eventsTable.partnerId, pid));
    if (status) conds.push(eq(eventsTable.status, String(status)));
  } else {
    conds.push(eq(eventsTable.status, status ? String(status) : "approved"));
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
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Event not found" });
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
  if (!event) return res.status(404).json({ error: "Event not found" });
  res.json(serialize(event));
});

router.post("/events", async (req, res) => {
  const { title, titleFr, description, descriptionFr, date, time, venue, venueId, city, category, imageUrl, images, price, currency, partnerId, latitude, longitude, ticketTypes } = req.body || {};
  if (!title || !date) {
    return res.status(400).json({ error: "Le titre et la date sont obligatoires." });
  }
  if (!venue && !venueId) {
    return res.status(400).json({ error: "Le lieu est obligatoire." });
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
      venue: venue || null,
      venueId: venueId ? parseInt(String(venueId), 10) || null : null,
      city: city || null,
      category: category || null,
      imageUrl: imgs[0] || imageUrl || null,
      images: imgs,
      price: price != null ? Number(price) : null,
      currency: currency || "FCFA",
      partnerId: partnerId ? parseInt(String(partnerId), 10) || null : null,
      latitude: latitude != null ? Number(latitude) : null,
      longitude: longitude != null ? Number(longitude) : null,
      ticketTypes: ticketTypes ?? null,
    })
    .returning();
  res.status(201).json(serialize(event));
});

router.patch("/events/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Event not found" });
  const allowed: any = {};
  for (const k of ["title","titleFr","description","descriptionFr","date","time","venue","city","category","price","currency","status","ticketTypes","latitude","longitude"]) {
    if (k in req.body) allowed[k] = req.body[k];
  }
  if ("venueId" in req.body) {
    allowed.venueId = req.body.venueId ? parseInt(String(req.body.venueId), 10) || null : null;
  }
  if ("images" in req.body || "imageUrl" in req.body) {
    const imgs = normalizeImages(req.body.images || (req.body.imageUrl ? [req.body.imageUrl] : []));
    allowed.images = imgs;
    allowed.imageUrl = imgs[0] || null;
  }
  const [event] = await db.update(eventsTable).set(allowed).where(eq(eventsTable.id, id)).returning();
  if (!event) return res.status(404).json({ error: "Event not found" });
  res.json(serialize(event));
});

router.delete("/events/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Event not found" });
  const [event] = await db
    .update(eventsTable)
    .set({ status: "archived" })
    .where(eq(eventsTable.id, id))
    .returning();
  if (!event) return res.status(404).json({ error: "Event not found" });
  res.json({ success: true });
});

router.post("/admin/events/:id/approve", requireAdmin, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Event not found" });
  const [event] = await db.update(eventsTable).set({ status: "approved" }).where(eq(eventsTable.id, id)).returning();
  if (!event) return res.status(404).json({ error: "Event not found" });
  notifyEventApproved(event.id).catch((e) => console.error("[push] notify failed", e));
  res.json(serialize(event));
});

router.post("/admin/events/:id/reject", requireAdmin, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Event not found" });
  const [event] = await db.update(eventsTable).set({ status: "rejected" }).where(eq(eventsTable.id, id)).returning();
  if (!event) return res.status(404).json({ error: "Event not found" });
  res.json(serialize(event));
});

export default router;
