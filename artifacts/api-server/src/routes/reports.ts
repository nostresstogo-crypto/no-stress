import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, reportsTable, eventsTable, venuesTable, usersTable } from "@workspace/db";
import { requireAuth } from "../lib/auth-utils.js";
import { sendReportToAdmin } from "../email.js";

const router: IRouter = Router();

function userIdFromAuth(auth: any): number | null {
  if (!auth?.sub || typeof auth.sub !== "string" || !auth.sub.startsWith("u_")) return null;
  const id = parseInt(auth.sub.slice(2), 10);
  return Number.isFinite(id) ? id : null;
}

router.post("/reports", requireAuth, async (req: any, res) => {
  const userId = userIdFromAuth(req.auth);
  if (!userId) return res.status(403).json({ error: "Connexion utilisateur requise pour signaler." });
  const { itemType, itemId, reason } = req.body || {};
  if (itemType !== "event" && itemType !== "venue") {
    return res.status(400).json({ error: "itemType doit être 'event' ou 'venue'." });
  }
  const idNum = parseInt(String(itemId), 10);
  if (!Number.isFinite(idNum)) return res.status(400).json({ error: "itemId invalide." });
  const reasonStr = String(reason || "").trim();
  if (reasonStr.length < 5 || reasonStr.length > 1000) {
    return res.status(400).json({ error: "La raison doit faire entre 5 et 1000 caractères." });
  }

  let itemTitle = "";
  let itemCity = "";
  if (itemType === "event") {
    const [e] = await db.select().from(eventsTable).where(eq(eventsTable.id, idNum));
    if (!e) return res.status(404).json({ error: "Élément introuvable." });
    itemTitle = e.title;
    itemCity = e.city;
  } else {
    const [v] = await db.select().from(venuesTable).where(eq(venuesTable.id, idNum));
    if (!v) return res.status(404).json({ error: "Élément introuvable." });
    itemTitle = v.name;
    itemCity = v.city;
  }

  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  const [row] = await db
    .insert(reportsTable)
    .values({
      itemType,
      itemId: idNum,
      reporterUserId: userId,
      reporterEmail: u?.email || null,
      reason: reasonStr,
      status: "open",
    })
    .returning();

  // Best-effort admin email
  sendReportToAdmin({
    reportId: row.id,
    itemType,
    itemId: idNum,
    itemTitle,
    itemCity,
    reporterName: u?.name || "Utilisateur",
    reporterEmail: u?.email || "(inconnu)",
    reason: reasonStr,
  }).catch(() => {});

  res.status(201).json({ id: row.id, status: row.status });
});

export default router;
