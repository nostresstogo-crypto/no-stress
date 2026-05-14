import { Router, type IRouter } from "express";
import { eq, sql, asc } from "drizzle-orm";
import {
  db,
  countriesTable,
  citiesTable,
  eventCategoriesTable,
  venueTypesTable,
  eventsTable,
  venuesTable,
} from "@workspace/db";
import { requireAdmin } from "./admin.js";

const router: IRouter = Router();

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED_COUNTRIES = [
  { code: "TG", name: "Togo", emoji: "🇹🇬" },
  { code: "BJ", name: "Bénin", emoji: "🇧🇯" },
  { code: "CI", name: "Côte d'Ivoire", emoji: "🇨🇮" },
  { code: "GH", name: "Ghana", emoji: "🇬🇭" },
  { code: "BF", name: "Burkina Faso", emoji: "🇧🇫" },
  { code: "SN", name: "Sénégal", emoji: "🇸🇳" },
];

const SEED_CITIES = [
  // Togo
  { slug: "lome",         name: "Lomé",         countryCode: "TG", emoji: "🏙️", latitude: 6.1374,  longitude: 1.2123 },
  { slug: "tsevie",       name: "Tsévié",        countryCode: "TG", emoji: "🏘️", latitude: 6.4247,  longitude: 1.2159 },
  { slug: "aneho",        name: "Aného",         countryCode: "TG", emoji: "🏖️", latitude: 6.2291,  longitude: 1.5970 },
  { slug: "vogan",        name: "Vogan",         countryCode: "TG", emoji: "🌾", latitude: 6.2676,  longitude: 1.5258 },
  { slug: "tabligbo",     name: "Tabligbo",      countryCode: "TG", emoji: "🌿", latitude: 6.5826,  longitude: 1.5013 },
  { slug: "notse",        name: "Notsé",         countryCode: "TG", emoji: "🎶", latitude: 6.9495,  longitude: 1.1715 },
  { slug: "kpalime",      name: "Kpalimé",       countryCode: "TG", emoji: "🌿", latitude: 6.9004,  longitude: 0.6237 },
  { slug: "badou",        name: "Badou",         countryCode: "TG", emoji: "🏞️", latitude: 7.5769,  longitude: 0.5979 },
  { slug: "amlame",       name: "Amlamé",        countryCode: "TG", emoji: "🌱", latitude: 7.3667,  longitude: 0.9167 },
  { slug: "atakpame",     name: "Atakpamé",      countryCode: "TG", emoji: "🎵", latitude: 7.5328,  longitude: 1.1244 },
  { slug: "blitta",       name: "Blitta",        countryCode: "TG", emoji: "🌻", latitude: 8.3167,  longitude: 0.9833 },
  { slug: "sotouboua",    name: "Sotouboua",     countryCode: "TG", emoji: "🌄", latitude: 8.5667,  longitude: 0.9833 },
  { slug: "sokode",       name: "Sokodé",        countryCode: "TG", emoji: "🎪", latitude: 8.9833,  longitude: 1.1333 },
  { slug: "tchamba",      name: "Tchamba",       countryCode: "TG", emoji: "🏔️", latitude: 9.0333,  longitude: 1.4167 },
  { slug: "kara",         name: "Kara",          countryCode: "TG", emoji: "🎭", latitude: 9.5511,  longitude: 1.1811 },
  { slug: "bassar",       name: "Bassar",        countryCode: "TG", emoji: "⛏️", latitude: 9.2534,  longitude: 0.7812 },
  { slug: "niamtougou",   name: "Niamtougou",    countryCode: "TG", emoji: "✈️", latitude: 9.7665,  longitude: 1.0972 },
  { slug: "kande",        name: "Kandé",         countryCode: "TG", emoji: "🏡", latitude: 9.9447,  longitude: 1.0695 },
  { slug: "mango",        name: "Mango",         countryCode: "TG", emoji: "🥭", latitude: 10.3651, longitude: 0.4714 },
  { slug: "dapaong",      name: "Dapaong",       countryCode: "TG", emoji: "🌅", latitude: 10.8667, longitude: 0.2167 },
  // Bénin
  { slug: "cotonou",      name: "Cotonou",       countryCode: "BJ", emoji: "🏙️", latitude: 6.3703,  longitude: 2.3912 },
  { slug: "porto-novo",   name: "Porto-Novo",    countryCode: "BJ", emoji: "🏛️", latitude: 6.4969,  longitude: 2.6289 },
  { slug: "parakou",      name: "Parakou",       countryCode: "BJ", emoji: "🌾", latitude: 9.3370,  longitude: 2.6303 },
  { slug: "abomey",       name: "Abomey",        countryCode: "BJ", emoji: "🏰", latitude: 7.1850,  longitude: 1.9912 },
  { slug: "ouidah",       name: "Ouidah",        countryCode: "BJ", emoji: "🏖️", latitude: 6.3622,  longitude: 2.0852 },
  { slug: "bohicon",      name: "Bohicon",       countryCode: "BJ", emoji: "🌴", latitude: 7.1782,  longitude: 2.0667 },
  // Côte d'Ivoire
  { slug: "abidjan",      name: "Abidjan",       countryCode: "CI", emoji: "🌆", latitude: 5.3600,  longitude: -4.0083 },
  { slug: "yamoussoukro", name: "Yamoussoukro",  countryCode: "CI", emoji: "🏛️", latitude: 6.8276,  longitude: -5.2893 },
  { slug: "bouake",       name: "Bouaké",        countryCode: "CI", emoji: "🌳", latitude: 7.6906,  longitude: -5.0301 },
  { slug: "san-pedro",    name: "San-Pédro",     countryCode: "CI", emoji: "🏖️", latitude: 4.7485,  longitude: -6.6363 },
  { slug: "grand-bassam", name: "Grand-Bassam",  countryCode: "CI", emoji: "🏝️", latitude: 5.2118,  longitude: -3.7383 },
  // Ghana
  { slug: "accra",        name: "Accra",         countryCode: "GH", emoji: "🏙️", latitude: 5.6037,  longitude: -0.1870 },
  { slug: "kumasi",       name: "Kumasi",        countryCode: "GH", emoji: "🌳", latitude: 6.6885,  longitude: -1.6244 },
  { slug: "tamale",       name: "Tamale",        countryCode: "GH", emoji: "🌾", latitude: 9.4035,  longitude: -0.8424 },
  // Burkina Faso
  { slug: "ouagadougou",     name: "Ouagadougou",    countryCode: "BF", emoji: "🏙️", latitude: 12.3714, longitude: -1.5197 },
  { slug: "bobo-dioulasso",  name: "Bobo-Dioulasso", countryCode: "BF", emoji: "🎶", latitude: 11.1771, longitude: -4.2979 },
  { slug: "koudougou",       name: "Koudougou",      countryCode: "BF", emoji: "🌾", latitude: 12.2530, longitude: -2.3622 },
  // Sénégal
  { slug: "dakar",        name: "Dakar",         countryCode: "SN", emoji: "🏙️", latitude: 14.7167, longitude: -17.4677 },
  { slug: "thies",        name: "Thiès",         countryCode: "SN", emoji: "🌾", latitude: 14.7910, longitude: -16.9359 },
  { slug: "saint-louis",  name: "Saint-Louis",   countryCode: "SN", emoji: "🏛️", latitude: 16.0179, longitude: -16.4896 },
];

