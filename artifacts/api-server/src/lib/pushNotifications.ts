import {
  db,
  pushTokensTable,
  eventsTable,
  venuesTable,
  favoritesTable,
  partnerNotificationsTable,
} from "@workspace/db";
import { and, eq, ilike, inArray, sql } from "drizzle-orm";
import { logger } from "./logger.js";

/* ─── persist a notification for a partner (always, regardless of push token) ── */

// Inserts the inbox row immediately (pushSent = 0) and returns its id so the
// caller can update it with the real delivery count once Expo has responded.
async function persistPartnerNotification(input: {
  partnerId: number;
  type: string;
  titleFr: string;
  titleEn: string;
  bodyFr: string;
  bodyEn: string;
  data?: Record<string, unknown>;
}): Promise<number | null> {
  try {
    const [row] = await db
      .insert(partnerNotificationsTable)
      .values({
        partnerId: input.partnerId,
        type: input.type,
        titleFr: input.titleFr,
        titleEn: input.titleEn,
        bodyFr: input.bodyFr,
        bodyEn: input.bodyEn,
        data: input.data ?? null,
        pushSent: 0, // updated after push attempt
      })
      .returning({ id: partnerNotificationsTable.id });
    return row?.id ?? null;
  } catch (err) {
    logger.warn({ err, partnerId: input.partnerId, type: input.type }, "[push] persistPartnerNotification failed");
    return null;
  }
}

// Updates pushSent on an already-persisted notification row once Expo responds.
async function updatePushSent(notificationId: number | null, pushSent: number): Promise<void> {
  if (notificationId == null) return;
  try {
    await db
      .update(partnerNotificationsTable)
      .set({ pushSent })
      .where(eq(partnerNotificationsTable.id, notificationId));
  } catch (err) {
    logger.warn({ err, notificationId }, "[push] updatePushSent failed");
  }
}

export type ExpoPushMessage = {
  to: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  priority?: "default" | "normal" | "high";
  channelId?: string;
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_ACCESS_TOKEN = process.env.EXPO_ACCESS_TOKEN;

/* ─── upsert / delete tokens ──────────────────────────────────────────── */

export async function upsertPushToken(input: {
  token: string;
  platform?: string | null;
  city?: string | null;
  favoriteCategories?: string[] | null;
  language?: string | null;
  userId?: number | null;
  partnerId?: number | null;
}): Promise<void> {
  const { token } = input;
  if (!token || !token.startsWith("ExponentPushToken")) return;

  const platform = input.platform ?? null;
  const city = input.city ?? null;
  const favoriteCategories = input.favoriteCategories ?? [];
  const language = input.language ?? "fr";
  const userId = input.userId ?? null;
  const partnerId = input.partnerId ?? null;

  await db
    .insert(pushTokensTable)
    .values({ token, platform, city, favoriteCategories, language, userId, partnerId })
    .onConflictDoUpdate({
      target: pushTokensTable.token,
      set: {
        platform,
        city,
        favoriteCategories,
        language,
        userId,
        partnerId,
        updatedAt: new Date(),
      },
    });
}

export async function deletePushToken(token: string): Promise<void> {
  if (!token) return;
  await db.delete(pushTokensTable).where(eq(pushTokensTable.token, token));
}

/* ─── low-level send ──────────────────────────────────────────────────── */

// Returns the number of tokens Expo accepted (tickets without DeviceNotRegistered errors
// in 2xx chunks). Returns 0 when all chunks fail or every token is unregistered.
async function sendExpoPush(messages: ExpoPushMessage[]): Promise<number> {
  if (messages.length === 0) return 0;

  const chunks: ExpoPushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate",
  };
  if (EXPO_ACCESS_TOKEN) headers["Authorization"] = `Bearer ${EXPO_ACCESS_TOKEN}`;

  const tokensToDelete = new Set<string>();
  let totalSent = 0;

  for (const chunk of chunks) {
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(chunk),
      });
      if (!res.ok) {
        logger.warn({ status: res.status }, "[push] expo send non-2xx");
        continue;
      }
      const json = (await res.json()) as {
        data?: Array<{ status: string; details?: { error?: string } }>;
      };
      const tickets = json.data ?? [];
      // Validate ticket-to-message cardinality before trusting counts
      if (tickets.length !== chunk.length) {
        logger.warn({ chunkLen: chunk.length, ticketLen: tickets.length }, "[push] ticket count mismatch — skipping delivery count for chunk");
        continue;
      }
      // Count only tickets Expo explicitly confirmed as "ok"
      let chunkOk = 0;
      tickets.forEach((ticket, idx) => {
        if (ticket.status === "ok") {
          chunkOk++;
        } else if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
          tokensToDelete.add(chunk[idx]!.to);
        }
        // Any other error status (invalid credentials, message, etc.) is not counted
      });
      totalSent += chunkOk;
    } catch (err) {
      logger.warn({ err }, "[push] expo send failed");
    }
  }

  if (tokensToDelete.size > 0) {
    try {
      for (const t of tokensToDelete) {
        await db.delete(pushTokensTable).where(eq(pushTokensTable.token, t));
      }
      logger.info({ count: tokensToDelete.size }, "[push] cleaned stale tokens");
    } catch (err) {
      logger.warn({ err }, "[push] cleanup failed");
    }
  }

  return totalSent;
}

