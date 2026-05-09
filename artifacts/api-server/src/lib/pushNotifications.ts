import {
  db,
  pushTokensTable,
  eventsTable,
  venuesTable,
  favoritesTable,
} from "@workspace/db";
import { and, eq, ilike, inArray, sql } from "drizzle-orm";
import { logger } from "./logger.js";

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

// Returns true if at least one chunk was accepted by Expo (2xx), false if all failed.
async function sendExpoPush(messages: ExpoPushMessage[]): Promise<boolean> {
  if (messages.length === 0) return true;

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
  let anySuccess = false;

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
      anySuccess = true;
      const json = (await res.json()) as {
        data?: Array<{ status: string; details?: { error?: string } }>;
      };
      const tickets = json.data ?? [];
      tickets.forEach((ticket, idx) => {
        if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
          tokensToDelete.add(chunk[idx]!.to);
        }
      });
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

  return anySuccess;
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
  return Array.from(new Set(rows.map((r) => r.userId)));
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

  const expiryStr = input.expiryDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const { daysRemaining } = input;

  const messages = buildMessages(recipients, () => ({
    title: daysRemaining === 1 ? "Abonnement : dernier jour !" : `Abonnement : ${daysRemaining} jours restants`,
    body: `Votre abonnement NoStress expire le ${expiryStr}. Renouvelez-le pour continuer à publier vos événements.`,
    channelId: "default",
    data: { type: "subscription_expiring", daysRemaining: String(daysRemaining) },
  }));
  const ok = await sendExpoPush(messages);
  if (!ok) {
    throw new Error(`[push] all Expo chunks rejected for partner ${input.partnerId}`);
  }
  logger.info({ partnerId: input.partnerId, daysRemaining }, "[push] subscription expiry warning sent");
}

/* ─── 6. Validation/rejet pour un partenaire ─────────────────────────── */

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
