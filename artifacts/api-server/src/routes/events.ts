import { Router, type IRouter } from "express";

const router: IRouter = Router();

const events = [
  {
    id: "1",
    title: "Afrobeats Night",
    titleFr: "Nuit Afrobeats",
    description: "The biggest afrobeats party of the year with top African DJs",
    descriptionFr: "La plus grande fête afrobeats de l'année avec les meilleurs DJs africains",
    date: "2026-04-15",
    time: "22:00",
    venue: "Club Éléphant Blanc",
    venueId: "v1",
    city: "Abidjan",
    category: "nightclubs",
    imageUrl: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&auto=format&fit=crop",
    price: 15000,
    currency: "FCFA",
    isSponsored: true,
    status: "approved",
    ticketTypes: [
      { id: "t1", name: "VIP", nameFr: "VIP", price: 50000, currency: "FCFA", available: 50 },
      { id: "t2", name: "Standard", nameFr: "Standard", price: 15000, currency: "FCFA", available: 200 },
    ],
    latitude: 5.3599517,
    longitude: -4.0082563,
    createdAt: "2026-03-01",
  },
  {
    id: "2",
    title: "Sauti Sol Live Concert",
    titleFr: "Concert Live Sauti Sol",
    description: "East African music icons Sauti Sol perform live",
    descriptionFr: "Les icônes de la musique est-africaine Sauti Sol en concert live",
    date: "2026-04-22",
    time: "20:00",
    venue: "Palais de la Culture",
    venueId: "v2",
    city: "Abidjan",
    category: "concerts",
    imageUrl: "https://images.unsplash.com/photo-1501386761578-eaa54b9f4bcd?w=800&auto=format&fit=crop",
    price: 25000,
    currency: "FCFA",
    isSponsored: false,
    status: "approved",
    ticketTypes: [
      { id: "t3", name: "VIP Gold", nameFr: "VIP Or", price: 100000, currency: "FCFA", available: 20 },
      { id: "t4", name: "VIP", nameFr: "VIP", price: 50000, currency: "FCFA", available: 100 },
      { id: "t5", name: "Standard", nameFr: "Standard", price: 25000, currency: "FCFA", available: 500 },
    ],
    latitude: 5.3470,
    longitude: -4.0148,
    createdAt: "2026-03-05",
  },
];

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