/* ─── helpers ────────────────────────────────────────────────────────── */

type Recipient = { token: string; language: string | null };

async function tokensForUserIds(userIds: number[]): Promise<Recipient[]> {
  if (userIds.length === 0) return [];
  return db
    .select({ token: pushTokensTable.token, language: pushTokensTable.language })
    .from(pushTokensTable)
    .where(inArray(pushTokensTable.userId, userIds));
}

async function tokensForPartnerId(partnerId: number): Promise<Recipient[]> {
  return db
    .select({ token: pushTokensTable.token, language: pushTokensTable.language })
    .from(pushTokensTable)
    .where(eq(pushTokensTable.partnerId, partnerId));
}

async function userIdsFavoritingItem(
  itemType: "event" | "venue",
  itemId: number,
): Promise<number[]> {
  const rows = await db
    .select({ userId: favoritesTable.userId })
    .from(favoritesTable)
    .where(and(eq(favoritesTable.itemType, itemType), eq(favoritesTable.itemId, itemId)));
  return Array.from(new Set(rows.map((r) => r.userId).filter((id): id is number => id !== null)));
}

function buildMessages(
  recipients: Recipient[],
  build: (lang: "fr" | "en") => { title: string; body: string; data?: Record<string, unknown>; channelId?: string },
): ExpoPushMessage[] {
  return recipients.map((r) => {
    const lang: "fr" | "en" = (r.language ?? "fr") === "en" ? "en" : "fr";
    const m = build(lang);
    return {
      to: r.token,
      title: m.title,
      body: m.body,
      sound: "default",
      priority: "high",
      channelId: m.channelId ?? "default",
      data: m.data,
    };
  });
}

/* ─── 1. Évènement approuvé : ville + catégorie favorite + favoris du lieu ─ */

export async function notifyEventApproved(eventId: number): Promise<void> {
  try {
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
    if (!event || event.status !== "approved") return;

    const cityMatch = event.city ? ilike(pushTokensTable.city, event.city) : sql`false`;
    const catMatch = event.category
      ? sql`${pushTokensTable.favoriteCategories} @> ${JSON.stringify([event.category])}::jsonb`
      : sql`false`;

    const recipients = await db
      .select({ token: pushTokensTable.token, language: pushTokensTable.language })
      .from(pushTokensTable)
      .where(sql`${cityMatch} OR ${catMatch}`);

    const messages = buildMessages(recipients, (lang) => ({
      title: lang === "fr" ? (event.titleFr || event.title) : (event.title || event.titleFr || "New event"),
      body:
        lang === "fr"
          ? `Nouveau ${event.category ? event.category.toLowerCase() : "événement"} à ${event.city || "découvrir"} — ${event.date}${event.time ? ` à ${event.time}` : ""}.`
          : `New ${event.category ? event.category.toLowerCase() : "event"} in ${event.city || "your area"} — ${event.date}${event.time ? ` at ${event.time}` : ""}.`,
      channelId: "nearby_events",
      data: { type: "event_approved", eventId: String(event.id) },
    }));
    await sendExpoPush(messages);

    // Aussi : nouveaux event d'un lieu mis en favori par un user.
    if (event.venueId != null) {
      await notifyVenueNewEvent(event.id);
    }

    logger.info({ eventId, count: messages.length }, "[push] event approved sent");
  } catch (err) {
    logger.warn({ err, eventId }, "[push] notifyEventApproved failed");
  }
}

