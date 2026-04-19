import { Router, type IRouter } from "express";

const router: IRouter = Router();

const events: any[] = [];

router.get("/events", (req, res) => {
  const { city, category, page = 1, limit = 20 } = req.query;
  let filtered = [...events];
  if (city) filtered = filtered.filter(e => e.city.toLowerCase().includes((city as string).toLowerCase()));
  if (category) filtered = filtered.filter(e => e.category === category);
  res.json({ events: filtered, total: filtered.length, page: Number(page), limit: Number(limit) });
});

router.get("/events/:id", (req, res) => {
  const event = events.find((e) => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  res.json(event);
});

router.post("/events", (req, res) => {
  const event = { ...req.body, id: Date.now().toString(), status: "pending", createdAt: new Date().toISOString() };
  events.push(event);
  res.status(201).json(event);
});

router.patch("/events/:id", (req, res) => {
  const idx = events.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Event not found" });
  events[idx] = { ...events[idx], ...req.body };
  res.json(events[idx]);
});

router.post("/admin/events/:id/approve", (req, res) => {
  const idx = events.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Event not found" });
  events[idx] = { ...events[idx], status: "approved" };
  res.json(events[idx]);
});

router.post("/admin/events/:id/reject", (req, res) => {
  const idx = events.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Event not found" });
  events[idx] = { ...events[idx], status: "rejected" };
  res.json(events[idx]);
});

export default router;