const SEED_EVENT_CATEGORIES = [
  { key: "concerts",    labelFr: "Concerts",        labelEn: "Concerts",      icon: "musical-notes", color: "#E8735A", sortOrder: 1 },
  { key: "soiree",      labelFr: "Soirée",          labelEn: "Party",         icon: "wine",          color: "#9B8FE8", sortOrder: 2 },
  { key: "festivals",   labelFr: "Festivals",       labelEn: "Festivals",     icon: "sparkles",      color: "#E8C85A", sortOrder: 3 },
  { key: "spectacle",   labelFr: "Spectacle",       labelEn: "Show",          icon: "ticket",        color: "#E85A9B", sortOrder: 4 },
  { key: "theatre",     labelFr: "Théâtre",         labelEn: "Theatre",       icon: "rose",          color: "#B85AE8", sortOrder: 5 },
  { key: "comedy",      labelFr: "Comédie",         labelEn: "Comedy",        icon: "happy",         color: "#E8985A", sortOrder: 6 },
  { key: "cinema",      labelFr: "Cinéma",          labelEn: "Cinema",        icon: "film",          color: "#5A9BE8", sortOrder: 7 },
  { key: "sport",       labelFr: "Sport",           labelEn: "Sports",        icon: "football",      color: "#5AE875", sortOrder: 8 },
  { key: "culture",     labelFr: "Culture",         labelEn: "Culture",       icon: "library",       color: "#A38FE8", sortOrder: 9 },
  { key: "conference",  labelFr: "Conférence",      labelEn: "Conference",    icon: "people",        color: "#5AB4E8", sortOrder: 10 },
  { key: "gastronomie", labelFr: "Gastronomie",     labelEn: "Gastronomy",    icon: "restaurant",    color: "#4CAF82", sortOrder: 11 },
  { key: "atelier",     labelFr: "Atelier",         labelEn: "Workshop",      icon: "construct",     color: "#D4AF37", sortOrder: 12 },
  { key: "beach",       labelFr: "Plage / Beach",   labelEn: "Beach",         icon: "sunny",         color: "#5AB4E8", sortOrder: 13 },
  { key: "liveMusic",   labelFr: "Live Music",      labelEn: "Live Music",    icon: "mic",           color: "#E8735A", sortOrder: 14 },
  { key: "nightclubs",  labelFr: "Boîte de nuit",   labelEn: "Nightclub",     icon: "wine",          color: "#9B8FE8", sortOrder: 15 },
  { key: "bars",        labelFr: "Bar",             labelEn: "Bar",           icon: "beer",          color: "#D4AF37", sortOrder: 16 },
];

