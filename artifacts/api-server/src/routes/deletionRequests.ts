import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, deletionRequestsTable } from "@workspace/db";
import { requireAdmin } from "./admin.js";

const router: IRouter = Router();

function serialize(r: any) {
  if (!r) return r;
  return { ...r, id: String(r.id) };
}

router.post("/account/deletion-request", async (req, res) => {
  const { email, name, accountType, reason } = req.body;
  if (!email || !name || !accountType) {
    return res.status(400).json({ error: "Email, nom et type de compte requis." });
  }
  const [existing] = await db
    .select()
    .from(deletionRequestsTable)
    .where(and(eq(deletionRequestsTable.email, email), eq(deletionRequestsTable.status, "pending")));
  if (existing) {
    return res.status(409).json({ error: "Une demande de suppression est déjà en cours pour cet email." });
  }
  const [request] = await db
    .insert(deletionRequestsTable)
    .values({ email, name, accountType, reason: reason || null })
    .returning();
  res.status(201).json({
    message: "Votre demande de suppression a bien été reçue. Elle sera traitée dans un délai de 30 jours.",
    requestId: String(request.id),
  });
});

router.get("/admin/deletion-requests", requireAdmin, async (req, res) => {
  const { status } = req.query;
  const rows = status
    ? await db.select().from(deletionRequestsTable).where(eq(deletionRequestsTable.status, String(status)))
    : await db.select().from(deletionRequestsTable);
  res.json(rows.map(serialize));
});

router.post("/admin/deletion-requests/:id/process", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Demande introuvable." });
  const [request] = await db
    .update(deletionRequestsTable)
    .set({ status: "processed" })
    .where(eq(deletionRequestsTable.id, id))
    .returning();
  if (!request) return res.status(404).json({ error: "Demande introuvable." });
  res.json({ message: "Demande marquée comme traitée.", request: serialize(request) });
});

export default router;