/* ─── 2. Modification d'un évènement → users qui l'ont mis en favori ─── */

export async function notifyEventUpdated(
  eventId: number,
  changedFields: string[] = [],
): Promise<void> {
  try {
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
    if (!event) return;

    const userIds = await userIdsFavoritingItem("event", eventId);
    if (userIds.length === 0) return;
    const recipients = await tokensForUserIds(userIds);
    if (recipients.length === 0) return;

    const fields = changedFields.length > 0 ? changedFields.join(", ") : "infos";

    const messages = buildMessages(recipients, (lang) => ({
      title: lang === "fr" ? "Un événement favori a été modifié" : "A favorite event was updated",
      body:
        lang === "fr"
          ? `${event.titleFr || event.title} a été mis à jour (${fields}).`
          : `${event.title || event.titleFr} was updated (${fields}).`,
      channelId: "default",
      data: { type: "event_updated", eventId: String(event.id) },
    }));
    await sendExpoPush(messages);
    logger.info({ eventId, count: messages.length }, "[push] event updated sent");
  } catch (err) {
    logger.warn({ err, eventId }, "[push] notifyEventUpdated failed");
  }
}

/* ─── 3. Modification d'un lieu → users qui l'ont mis en favori ──────── */

export async function notifyVenueUpdated(
  venueId: number,
  changedFields: string[] = [],
): Promise<void> {
  try {
    const [venue] = await db.select().from(venuesTable).where(eq(venuesTable.id, venueId));
    if (!venue) return;

    const userIds = await userIdsFavoritingItem("venue", venueId);
    if (userIds.length === 0) return;
    const recipients = await tokensForUserIds(userIds);
    if (recipients.length === 0) return;

    const fields = changedFields.length > 0 ? changedFields.join(", ") : "infos";

    const messages = buildMessages(recipients, (lang) => ({
      title: lang === "fr" ? "Un lieu favori a été modifié" : "A favorite venue was updated",
      body:
        lang === "fr"
          ? `${venue.name} a été mis à jour (${fields}).`
          : `${venue.name} was updated (${fields}).`,
      channelId: "default",
      data: { type: "venue_updated", venueId: String(venue.id) },
    }));
    await sendExpoPush(messages);
    logger.info({ venueId, count: messages.length }, "[push] venue updated sent");
  } catch (err) {
    logger.warn({ err, venueId }, "[push] notifyVenueUpdated failed");
  }
}

/* ─── 4. Nouvel évènement sur un lieu favori ─────────────────────────── */

export async function notifyVenueNewEvent(eventId: number): Promise<void> {
  try {
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
    if (!event || event.venueId == null) return;

    const userIds = await userIdsFavoritingItem("venue", event.venueId);
    if (userIds.length === 0) return;
    const recipients = await tokensForUserIds(userIds);
    if (recipients.length === 0) return;

    const [venue] = await db.select().from(venuesTable).where(eq(venuesTable.id, event.venueId));
    const venueName = venue?.name || "un lieu favori";

    const messages = buildMessages(recipients, (lang) => ({
      title:
        lang === "fr"
          ? `Nouvel événement à ${venueName}`
          : `New event at ${venueName}`,
      body:
        lang === "fr"
          ? `${event.titleFr || event.title} — ${event.date}${event.time ? ` à ${event.time}` : ""}.`
          : `${event.title || event.titleFr} — ${event.date}${event.time ? ` at ${event.time}` : ""}.`,
      channelId: "nearby_events",
      data: { type: "venue_new_event", eventId: String(event.id), venueId: String(event.venueId) },
    }));
    await sendExpoPush(messages);
    logger.info({ eventId, count: messages.length }, "[push] venue new event sent");
  } catch (err) {
    logger.warn({ err, eventId }, "[push] notifyVenueNewEvent failed");
  }
}

/* ─── 5. Alerte fin d'abonnement pour un partenaire ─────────────────── */

