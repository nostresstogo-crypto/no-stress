import { Router, type IRouter } from "express";
import { eq, and, ilike } from "drizzle-orm";
import { db, venuesTable } from "@workspace/db";

const router: IRouter = Router();

function serialize(v: any) {
  if (!v) return v;
  const images = Array.isArray(v.images) ? v.images : [];
  const imageUrl = v.imageUrl || (images.length > 0 ? images[0] : null);
  return {
    ...v,
    id: String(v.id),
    partnerId: v.partnerId != null ? String(v.partnerId) : null,
    isVerified: v.isVerified === "true" || v.isVerified === true,
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

router.get("/venues", async (req, res) => {
  const { city, type } = req.query;
  const conds: any[] = [];
  if (city) conds.push(ilike(venuesTable.city, `%${String(city)}%`));
  if (type) conds.push(eq(venuesTable.type, String(type)));
  const rows = conds.length
    ? await db.select().from(venuesTable).where(and(...conds))
    : await db.select().from(venuesTable);
  res.json({ venues: rows.map(serialize), total: rows.length });
});

router.get("/venues/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Venue not found" });
  const [v] = await db.select().from(venuesTable).where(eq(venuesTable.id, id));
  if (!v) return res.status(404).json({ error: "Venue not found" });
  res.json(serialize(v));
});

router.post("/venues", async (req, res) => {
  const { name, type, city, country, address, description, imageUrl, images, latitude, longitude, partnerId } = req.body || {};
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
      partnerId: partnerId ? parseInt(String(partnerId), 10) || null : null,
    })
    .returning();
  res.status(201).json(serialize(v));
});

router.patch("/venues/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Venue not found" });
  const allowed: any = {};
  for (const k of ["name", "type", "city", "country", "address", "description", "latitude", "longitude"]) {
    if (k in req.body) allowed[k] = req.body[k];
  }
  if ("images" in req.body || "imageUrl" in req.body) {
    const imgs = normalizeImages(req.body.images || (req.body.imageUrl ? [req.body.imageUrl] : []));
    allowed.images = imgs;
    allowed.imageUrl = imgs[0] || null;
  }
  const [v] = await db.update(venuesTable).set(allowed).where(eq(venuesTable.id, id)).returning();
  if (!v) return res.status(404).json({ error: "Venue not found" });
  res.json(serialize(v));
});

router.delete("/venues/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Venue not found" });
  const [v] = await db.delete(venuesTable).where(eq(venuesTable.id, id)).returning();
  if (!v) return res.status(404).json({ error: "Venue not found" });
  res.json({ success: true });
});

router.post("/admin/venues/:id/verify", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Venue not found" });
  const [v] = await db.update(venuesTable).set({ isVerified: "true" }).where(eq(venuesTable.id, id)).returning();
  if (!v) return res.status(404).json({ error: "Venue not found" });
  res.json(serialize(v));
});

export default router;
