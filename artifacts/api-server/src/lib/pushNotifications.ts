import { db, pushTokensTable, eventsTable } from "@workspace/db";
import { and, eq, ilike, sql } from "drizzle-orm";
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

/**
 * Insère ou met à jour un token Expo push, avec ses préférences de routage
 * (ville, catégories favorites, langue). Le token est unique en base.
 */
export async function upsertPushToken(input: {
  token: string;
  platform?: string | null;
  city?: string | null;
  favoriteCategories?: string[] | null;
  language?: string | null;
}): Promise<void> {
  const { token } = input;
  if (!token || !token.startsWith("ExponentPushToken")) return;

  const platform = input.platform ?? null;
  const city = input.city ?? null;
  const favoriteCategories = input.favoriteCategories ?? [];
  const language = input.language ?? "fr";

  await db
    .insert(pushTokensTable)
    .values({
      token,
      platform,
      city,
      favoriteCategories,
      language,
    })
    .onConflictDoUpdate({
      target: pushTokensTable.token,
      set: {
        platform,
        city,
        favoriteCategories,
        language,
        updatedAt: new Date(),
      },
    });
}

export async function deletePushToken(token: string): Promise<void> {
  if (!token) return;
  await db.delete(pushTokensTable).where(eq(pushTokensTable.token, token));
}

/**
 * Envoie un lot de notifications via l'API Expo Push.
 * Découpe en chunks de 100 (limite Expo) et supprime les tokens
 * marqués DeviceNotRegistered.
 */
async function sendExpoPush(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  const chunks: ExpoPushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate",
  };
  if (EXPO_ACCESS_TOKEN) {
    headers["Authorization"] = `Bearer ${EXPO_ACCESS_TOKEN}`;
  }

  const tokensToDelete = new Set<string>();

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

      const json = (await res.json()) as { data?: Array<{ status: string; details?: { error?: string }; message?: string }> };
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
}

/**
 * Notifie les utilisateurs susceptibles d'être intéressés par un événement
 * qui vient d'être approuvé : ceux dont la ville correspond OU dont les
 * catégories favorites contiennent celle de l'événement.
 */
export async function notifyEventApproved(eventId: number): Promise<void> {
  try {
    const [event] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, eventId));

    if (!event || event.status !== "approved") return;

    // Sélectionne les tokens dont la ville matche (insensible à la casse) OU
    // dont la catégorie est dans favoriteCategories (jsonb).
    const cityMatch = event.city
      ? ilike(pushTokensTable.city, event.city)
      : sql`false`;
    const catMatch = event.category
      ? sql`${pushTokensTable.favoriteCategories} @> ${JSON.stringify([event.category])}::jsonb`
      : sql`false`;

    const recipients = await db
      .select({
        token: pushTokensTable.token,
        language: pushTokensTable.language,
        platform: pushTokensTable.platform,
      })
      .from(pushTokensTable)
      .where(sql`${cityMatch} OR ${catMatch}`);

    if (recipients.length === 0) {
      logger.info({ eventId }, "[push] no recipients for new event");
      return;
    }

    const messages: ExpoPushMessage[] = recipients.map((r) => {
      const isFr = (r.language ?? "fr") !== "en";
      const title = isFr
        ? event.titleFr || event.title
        : event.title || event.titleFr || "Nouvel événement";
      const body = isFr
        ? `Nouveau ${event.category ? event.category.toLowerCase() : "événement"} à ${event.city || "découvrir"} — ${event.date}${event.time ? ` à ${event.time}` : ""}.`
        : `New ${event.category ? event.category.toLowerCase() : "event"} in ${event.city || "your area"} — ${event.date}${event.time ? ` at ${event.time}` : ""}.`;

      return {
        to: r.token,
        title,
        body,
        sound: "default",
        priority: "high",
        channelId: "nearby_events",
        data: {
          type: "event_approved",
          eventId: String(event.id),
          city: event.city,
          category: event.category,
        },
      };
    });

    await sendExpoPush(messages);
    logger.info({ eventId, count: messages.length }, "[push] event approved notif sent");
  } catch (err) {
    logger.warn({ err, eventId }, "[push] notifyEventApproved failed");
  }
}