export async function notifyPartnerSubscriptionExpiring(input: {
  partnerId: number;
  daysRemaining: number;
  expiryDate: Date;
}): Promise<void> {
  // Errors propagate to caller — callers rely on rejection to detect delivery failures.
  const recipients = await tokensForPartnerId(input.partnerId);
  if (recipients.length === 0) return;

  const expiryStrFr = input.expiryDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const expiryStrEn = input.expiryDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const { daysRemaining } = input;

  const messages = buildMessages(recipients, (lang) => ({
    title: lang === "en"
      ? (daysRemaining === 1 ? "Subscription: last day!" : `Subscription: ${daysRemaining} days left`)
      : (daysRemaining === 1 ? "Abonnement : dernier jour !" : `Abonnement : ${daysRemaining} jours restants`),
    body: lang === "en"
      ? `Your NoStress subscription expires on ${expiryStrEn}. Renew it to keep publishing your events.`
      : `Votre abonnement NoStress expire le ${expiryStrFr}. Renouvelez-le pour continuer à publier vos événements.`,
    channelId: "default",
    data: { type: "subscription_expiring", daysRemaining: String(daysRemaining), screen: "/(tabs)/account" },
  }));
  const sent = await sendExpoPush(messages);
  if (sent === 0) {
    throw new Error(`[push] all Expo chunks rejected for partner ${input.partnerId}`);
  }
  logger.info({ partnerId: input.partnerId, daysRemaining, sent }, "[push] subscription expiry warning sent");
}

/* ─── 6. Rappel avant événement → users ayant mis en favori ─────────── */

export async function notifyEventReminderUser(input: {
  event: { id: number; title: string | null; titleFr: string | null; date: string; time: string | null; city: string | null };
  type: "24h" | "2h";
  userIds: number[];
}): Promise<void> {
  if (input.userIds.length === 0) return;
  try {
    const recipients = await tokensForUserIds(input.userIds);
    if (recipients.length === 0) return;

    const { event, type } = input;
    const timeLabel = event.time ? ` à ${event.time}` : "";
    const messages = buildMessages(recipients, (lang) => ({
      title:
        lang === "fr"
          ? type === "24h"
            ? "🎉 Événement dans 24h"
            : "⏰ Événement dans 2h"
          : type === "24h"
            ? "🎉 Event in 24 hours"
            : "⏰ Event in 2 hours",
      body:
        lang === "fr"
          ? `${event.titleFr || event.title} — ${event.date}${timeLabel}.`
          : `${event.title || event.titleFr} — ${event.date}${timeLabel}.`,
      channelId: "event_reminders",
      data: { type: `event_reminder_${type}`, eventId: String(event.id) },
    }));
    await sendExpoPush(messages);
    logger.info({ eventId: event.id, type, count: messages.length }, "[push] event reminder user sent");
  } catch (err) {
    logger.warn({ err, eventId: input.event.id }, "[push] notifyEventReminderUser failed");
  }
}

/* ─── 7. Rappel avant événement → partenaires ayant mis en favori ────── */

export async function notifyEventReminderPartners(input: {
  event: { id: number; title: string | null; titleFr: string | null; date: string; time: string | null };
  type: "24h" | "2h";
  partnerIds: number[];
}): Promise<void> {
  if (input.partnerIds.length === 0) return;
  try {
    const recipients = await db
      .select({ token: pushTokensTable.token, language: pushTokensTable.language })
      .from(pushTokensTable)
      .where(inArray(pushTokensTable.partnerId, input.partnerIds));
    if (recipients.length === 0) return;

    const { event, type } = input;
    const timeLabel = event.time ? ` à ${event.time}` : "";
    const messages = buildMessages(recipients, (lang) => ({
      title:
        lang === "fr"
          ? type === "24h"
            ? "🎉 Événement dans 24h"
            : "⏰ Événement dans 2h"
          : type === "24h"
            ? "🎉 Event in 24 hours"
            : "⏰ Event in 2 hours",
      body:
        lang === "fr"
          ? `${event.titleFr || event.title} — ${event.date}${timeLabel}.`
          : `${event.title || event.titleFr} — ${event.date}${timeLabel}.`,
      channelId: "event_reminders",
      data: { type: `event_reminder_${type}`, eventId: String(event.id) },
    }));
    await sendExpoPush(messages);
    logger.info({ eventId: event.id, type, count: messages.length }, "[push] event reminder partners sent");
  } catch (err) {
    logger.warn({ err, eventId: input.event.id }, "[push] notifyEventReminderPartners failed");
  }
}

/* ─── 8b. Avis modéré → auteur de l'avis ───────────────────────────── */

