import { db, partnersTable } from "@workspace/db";
import { and, eq, gt, gte, isNull, lt, or, sql } from "drizzle-orm";
import { logger } from "./logger.js";
import { sendSubscriptionExpiryWarningEmail } from "../email.js";
import { notifyPartnerSubscriptionExpiring } from "./pushNotifications.js";

export const SUBSCRIPTION_FREE_MONTHS = 3;

export function computeNewSubscriptionUntil(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + SUBSCRIPTION_FREE_MONTHS);
  return d;
}

export function isSubscriptionActive(p: { status?: string | null; subscriptionUntil?: Date | null }): boolean {
  if (!p) return false;
  if (p.status !== "approved") return false;
  if (!p.subscriptionUntil) return false;
  return new Date(p.subscriptionUntil).getTime() > Date.now();
}

export function subscriptionInfo(p: { status?: string | null; subscriptionUntil?: Date | null; subscriptionStart?: Date | null } | null | undefined) {
  if (!p) return { active: false, subscriptionUntil: null, subscriptionStart: null, daysRemaining: 0 };
  const until = p.subscriptionUntil ? new Date(p.subscriptionUntil) : null;
  const start = p.subscriptionStart ? new Date(p.subscriptionStart) : null;
  const active = isSubscriptionActive(p);
  const daysRemaining = until ? Math.max(0, Math.ceil((until.getTime() - Date.now()) / 86_400_000)) : 0;
  return { active, subscriptionUntil: until ? until.toISOString() : null, subscriptionStart: start ? start.toISOString() : null, daysRemaining };
}

// Checks partners whose subscription expires in exactly N days (1–7) and sends
// one email + one push notification per partner per day. Called by the daily scheduler.
//
// Delivery state is tracked independently per channel (subscriptionWarningEmailSentAt,
// subscriptionWarningPushSentAt). If email fails but push succeeds, only email is retried
// on the next run — push is not re-sent. Each channel uses an atomic conditional UPDATE as
// its claim so concurrent scheduler instances cannot double-send the same channel.
export async function checkExpiringSubscriptions(): Promise<void> {
  const now = new Date();

  // today 00:00:00 (server local time) — used as the exclusive lower bound for "already sent today".
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Query window: subscriptions expiring within the next 1–7 calendar days.
  // [tomorrow 00:00, day+8 00:00) avoids end-of-day boundary ambiguity.
  const windowStart = new Date(todayStart);
  windowStart.setDate(windowStart.getDate() + 1); // tomorrow 00:00

  const windowEnd = new Date(todayStart);
  windowEnd.setDate(windowEnd.getDate() + 8); // day+8 00:00 (exclusive upper bound)

  // Only load partners where at least one channel still needs sending today.
  const expiring = await db
    .select()
    .from(partnersTable)
    .where(
      and(
        eq(partnersTable.status, "approved"),
        gte(partnersTable.subscriptionUntil, windowStart),
        lt(partnersTable.subscriptionUntil, windowEnd),
        or(
          isNull(partnersTable.subscriptionWarningEmailSentAt),
          lt(partnersTable.subscriptionWarningEmailSentAt, todayStart),
          isNull(partnersTable.subscriptionWarningPushSentAt),
          lt(partnersTable.subscriptionWarningPushSentAt, todayStart),
        ),
      ),
    );

  if (expiring.length === 0) {
    logger.info("[subscription-expiry] no expiring subscriptions need notification today");
    return;
  }

  logger.info({ count: expiring.length }, "[subscription-expiry] checking partners");

  for (const partner of expiring) {
    try {
      const expiryDate = new Date(partner.subscriptionUntil!);
      const msRemaining = expiryDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(msRemaining / 86_400_000);

      if (daysRemaining < 1 || daysRemaining > 7) continue;

      // Atomically claim each channel independently.
      // If two scheduler instances run simultaneously, only one will get rowCount === 1
      // per channel; the other sees 0 rows and skips that channel.
      const [emailClaimed, pushClaimed] = await Promise.all([
        db
          .update(partnersTable)
          .set({ subscriptionWarningEmailSentAt: now })
          .where(
            and(
              eq(partnersTable.id, partner.id),
              or(
                isNull(partnersTable.subscriptionWarningEmailSentAt),
                lt(partnersTable.subscriptionWarningEmailSentAt, todayStart),
              ),
            ),
          )
          .returning({ id: partnersTable.id }),
        db
          .update(partnersTable)
          .set({ subscriptionWarningPushSentAt: now })
          .where(
            and(
              eq(partnersTable.id, partner.id),
              or(
                isNull(partnersTable.subscriptionWarningPushSentAt),
                lt(partnersTable.subscriptionWarningPushSentAt, todayStart),
              ),
            ),
          )
          .returning({ id: partnersTable.id }),
      ]);

      const needsEmail = emailClaimed.length > 0;
      const needsPush = pushClaimed.length > 0;

      if (!needsEmail && !needsPush) {
        // Both channels were already claimed by a concurrent instance today.
        logger.info({ partnerId: partner.id }, "[subscription-expiry] all channels already claimed today, skipping");
        continue;
      }

      // Send only the channels whose claims we won.
      const [emailResult, pushResult] = await Promise.allSettled([
        needsEmail
          ? sendSubscriptionExpiryWarningEmail(
              partner.email,
              partner.contactName,
              partner.businessName,
              daysRemaining,
              expiryDate,
            )
          : Promise.resolve(),
        needsPush
          ? notifyPartnerSubscriptionExpiring({
              partnerId: partner.id,
              daysRemaining,
              expiryDate,
            })
          : Promise.resolve(),
      ]);

      // For each channel that we claimed but failed to send, release the claim so
      // the next scheduler run can retry it without re-sending the successful channel.
      const resets: Partial<typeof partnersTable.$inferInsert> = {};

      if (needsEmail && emailResult.status === "rejected") {
        logger.warn(
          { err: (emailResult as PromiseRejectedResult).reason, partnerId: partner.id },
          "[subscription-expiry] email send failed — claim released for retry",
        );
        resets.subscriptionWarningEmailSentAt = null;
      }

      if (needsPush && pushResult.status === "rejected") {
        logger.warn(
          { err: (pushResult as PromiseRejectedResult).reason, partnerId: partner.id },
          "[subscription-expiry] push send failed — claim released for retry",
        );
        resets.subscriptionWarningPushSentAt = null;
      }

      if (Object.keys(resets).length > 0) {
        await db
          .update(partnersTable)
          .set(resets)
          .where(eq(partnersTable.id, partner.id));
      }

      const emailOk = !needsEmail || emailResult.status === "fulfilled";
      const pushOk = !needsPush || pushResult.status === "fulfilled";
      logger.info({ partnerId: partner.id, daysRemaining, emailOk, pushOk, needsEmail, needsPush }, "[subscription-expiry] notified");
    } catch (err) {
      logger.warn({ err, partnerId: partner.id }, "[subscription-expiry] failed for partner");
    }
  }
}

