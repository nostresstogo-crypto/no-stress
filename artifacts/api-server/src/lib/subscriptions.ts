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

// Checks partners whose subscription expires in exactly N days (1–5) and sends
// one email + one push notification per partner per day. Called by the daily scheduler.
//
// Deduplication is atomic at DB level: we attempt a conditional UPDATE that only
// succeeds when the partner has not yet been notified today. If two scheduler runs
// overlap (restart, multiple instances), only the one whose UPDATE affects 1 row
// will proceed to send — the other sees 0 rows and skips.
export async function checkExpiringSubscriptions(): Promise<void> {
  const now = new Date();

  // today 00:00:00 (server local time) — used as the exclusive lower bound for the "already sent today" check.
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Query window: subscriptions expiring within the next 1–5 calendar days.
  // [tomorrow 00:00, day+6 00:00) avoids end-of-day boundary ambiguity.
  const windowStart = new Date(todayStart);
  windowStart.setDate(windowStart.getDate() + 1); // tomorrow 00:00

  const windowEnd = new Date(todayStart);
  windowEnd.setDate(windowEnd.getDate() + 6); // day+6 00:00 (exclusive upper bound)

  const expiring = await db
    .select()
    .from(partnersTable)
    .where(
      and(
        eq(partnersTable.status, "approved"),
        gte(partnersTable.subscriptionUntil, windowStart),
        lt(partnersTable.subscriptionUntil, windowEnd),
      ),
    );

  if (expiring.length === 0) {
    logger.info("[subscription-expiry] no expiring subscriptions today");
    return;
  }

  logger.info({ count: expiring.length }, "[subscription-expiry] checking partners");

  for (const partner of expiring) {
    try {
      const expiryDate = new Date(partner.subscriptionUntil!);
      const msRemaining = expiryDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(msRemaining / 86_400_000);

      if (daysRemaining < 1 || daysRemaining > 5) continue;

      // Atomic claim: update only if not yet notified today.
      // This is race-safe: if two instances run simultaneously, only one will
      // get rowCount === 1 and proceed; the other skips.
      const claimed = await db
        .update(partnersTable)
        .set({ subscriptionWarningSentAt: now })
        .where(
          and(
            eq(partnersTable.id, partner.id),
            or(
              isNull(partnersTable.subscriptionWarningSentAt),
              lt(partnersTable.subscriptionWarningSentAt, todayStart),
            ),
          ),
        )
        .returning({ id: partnersTable.id });

      if (claimed.length === 0) {
        logger.info({ partnerId: partner.id }, "[subscription-expiry] already notified today, skipping");
        continue;
      }

      // Send both channels and inspect each result individually.
      const [emailResult, pushResult] = await Promise.allSettled([
        sendSubscriptionExpiryWarningEmail(
          partner.email,
          partner.contactName,
          partner.businessName,
          daysRemaining,
          expiryDate,
        ),
        notifyPartnerSubscriptionExpiring({
          partnerId: partner.id,
          daysRemaining,
          expiryDate,
        }),
      ]);

      const emailOk = emailResult.status === "fulfilled";
      const pushOk = pushResult.status === "fulfilled";

      if (!emailOk) {
        logger.warn(
          { err: (emailResult as PromiseRejectedResult).reason, partnerId: partner.id },
          "[subscription-expiry] email send failed",
        );
      }
      if (!pushOk) {
        logger.warn(
          { err: (pushResult as PromiseRejectedResult).reason, partnerId: partner.id },
          "[subscription-expiry] push send failed",
        );
      }

      if (!emailOk && !pushOk) {
        // Both channels failed — reset the claim so subsequent runs can retry today.
        await db
          .update(partnersTable)
          .set({ subscriptionWarningSentAt: null })
          .where(eq(partnersTable.id, partner.id));
        logger.warn({ partnerId: partner.id }, "[subscription-expiry] both channels failed, claim released for retry");
      } else {
        logger.info({ partnerId: partner.id, daysRemaining, emailOk, pushOk }, "[subscription-expiry] notified");
      }
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