export async function notifyReviewModerationUser(input: {
  userId: number | null;
  partnerId: number | null;
  status: "approved" | "rejected";
  itemType: "event" | "venue";
  itemId: number;
}): Promise<void> {
  try {
    let recipients: Recipient[] = [];
    if (input.userId != null) {
      recipients = await tokensForUserIds([input.userId]);
    } else if (input.partnerId != null) {
      recipients = await tokensForPartnerId(input.partnerId);
    }
    if (recipients.length === 0) return;

    const { status, itemType } = input;
    const messages = buildMessages(recipients, (lang) => {
      const item = lang === "fr"
        ? (itemType === "event" ? "événement" : "lieu")
        : (itemType === "event" ? "event" : "venue");
      return {
        title: status === "approved"
          ? (lang === "fr" ? "✅ Avis publié" : "✅ Review published")
          : (lang === "fr" ? "Avis non publié" : "Review not published"),
        body: status === "approved"
          ? (lang === "fr" ? `Votre avis sur cet ${item} a été approuvé et est maintenant visible.` : `Your review on this ${item} has been approved and is now visible.`)
          : (lang === "fr" ? `Votre avis sur cet ${item} n'a pas été publié par notre équipe.` : `Your review on this ${item} was not published by our team.`),
        channelId: "default",
        data: { type: "review_moderated", status, itemType, itemId: String(input.itemId) },
      };
    });
    await sendExpoPush(messages);
    logger.info({ userId: input.userId, partnerId: input.partnerId, status }, "[push] review moderation sent");
  } catch (err) {
    logger.warn({ err }, "[push] notifyReviewModerationUser failed");
  }
}

/* ─── 8c. Avis approuvé → partenaire propriétaire de l'item ────────── */

export async function notifyPartnerReviewApproved(input: {
  partnerId: number;
  itemType: "event" | "venue";
  itemId: number;
  rating: number;
  comment: string | null;
}): Promise<void> {
  try {
    const recipients = await tokensForPartnerId(input.partnerId);
    if (recipients.length === 0) return;

    const { itemType, rating, comment } = input;
    const messages = buildMessages(recipients, (lang) => {
      const item = lang === "fr" ? (itemType === "event" ? "événement" : "lieu") : (itemType === "event" ? "event" : "venue");
      const snippet = comment ? ` "${comment.slice(0, 60)}${comment.length > 60 ? "…" : ""}"` : "";
      return {
        title: lang === "fr" ? `⭐ Nouvel avis sur votre ${item}` : `⭐ New review on your ${item}`,
        body: lang === "fr"
          ? `Note ${rating}/5.${snippet}`
          : `Rating ${rating}/5.${snippet}`,
        channelId: "default",
        data: { type: "review_approved", itemType, itemId: String(input.itemId) },
      };
    });
    await sendExpoPush(messages);
    logger.info({ partnerId: input.partnerId, itemType }, "[push] partner review approved sent");
  } catch (err) {
    logger.warn({ err }, "[push] notifyPartnerReviewApproved failed");
  }
}

/* ─── 9. Compte partenaire approuvé par l'admin ─────────────────────── */

export async function notifyPartnerAccountApproved(partnerId: number): Promise<void> {
  const titleFr = "✅ Compte approuvé !";
  const titleEn = "✅ Account approved!";
  const bodyFr = "Votre compte NoStress a été validé. Vous pouvez maintenant publier vos événements et profiter de votre abonnement.";
  const bodyEn = "Your NoStress account has been approved. You can now publish your events and enjoy your subscription.";
  try {
    // Persist first — the inbox entry exists even if push subsequently fails
    const notifId = await persistPartnerNotification({ partnerId, type: "account_approved", titleFr, titleEn, bodyFr, bodyEn, data: { screen: "/(tabs)/account" } });
    const recipients = await tokensForPartnerId(partnerId);
    if (recipients.length > 0) {
      const messages = buildMessages(recipients, (lang) => ({
        title: lang === "fr" ? titleFr : titleEn,
        body: lang === "fr" ? bodyFr : bodyEn,
        channelId: "default",
        data: { type: "account_approved", screen: "/(tabs)/account" },
      }));
      const pushSent = await sendExpoPush(messages);
      await updatePushSent(notifId, pushSent);
      logger.info({ partnerId, pushSent }, "[push] partner account approved sent");
    } else {
      logger.info({ partnerId }, "[push] partner account approved: no push tokens, inbox only");
    }
  } catch (err) {
    logger.warn({ err, partnerId }, "[push] notifyPartnerAccountApproved failed");
  }
}

