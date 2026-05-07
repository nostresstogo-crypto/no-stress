import { db, partnersTable } from "@workspace/db";
import { and, eq, gt, sql } from "drizzle-orm";

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

export function subscriptionInfo(p: { status?: string | null; subscriptionUntil?: Date | null } | null | undefined) {
  if (!p) return { active: false, subscriptionUntil: null, daysRemaining: 0 };
  const until = p.subscriptionUntil ? new Date(p.subscriptionUntil) : null;
  const active = isSubscriptionActive(p);
  const daysRemaining = until ? Math.max(0, Math.ceil((until.getTime() - Date.now()) / 86_400_000)) : 0;
  return { active, subscriptionUntil: until ? until.toISOString() : null, daysRemaining };
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
export async function ensurePartnerSubscriptionActive(partnerId: number, res: any): Promise<boolean> {
  const [p] = await db.select().from(partnersTable).where(eq(partnersTable.id, partnerId));
  if (!p) {
    res.status(404).json({ error: "Partenaire introuvable." });
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