const SEED_VENUE_TYPES = [
  { key: "Nightclub",        labelFr: "Boîte de nuit",    labelEn: "Nightclub",      icon: "wine",           sortOrder: 1 },
  { key: "Bar",              labelFr: "Bar",               labelEn: "Bar",            icon: "beer",           sortOrder: 2 },
  { key: "Restaurant",       labelFr: "Restaurant",        labelEn: "Restaurant",     icon: "restaurant",     sortOrder: 3 },
  { key: "Concert Hall",     labelFr: "Salle de concert",  labelEn: "Concert Hall",   icon: "musical-notes",  sortOrder: 4 },
  { key: "Beach Club",       labelFr: "Beach Club",        labelEn: "Beach Club",     icon: "sunny",          sortOrder: 5 },
  { key: "Cinema",           labelFr: "Cinéma",            labelEn: "Cinema",         icon: "film",           sortOrder: 6 },
  { key: "Hotel",            labelFr: "Hôtel",             labelEn: "Hotel",          icon: "bed",            sortOrder: 7 },
  { key: "Stadium",          labelFr: "Stade",             labelEn: "Stadium",        icon: "football",       sortOrder: 8 },
  { key: "Cultural Center",  labelFr: "Salle culturelle",  labelEn: "Cultural Center",icon: "library",        sortOrder: 9 },
  { key: "Comedy Club",      labelFr: "Comedy Club",       labelEn: "Comedy Club",    icon: "happy",          sortOrder: 10 },
];

let seedDone = false;

