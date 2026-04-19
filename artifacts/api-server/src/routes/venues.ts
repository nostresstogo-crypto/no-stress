import { Router, type IRouter } from "express";

const router: IRouter = Router();

const venues: any[] = [];

router.get("/venues", (req, res) => {
  const { city, type } = req.query;
  let filtered = [...venues];
  if (city) filtered = filtered.filter(v => v.city.toLowerCase().includes((city as string).toLowerCase()));
  if (type) filtered = filtered.filter(v => v.type === type);
  res.json({ venues: filtered, total: filtered.length });
});

router.get("/venues/:id", (req, res) => {
  const venue = venues.find((v) => v.id === req.params.id);
  if (!venue) return res.status(404).json({ error: "Venue not found" });
  res.json(venue);
});

router.post("/venues", (req, res) => {
  const venue = { ...req.body, id: `v${Date.now()}`, isVerified: false, createdAt: new Date().toISOString() };
  venues.push(venue);
  res.status(201).json(venue);
});

router.patch("/venues/:id", (req, res) => {
  const idx = venues.findIndex((v) => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Venue not found" });
  venues[idx] = { ...venues[idx], ...req.body };
  res.json(venues[idx]);
});

router.post("/admin/venues/:id/verify", (req, res) => {
  const idx = venues.findIndex((v) => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Venue not found" });
  venues[idx] = { ...venues[idx], isVerified: true };
  res.json(venues[idx]);
});

export default router;
