import { Router, type IRouter } from "express";

const router: IRouter = Router();

const venues = [
  {
    id: "v1",
    name: "Club Éléphant Blanc",
    type: "Nightclub",
    city: "Abidjan",
    address: "Zone 4, Abidjan",
    imageUrl: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&auto=format&fit=crop",
    description: "The premier nightclub in Abidjan",
    isVerified: true,
    latitude: 5.3599517,
    longitude: -4.0082563,
    ownerId: "u1",
    createdAt: "2025-01-01",
  },
  {
    id: "v2",
    name: "Palais de la Culture",
    type: "Concert Hall",
    city: "Abidjan",
    address: "Treichville, Abidjan",
    imageUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop",
    description: "Cultural venue for concerts and events",
    isVerified: true,
    latitude: 5.3470,
    longitude: -4.0148,
    ownerId: "u2",
    createdAt: "2025-01-02",
  },
];

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