async function ensureConfigSeeded(): Promise<void> {
  if (seedDone) return;
  seedDone = true;
  try {
    // Countries
    for (const c of SEED_COUNTRIES) {
      await db.insert(countriesTable).values(c).onConflictDoNothing();
    }
    // Build country code → id map
    const allCountries = await db.select().from(countriesTable);
    const codeToId = new Map(allCountries.map((c) => [c.code, c.id]));

    // Cities
    for (const city of SEED_CITIES) {
      const countryId = codeToId.get(city.countryCode);
      if (!countryId) continue;
      await db
        .insert(citiesTable)
        .values({ slug: city.slug, name: city.name, countryId, emoji: city.emoji, latitude: city.latitude, longitude: city.longitude })
        .onConflictDoNothing();
    }

    // Event categories
    for (const ec of SEED_EVENT_CATEGORIES) {
      await db.insert(eventCategoriesTable).values(ec).onConflictDoNothing();
    }

    // Venue types
    for (const vt of SEED_VENUE_TYPES) {
      await db.insert(venueTypesTable).values(vt).onConflictDoNothing();
    }

    console.log("[config] Seed completed.");
  } catch (e) {
    seedDone = false;
    console.error("[config] Seed failed:", e);
  }
}

// Fire-and-forget on module load
ensureConfigSeeded();

// ─── Public GET routes ─────────────────────────────────────────────────────────

router.get("/config/countries", async (_req, res) => {
  const rows = await db.select().from(countriesTable).orderBy(asc(countriesTable.name));
  res.json({ countries: rows });
});

router.get("/config/cities", async (req, res) => {
  const countryId = req.query.countryId ? Number(req.query.countryId) : undefined;
  const query = db
    .select({
      id: citiesTable.id,
      slug: citiesTable.slug,
      name: citiesTable.name,
      emoji: citiesTable.emoji,
      latitude: citiesTable.latitude,
      longitude: citiesTable.longitude,
      countryId: citiesTable.countryId,
      countryName: countriesTable.name,
      countryCode: countriesTable.code,
    })
    .from(citiesTable)
    .innerJoin(countriesTable, eq(citiesTable.countryId, countriesTable.id))
    .orderBy(asc(countriesTable.name), asc(citiesTable.name));

  const rows = countryId
    ? await query.where(eq(citiesTable.countryId, countryId))
    : await query;

  res.json({ cities: rows });
});

router.get("/config/event-categories", async (_req, res) => {
  const rows = await db.select().from(eventCategoriesTable).orderBy(asc(eventCategoriesTable.sortOrder), asc(eventCategoriesTable.labelFr));
  res.json({ eventCategories: rows });
});

router.get("/config/venue-types", async (_req, res) => {
  const rows = await db.select().from(venueTypesTable).orderBy(asc(venueTypesTable.sortOrder), asc(venueTypesTable.labelFr));
  res.json({ venueTypes: rows });
});

// ─── Admin CRUD — Countries ────────────────────────────────────────────────────

router.post("/admin/config/countries", requireAdmin, async (req, res) => {
  const { code, name, emoji } = req.body || {};
  if (!code || !name) return res.status(400).json({ error: "code et name requis." });
  try {
    const [row] = await db.insert(countriesTable).values({ code: String(code).toUpperCase().trim(), name: String(name).trim(), emoji: emoji || "🌍" }).returning();
    res.status(201).json({ country: row });
  } catch (e: any) {
    if (e?.code === "23505") return res.status(409).json({ error: "Ce code pays existe déjà." });
    throw e;
  }
});