/* ─── 10. Compte partenaire rejeté par l'admin ────────────────────────── */

export async function notifyPartnerAccountRejected(
  partnerId: number,
  reason: string | null,
): Promise<void> {
  const reasonPartFr = reason ? ` Motif : ${reason}` : "";
  const reasonPartEn = reason ? ` Reason: ${reason}` : "";
  const titleFr = "❌ Demande non approuvée";
  const titleEn = "❌ Application not approved";
  const bodyFr = `Votre demande de compte partenaire NoStress n'a pas été acceptée.${reasonPartFr}`;
  const bodyEn = `Your NoStress partner account application was not accepted.${reasonPartEn}`;
  try {
    // Persist first — the inbox entry exists even if push subsequently fails
    const notifId = await persistPartnerNotification({ partnerId, type: "account_rejected", titleFr, titleEn, bodyFr, bodyEn, data: { screen: "/(tabs)/account" } });
    const recipients = await tokensForPartnerId(partnerId);
    if (recipients.length > 0) {
      const messages = buildMessages(recipients, (lang) => ({
        title: lang === "fr" ? titleFr : titleEn,
        body: lang === "fr" ? bodyFr : bodyEn,
        channelId: "default",
        data: { type: "account_rejected", screen: "/(tabs)/account" },
      }));
      const pushSent = await sendExpoPush(messages);
      await updatePushSent(notifId, pushSent);
      logger.info({ partnerId, pushSent }, "[push] partner account rejected sent");
    } else {
      logger.info({ partnerId }, "[push] partner account rejected: no push tokens, inbox only");
    }
  } catch (err) {
    logger.warn({ err, partnerId }, "[push] notifyPartnerAccountRejected failed");
  }
}

/* ─── 11. Événement supprimé par l'admin ─────────────────────────────── */

export async function notifyPartnerEventDeleted(input: {
  partnerId: number;
  eventTitle: string | null;
  reason: string | null;
}): Promise<void> {
  const nameFr = input.eventTitle || "Votre publication";
  const nameEn = input.eventTitle || "Your event";
  const reasonPartFr = input.reason ? ` Motif : ${input.reason}` : "";
  const reasonPartEn = input.reason ? ` Reason: ${input.reason}` : "";
  const titleFr = "⚠️ Publication supprimée";
  const titleEn = "⚠️ Event removed";
  const bodyFr = `« ${nameFr} » a été retiré par l'équipe NoStress.${reasonPartFr}`;
  const bodyEn = `"${nameEn}" was removed by the NoStress team.${reasonPartEn}`;
  try {
    // Persist first — the inbox entry exists even if push subsequently fails
    const notifId = await persistPartnerNotification({ partnerId: input.partnerId, type: "event_deleted", titleFr, titleEn, bodyFr, bodyEn, data: { screen: "/(tabs)/events" } });
    const recipients = await tokensForPartnerId(input.partnerId);
    if (recipients.length > 0) {
      const messages = buildMessages(recipients, (lang) => ({
        title: lang === "fr" ? titleFr : titleEn,
        body: lang === "fr" ? bodyFr : bodyEn,
        channelId: "default",
        data: { type: "event_deleted", screen: "/(tabs)/events" },
      }));
      const pushSent = await sendExpoPush(messages);
      await updatePushSent(notifId, pushSent);
      logger.info({ partnerId: input.partnerId, pushSent }, "[push] partner event deleted sent");
    } else {
      logger.info({ partnerId: input.partnerId }, "[push] partner event deleted: no push tokens, inbox only");
    }
  } catch (err) {
    logger.warn({ err, partnerId: input.partnerId }, "[push] notifyPartnerEventDeleted failed");
  }
}

/* ─── 12. Abonnement étendu par l'admin ──────────────────────────────── */