export function startSubscriptionExpiryScheduler(): void {
  const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
  const run = () => {
    checkExpiringSubscriptions().catch((err) => {
      logger.error({ err: { message: err?.message } }, "[subscription-expiry] scheduler run failed");
    });
  };
  // Delay first run slightly to let the server finish booting.
  setTimeout(run, 10_000);
  setInterval(run, INTERVAL_MS);
}

// Returns ids of partners with active subscription. Used to filter public visibility.
export async function getActivePartnerIds(): Promise<number[]> {
  const rows = await db
    .select({ id: partnersTable.id })
    .from(partnersTable)
    .where(and(eq(partnersTable.status, "approved"), gt(partnersTable.subscriptionUntil, new Date())));
  return rows.map((r) => r.id);
}

// Convenience helper for routes — fetches partner, returns 403 JSON if subscription inactive.
// Distinguishes the two reasons (pending admin approval vs. expired subscription) to give
// the client a clear error message.
export async function ensurePartnerSubscriptionActive(partnerId: number, res: any): Promise<boolean> {
  const [p] = await db.select().from(partnersTable).where(eq(partnersTable.id, partnerId));
  if (!p) {
    res.status(404).json({ error: "Partenaire introuvable." });
    return false;
  }
  if (p.status !== "approved") {
    res.status(403).json({
      error:
        p.status === "rejected"
          ? "Votre compte a été refusé par l'administrateur. Contactez le support si vous pensez qu'il s'agit d'une erreur."
          : "Votre compte est en attente de validation par l'administrateur. Vous pourrez créer vos lieux et événements une fois approuvé.",
      pendingApproval: p.status === "pending",
      rejected: p.status === "rejected",
      partnerStatus: p.status,
    });
    return false;
  }
  if (!isSubscriptionActive(p)) {
    res.status(403).json({
      error: "Votre abonnement est expiré. Renouvelez-le pour continuer à publier ou modifier vos lieux et événements.",
      subscriptionExpired: true,
      subscriptionUntil: p.subscriptionUntil ? new Date(p.subscriptionUntil).toISOString() : null,
    });
    return false;
  }
  return true;
}