router.patch("/admin/config/countries/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { code, name, emoji } = req.body || {};
  const patch: any = {};
  if (code) patch.code = String(code).toUpperCase().trim();
  if (name) patch.name = String(name).trim();
  if (emoji) patch.emoji = emoji;
  if (!Object.keys(patch).length) return res.status(400).json({ error: "Aucun champ à modifier." });
  const [row] = await db.update(countriesTable).set(patch).where(eq(countriesTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Pays introuvable." });
  res.json({ country: row });
});

router.delete("/admin/config/countries/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  // Check if any city uses this country
  const [cityCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(citiesTable)
    .where(eq(citiesTable.countryId, id));
  if ((cityCount?.count ?? 0) > 0) {
    return res.status(409).json({ error: `Suppression impossible : ${cityCount.count} ville(s) sont liées à ce pays.` });
  }
  const [deleted] = await db.delete(countriesTable).where(eq(countriesTable.id, id)).returning();
  if (!deleted) return res.status(404).json({ error: "Pays introuvable." });
  res.json({ deleted });
});

// ─── Admin CRUD — Cities ───────────────────────────────────────────────────────

router.post("/admin/config/cities", requireAdmin, async (req, res) => {
  const { slug, name, countryId, emoji, latitude, longitude } = req.body || {};
  if (!slug || !name || !countryId) return res.status(400).json({ error: "slug, name et countryId requis." });
  try {
    const [row] = await db.insert(citiesTable).values({
      slug: String(slug).toLowerCase().trim(),
      name: String(name).trim(),
      countryId: Number(countryId),
      emoji: emoji || "🏙️",
      latitude: latitude != null ? Number(latitude) : null,
      longitude: longitude != null ? Number(longitude) : null,
    }).returning();
    res.status(201).json({ city: row });
  } catch (e: any) {
    if (e?.code === "23505") return res.status(409).json({ error: "Ce slug de ville existe déjà." });
    throw e;
  }
});

router.patch("/admin/config/cities/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { slug, name, countryId, emoji, latitude, longitude } = req.body || {};
  const patch: any = {};
  if (slug) patch.slug = String(slug).toLowerCase().trim();
  if (name) patch.name = String(name).trim();
  if (countryId) patch.countryId = Number(countryId);
  if (emoji) patch.emoji = emoji;
  if (latitude != null) patch.latitude = Number(latitude);
  if (longitude != null) patch.longitude = Number(longitude);
  if (!Object.keys(patch).length) return res.status(400).json({ error: "Aucun champ à modifier." });
  const [row] = await db.update(citiesTable).set(patch).where(eq(citiesTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Ville introuvable." });
  res.json({ city: row });
});

router.delete("/admin/config/cities/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  // Get city name first for the error message
  const [cityRow] = await db.select().from(citiesTable).where(eq(citiesTable.id, id));
  if (!cityRow) return res.status(404).json({ error: "Ville introuvable." });
  const cityName = cityRow.name;
  // Check events and venues referencing this city by name
  const [evCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(eventsTable)
    .where(sql`lower(${eventsTable.city}) = lower(${cityName})`);
  const [vCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(venuesTable)
    .where(sql`lower(${venuesTable.city}) = lower(${cityName})`);
  const total = (evCount?.count ?? 0) + (vCount?.count ?? 0);
  if (total > 0) {
    return res.status(409).json({
      error: `Suppression impossible : ${evCount?.count ?? 0} événement(s) et ${vCount?.count ?? 0} lieu(x) utilisent « ${cityName} ».`,
    });
  }
  const [deleted] = await db.delete(citiesTable).where(eq(citiesTable.id, id)).returning();
  res.json({ deleted });
});

// ─── Admin CRUD — Event Categories ────────────────────────────────────────────

router.post("/admin/config/event-categories", requireAdmin, async (req, res) => {
  const { key, labelFr, labelEn, icon, color, sortOrder } = req.body || {};
  if (!key || !labelFr || !labelEn) return res.status(400).json({ error: "key, labelFr et labelEn requis." });
  try {
    const [row] = await db.insert(eventCategoriesTable).values({
      key: String(key).trim(),
      labelFr: String(labelFr).trim(),
      labelEn: String(labelEn).trim(),
      icon: icon || "calendar",
      color: color || "#9B8FE8",
      sortOrder: sortOrder != null ? Number(sortOrder) : 0,
    }).returning();
    res.status(201).json({ eventCategory: row });
  } catch (e: any) {
    if (e?.code === "23505") return res.status(409).json({ error: "Cette clé de catégorie existe déjà." });
    throw e;
  }
});

router.patch("/admin/config/event-categories/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { key, labelFr, labelEn, icon, color, sortOrder } = req.body || {};
  const patch: any = {};
  if (key) patch.key = String(key).trim();
  if (labelFr) patch.labelFr = String(labelFr).trim();
  if (labelEn) patch.labelEn = String(labelEn).trim();
  if (icon) patch.icon = icon;
  if (color) patch.color = color;
  if (sortOrder != null) patch.sortOrder = Number(sortOrder);
  if (!Object.keys(patch).length) return res.status(400).json({ error: "Aucun champ à modifier." });
  const [row] = await db.update(eventCategoriesTable).set(patch).where(eq(eventCategoriesTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Catégorie introuvable." });
  res.json({ eventCategory: row });
});

router.delete("/admin/config/event-categories/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const [catRow] = await db.select().from(eventCategoriesTable).where(eq(eventCategoriesTable.id, id));
  if (!catRow) return res.status(404).json({ error: "Catégorie introuvable." });
  const [evCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(eventsTable)
    .where(sql`lower(${eventsTable.category}) = lower(${catRow.key})`);
  if ((evCount?.count ?? 0) > 0) {
    return res.status(409).json({ error: `Suppression impossible : ${evCount.count} événement(s) utilisent la catégorie « ${catRow.labelFr} ».` });
  }
  const [deleted] = await db.delete(eventCategoriesTable).where(eq(eventCategoriesTable.id, id)).returning();
  res.json({ deleted });
});

// ─── Admin CRUD — Venue Types ──────────────────────────────────────────────────

router.post("/admin/config/venue-types", requireAdmin, async (req, res) => {
  const { key, labelFr, labelEn, icon, sortOrder } = req.body || {};
  if (!key || !labelFr || !labelEn) return res.status(400).json({ error: "key, labelFr et labelEn requis." });
  try {
    const [row] = await db.insert(venueTypesTable).values({
      key: String(key).trim(),
      labelFr: String(labelFr).trim(),
      labelEn: String(labelEn).trim(),
      icon: icon || "business",
      sortOrder: sortOrder != null ? Number(sortOrder) : 0,
    }).returning();
    res.status(201).json({ venueType: row });
  } catch (e: any) {
    if (e?.code === "23505") return res.status(409).json({ error: "Cette clé de type de lieu existe déjà." });
    throw e;
  }
});

router.patch("/admin/config/venue-types/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { key, labelFr, labelEn, icon, sortOrder } = req.body || {};
  const patch: any = {};
  if (key) patch.key = String(key).trim();
  if (labelFr) patch.labelFr = String(labelFr).trim();
  if (labelEn) patch.labelEn = String(labelEn).trim();
  if (icon) patch.icon = icon;
  if (sortOrder != null) patch.sortOrder = Number(sortOrder);
  if (!Object.keys(patch).length) return res.status(400).json({ error: "Aucun champ à modifier." });
  const [row] = await db.update(venueTypesTable).set(patch).where(eq(venueTypesTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Type de lieu introuvable." });
  res.json({ venueType: row });
});

router.delete("/admin/config/venue-types/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const [vtRow] = await db.select().from(venueTypesTable).where(eq(venueTypesTable.id, id));
  if (!vtRow) return res.status(404).json({ error: "Type de lieu introuvable." });
  const [vCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(venuesTable)
    .where(sql`lower(${venuesTable.type}) = lower(${vtRow.key})`);
  if ((vCount?.count ?? 0) > 0) {
    return res.status(409).json({ error: `Suppression impossible : ${vCount.count} lieu(x) utilisent le type « ${vtRow.labelFr} ».` });
  }
  const [deleted] = await db.delete(venueTypesTable).where(eq(venueTypesTable.id, id)).returning();
  res.json({ deleted });
});

export default router;