export async function notifyPartnerSubscriptionExtended(input: {
  partnerId: number;
  months: number;
  newUntil: Date;
}): Promise<void> {
  const newUntilFr = input.newUntil.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const newUntilEn = input.newUntil.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const { months } = input;
  const titleFr = "✅ Abonnement prolongé";
  const titleEn = "✅ Subscription extended";
  const bodyFr = `Votre abonnement NoStress a été prolongé de ${months} mois. Nouvelle expiration : ${newUntilFr}.`;
  const bodyEn = `Your NoStress subscription has been extended by ${months} month${months > 1 ? "s" : ""}. New expiry: ${newUntilEn}.`;
  try {
    // Persist first — the inbox entry exists even if push subsequently fails
    const notifId = await persistPartnerNotification({ partnerId: input.partnerId, type: "subscription_extended", titleFr, titleEn, bodyFr, bodyEn, data: { screen: "/(tabs)/account" } });
    const recipients = await tokensForPartnerId(input.partnerId);
    if (recipients.length > 0) {
      const messages = buildMessages(recipients, (lang) => ({
        title: lang === "fr" ? titleFr : titleEn,
        body: lang === "fr" ? bodyFr : bodyEn,
        channelId: "default",
        data: { type: "subscription_extended", screen: "/(tabs)/account" },
      }));
      const pushSent = await sendExpoPush(messages);
      await updatePushSent(notifId, pushSent);
      logger.info({ partnerId: input.partnerId, months, pushSent }, "[push] subscription extended sent");
    } else {
      logger.info({ partnerId: input.partnerId }, "[push] subscription extended: no push tokens, inbox only");
    }
  } catch (err) {
    logger.warn({ err, partnerId: input.partnerId }, "[push] notifyPartnerSubscriptionExtended failed");
  }
}

/* ─── 13. Mot de passe modifié ───────────────────────────────────────── */

export async function notifyPasswordChanged(input: {
  id: number;
  role: "user" | "partner";
}): Promise<void> {
  try {
    const recipients = input.role === "partner"
      ? await tokensForPartnerId(input.id)
      : await tokensForUserIds([input.id]);
    if (recipients.length === 0) return;

    const messages = buildMessages(recipients, (lang) => ({
      title: lang === "fr" ? "🔒 Mot de passe modifié" : "🔒 Password changed",
      body: lang === "fr"
        ? "Votre mot de passe NoStress vient d'être modifié. Si vous n'êtes pas à l'origine de cette action, contactez-nous."
        : "Your NoStress password has just been changed. If you didn't do this, please contact us.",
      channelId: "default",
      data: { type: "password_changed" },
    }));
    await sendExpoPush(messages);
    logger.info({ id: input.id, role: input.role }, "[push] password changed sent");
  } catch (err) {
    logger.warn({ err, id: input.id, role: input.role }, "[push] notifyPasswordChanged failed");
  }
}

/* ─── 8. Validation/rejet pour un partenaire ─────────────────────────── */

export async function notifyPartnerStatus(input: {
  partnerId: number;
  itemType: "event" | "venue";
  itemName: string;
  status: "approved" | "rejected";
  reason?: string | null;
  itemId: number;
}): Promise<void> {
  try {
    const recipients = await tokensForPartnerId(input.partnerId);
    if (recipients.length === 0) return;

    const isFr = true; // Partners default FR; we could refine later.
    const isEvent = input.itemType === "event";
    const approved = input.status === "approved";

    const messages = buildMessages(recipients, (lang) => {
      const fr = lang === "fr" || isFr;
      const itemFr = isEvent ? "événement" : "lieu";
      const itemEn = isEvent ? "event" : "venue";
      const verbFr = approved ? "validé" : "refusé";
      const verbEn = approved ? "approved" : "rejected";
      const title = fr
        ? `Votre ${itemFr} a été ${verbFr}`
        : `Your ${itemEn} was ${verbEn}`;
      const reasonPart = input.reason
        ? fr
          ? ` Motif : ${input.reason}`
          : ` Reason: ${input.reason}`
        : "";
      const body = fr
        ? `${input.itemName} a été ${verbFr} par l'administrateur.${reasonPart}`
        : `${input.itemName} was ${verbEn} by the administrator.${reasonPart}`;
      return {
        title,
        body,
        channelId: "default",
        data: { type: `${input.itemType}_${input.status}`, itemId: String(input.itemId) },
      };
    });
    await sendExpoPush(messages);
    logger.info(
      { partnerId: input.partnerId, type: input.itemType, status: input.status },
      "[push] partner status sent",
    );
  } catch (err) {
    logger.warn({ err, ...input }, "[push] notifyPartnerStatus failed");
  }
}
