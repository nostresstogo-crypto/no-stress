import { Router, type IRouter } from "express";
import { eq, and, ilike } from "drizzle-orm";
import { db, eventsTable } from "@workspace/db";
import { requireAdmin } from "./admin.js";

const router: IRouter = Router();

function serialize(e: any) {
  if (!e) return e;
  return { ...e, id: String(e.id), partnerId: e.partnerId != null ? String(e.partnerId) : null };
}

router.get("/events", async (req, res) => {
  const { city, category, page = 1, limit = 20 } = req.query;
  const conds = [eq(eventsTable.status, "approved")];
  if (city) conds.push(ilike(eventsTable.city, `%${String(city)}%`));
  if (category) conds.push(eq(eventsTable.category, String(category)));
  const rows = await db.select().from(eventsTable).where(and(...conds));
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
  const { title, description, date, time, venue, city, category, imageUrl, price, partnerId, latitude, longitude, ticketTypes } = req.body || {};
  if (!title || !date) {
    return res.status(400).json({ error: "Le titre et la date sont obligatoires." });
  }
  const [event] = await db
    .insert(eventsTable)
    .values({
      title,
      description: description || null,
      date,
      time: time || null,
      venue: venue || null,
      city: city || null,
      category: category || null,
      imageUrl: imageUrl || null,
      price: price != null ? Number(price) : null,
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
  for (const k of ["title","description","date","time","venue","city","category","imageUrl","price","status","ticketTypes","latitude","longitude"]) {
    if (k in req.body) allowed[k] = req.body[k];
  }
  const [event] = await db.update(eventsTable).set(allowed).where(eq(eventsTable.id, id)).returning();
  if (!event) return res.status(404).json({ error: "Event not found" });
  res.json(serialize(event));
});

router.post("/admin/events/:id/approve", requireAdmin, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Event not found" });
  const [event] = await db.update(eventsTable).set({ status: "approved" }).where(eq(eventsTable.id, id)).returning();
  if (!event) return res.status(404).json({ error: "Event not found" });
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
