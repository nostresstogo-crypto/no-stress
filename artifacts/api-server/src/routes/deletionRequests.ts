import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, deletionRequestsTable, usersTable, partnersTable, refreshTokensTable } from "@workspace/db";
import { requireAdmin, requireSuperAdmin } from "./admin.js";
import {
  sendDeletionRequestAdminNotification,
  sendDeletionConfirmedEmail,
} from "../email.js";

const router: IRouter = Router();

function serialize(r: any) {
  if (!r) return r;
  return {
    ...r,
    id: String(r.id),
    userId: r.userId != null ? String(r.userId) : null,
    partnerId: r.partnerId != null ? String(r.partnerId) : null,
  };
}

function normEmail(e: unknown): string | null {
  if (typeof e !== "string") return null;
  const v = e.trim().toLowerCase();
  return v || null;
}

router.post("/account/deletion-request", async (req, res) => {
  const email = normEmail(req.body?.email);
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const accountType = req.body?.accountType;
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : null;

  if (!email || !name || (accountType !== "user" && accountType !== "partner")) {
    return res.status(400).json({ error: "Email, nom et type de compte (user/partner) requis." });
  }

  let userId: number | null = null;
  let partnerId: number | null = null;
  if (accountType === "user") {
    const [u] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
    if (u) userId = u.id;
  } else {
    const [p] = await db.select({ id: partnersTable.id }).from(partnersTable).where(eq(partnersTable.email, email));
    if (p) partnerId = p.id;
  }

  let request;
  try {
    [request] = await db
      .insert(deletionRequestsTable)
      .values({ email, name, accountType, reason, userId, partnerId } as any)
      .returning();
  } catch (err: any) {
    // Partial unique index (status='pending') garantit qu'une seule demande pending par email.
    // drizzle peut wrapper l'erreur PG : on inspecte aussi err.cause.
    const pgCode = err?.code ?? err?.cause?.code;
    const constraint = err?.constraint ?? err?.cause?.constraint;
    if (pgCode === "23505" || constraint === "deletion_requests_pending_email_unique") {
      return res.status(409).json({ error: "Une demande de suppression est déjà en cours pour cet email." });
    }
    throw err;
  }

  res.status(201).json({
    message: "Votre demande de suppression a bien été reçue. Elle sera traitée dans un délai maximum de 30 jours.",
    requestId: String(request.id),
  });

  const matched = userId
    ? ({ kind: "user", id: userId } as const)
    : partnerId
      ? ({ kind: "partner", id: partnerId } as const)
      : null;
  sendDeletionRequestAdminNotification(email, name, accountType, reason, matched).catch(() => {});
});

router.get("/admin/deletion-requests", requireAdmin, async (req, res) => {
  const { status } = req.query;
  const rows = status
    ? await db.select().from(deletionRequestsTable).where(eq(deletionRequestsTable.status, String(status)))
    : await db.select().from(deletionRequestsTable);
  rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(rows.map(serialize));
});

router.post("/admin/deletion-requests/:id/process", requireSuperAdmin, async (req, res) => {
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

/**
 * Supprime définitivement le compte (utilisateur ou partenaire) lié à une demande
 * de manière transactionnelle et idempotente :
 *  - Verrou applicatif via UPDATE ... WHERE status='pending' RETURNING (claim) → empêche
 *    toute exécution concurrente : seul le 1er admin "gagne", l'autre reçoit un 409.
 *  - Suppression user/partner + cascade DB (favoris, lieux, events, partners.userId).
 *  - Révocation explicite des refresh_tokens (pas de FK).
 *  - Email de confirmation au demandeur (best-effort, hors transaction).
 */
router.post("/admin/deletion-requests/:id/delete-account", requireSuperAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(404).json({ error: "Demande introuvable." });

  // Pré-lecture pour distinguer 404 / 409 et donner un message clair.
  const [existing] = await db.select().from(deletionRequestsTable).where(eq(deletionRequestsTable.id, id));
  if (!existing) return res.status(404).json({ error: "Demande introuvable." });
  if (existing.status !== "pending") {
    return res.status(409).json({ error: "Cette demande a déjà été traitée." });
  }

  let result: { kind: "user" | "partner"; id: number; email: string; name: string } | null = null;

  try {
    result = await db.transaction(async (tx) => {
      // Claim atomique : seule la transaction qui gagne ce UPDATE poursuit la suppression.
      const [claimed] = await tx
        .update(deletionRequestsTable)
        .set({ status: "processed" })
        .where(and(eq(deletionRequestsTable.id, id), eq(deletionRequestsTable.status, "pending")))
        .returning();
      if (!claimed) {
        // Une autre requête concurrente a déjà traité — sortir sans erreur ni effet de bord.
        return null;
      }

      // Re-résolution si la demande date d'avant le matching automatique.
      let userId = claimed.userId as number | null;
      let partnerId = claimed.partnerId as number | null;
      if (!userId && !partnerId) {
        if (claimed.accountType === "user") {
          const [u] = await tx
            .select({ id: usersTable.id })
            .from(usersTable)
            .where(eq(usersTable.email, claimed.email));
          if (u) userId = u.id;
        } else {
          const [p] = await tx
            .select({ id: partnersTable.id })
            .from(partnersTable)
            .where(eq(partnersTable.email, claimed.email));
          if (p) partnerId = p.id;
        }
      }

      if (!userId && !partnerId) {
        // Aucun compte à supprimer : on annule la transition pour laisser l'admin
        // décider (corriger l'email, marquer manuellement traité, etc.).
        throw new HttpError(404, "Aucun compte trouvé pour cette demande. Vérifiez l'email ou marquez la demande comme traitée manuellement.");
      }

      let kind: "user" | "partner";
      let deletedId: number;
      let subject: string;
      if (userId) {
        const [del] = await tx.delete(usersTable).where(eq(usersTable.id, userId)).returning();
        if (!del) throw new HttpError(409, "Le compte a déjà été supprimé. Demande marquée traitée.");
        kind = "user";
        deletedId = userId;
        subject = `u_${userId}`;
      } else {
        const [del] = await tx.delete(partnersTable).where(eq(partnersTable.id, partnerId!)).returning();
        if (!del) throw new HttpError(409, "Le compte a déjà été supprimé. Demande marquée traitée.");
        kind = "partner";
        deletedId = partnerId!;
        subject = `p_${partnerId}`;
      }

      // Révoque toutes les sessions actives (refresh_tokens n'a pas de FK).
      await tx
        .update(refreshTokensTable)
        .set({ revokedAt: new Date() })
        .where(and(eq(refreshTokensTable.subject, subject), sql`${refreshTokensTable.revokedAt} IS NULL`));

      return { kind, id: deletedId, email: claimed.email, name: claimed.name };
    });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }

  if (!result) {
    return res.status(409).json({ error: "Cette demande vient d'être traitée par un autre administrateur." });
  }

  res.json({
    message: `Compte ${result.kind === "partner" ? "partenaire" : "utilisateur"} supprimé. Toutes les données liées ont été effacées.`,
    deleted: { kind: result.kind, id: String(result.id) },
  });

  sendDeletionConfirmedEmail(result.email, result.name).catch(() => {});
});

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export default router;
