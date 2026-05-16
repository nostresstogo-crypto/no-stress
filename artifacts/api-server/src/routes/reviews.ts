import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, reviewsTable, eventsTable, venuesTable, adminsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth-utils.js";
import { sendAdminNewReviewEmail } from "../email.js";

const router: IRouter = Router();

function userIdFromAuth(auth: any): number | null {
  const sub: string = auth?.sub || "";
  if (!sub.startsWith("u_")) return null;
  const id = parseInt(sub.slice(2), 10);
  return Number.isFinite(id) ? id : null;
}

function partnerIdFromAuth(auth: any): number | null {
  const sub: string = auth?.sub || "";
  if (!sub.startsWith("p_")) return null;
  const id = parseInt(sub.slice(2), 10);
  return Number.isFinite(id) ? id : null;
}

function serializeReview(r: typeof reviewsTable.$inferSelect) {
  return {
    id: String(r.id),
    userId: r.userId != null ? String(r.userId) : null,
    partnerId: r.partnerId != null ? String(r.partnerId) : null,
    itemType: r.itemType,
    itemId: String(r.itemId),
    rating: r.rating,
    comment: r.comment ?? null,
    status: r.status,
    createdAt: r.createdAt,
  };
}

// GET /reviews?itemType=event&itemId=X — approved reviews only (public)
router.get("/reviews", async (req, res) => {
  const itemType = String(req.query.itemType || "");
  const itemId = parseInt(String(req.query.itemId || ""), 10);
  if ((itemType !== "event" && itemType !== "venue") || !Number.isFinite(itemId)) {
    return res.status(400).json({ error: "Type ou identifiant invalide." });
  }
  const rows = await db
    .select()
    .from(reviewsTable)
    .where(
      and(
        eq(reviewsTable.itemType, itemType),
        eq(reviewsTable.itemId, itemId),
        eq(reviewsTable.status, "approved"),
      ),
    )
    .orderBy(desc(reviewsTable.createdAt));

  const total = rows.length;
  const avgRating =
    total > 0 ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10 : null;

  res.json({ reviews: rows.map(serializeReview), total, avgRating });
});

// POST /reviews — create review (authenticated user or partner)
router.post("/reviews", requireAuth, async (req: any, res) => {
  const userId = userIdFromAuth(req.auth);
  const partnerId = partnerIdFromAuth(req.auth);

  if (userId == null && partnerId == null) {
    return res.status(403).json({ error: "Authentification requise." });
  }

  const { itemType, itemId: rawItemId, rating: rawRating, comment } = req.body || {};

  if (itemType !== "event" && itemType !== "venue") {
    return res.status(400).json({ error: "Type invalide. Valeurs acceptées : event, venue." });
  }
  const itemId = parseInt(String(rawItemId), 10);
  if (!Number.isFinite(itemId)) {
    return res.status(400).json({ error: "Identifiant invalide." });
  }
  const rating = parseInt(String(rawRating), 10);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "La note doit être entre 1 et 5." });
  }
  const commentTrimmed = comment ? String(comment).trim().slice(0, 500) || null : null;

  // Verify item exists + partner ownership check
  if (itemType === "event") {
    const [e] = await db
      .select({ id: eventsTable.id, status: eventsTable.status, partnerId: eventsTable.partnerId })
      .from(eventsTable)
      .where(eq(eventsTable.id, itemId));
    if (!e || e.status !== "approved") {
      return res.status(404).json({ error: "Événement introuvable." });
    }
    if (partnerId != null && e.partnerId === partnerId) {
      return res.status(403).json({ error: "Vous ne pouvez pas noter vos propres événements." });
    }
  } else {
    const [v] = await db
      .select({ id: venuesTable.id, status: venuesTable.status, partnerId: venuesTable.partnerId })
      .from(venuesTable)
      .where(eq(venuesTable.id, itemId));
    if (!v || v.status !== "approved") {
      return res.status(404).json({ error: "Lieu introuvable." });
    }
    if (partnerId != null && v.partnerId === partnerId) {
      return res.status(403).json({ error: "Vous ne pouvez pas noter vos propres lieux." });
    }
  }

  // Check for existing review — update if exists, insert if not
  const existing = userId != null
    ? await db.select({ id: reviewsTable.id }).from(reviewsTable).where(
        and(eq(reviewsTable.itemType, itemType), eq(reviewsTable.itemId, itemId), eq(reviewsTable.userId, userId)),
      )
    : await db.select({ id: reviewsTable.id }).from(reviewsTable).where(
        and(eq(reviewsTable.itemType, itemType), eq(reviewsTable.itemId, itemId), eq(reviewsTable.partnerId, partnerId!)),
      );

  let review;
  if (existing.length > 0) {
    const [updated] = await db
      .update(reviewsTable)
      .set({ rating, comment: commentTrimmed, status: "pending" })
      .where(eq(reviewsTable.id, existing[0].id))
      .returning();
    review = updated;
  } else {
    const [inserted] = await db
      .insert(reviewsTable)
      .values({
        userId: userId ?? null,
        partnerId: partnerId ?? null,
        itemType,
        itemId,
        rating,
        comment: commentTrimmed,
        status: "pending",
      })
      .returning();
    review = inserted;
  }

  res.status(201).json({ review: serializeReview(review) });

  // Notifier tous les admins — fire-and-forget
  const authorType = userId != null ? "user" : "partner";
  const authorId = (userId ?? partnerId)!;
  db.select({ email: adminsTable.email }).from(adminsTable)
    .then((admins) =>
      Promise.all(admins.map((a) =>
        sendAdminNewReviewEmail(a.email, {
          id: review.id,
          itemType: review.itemType,
          itemId: review.itemId,
          rating: review.rating,
          comment: review.comment ?? null,
          authorType,
          authorId,
        }),
      )),
    )
    .catch(() => {});
});

export default router;
