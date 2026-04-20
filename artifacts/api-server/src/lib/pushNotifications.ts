import { db, pushTokensTable, eventsTable } from "@workspace/db";
import { eq, or, sql } from "drizzle-orm";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_TOKEN_REGEX = /^ExpUnentToken\[.+\]$|^ExponentPushToken\[.+\]$/;

export type ExpoPushMessage = {
  to: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  priority?: "default" | "normal" | "high";
  channelId?: string;
};

function isValidExpoToken(token: string): boolean {
  return /^(Exponent|Expo)PushToken\[.+\]$/.test(token);
}

const MAX_RECIPIENTS_PER_EVENT = 5000;

async function sendInChunks(messages: ExpoPushMessage[]): Promise<void> {
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.warn("[push] Expo API error:", res.status, json);
        continue;
      }
      const data: any[] = Array.isArray(json?.data) ? json.data : [];
      const stale: string[] = [];
      data.forEach((entry, idx) => {
        if (entry?.status === "error") {
          const err = entry?.details?.error;
          if (err === "DeviceNotRegistered") {
            const tok = chunk[idx]?.to;
            if (tok) stale.push(tok);
          }
        }
      });
      if (stale.length) {
        await db
          .delete(pushTokensTable)
          .where(or(...stale.map((t) => eq(pushTokensTable.token, t))));
        console.log(`[push] Removed ${stale.length} stale tokens`);
      }
    } catch (err) {
      console.error("[push] send failed:", err);
    }
  }
}

export async function notifyEventApproved(eventId: number): Promise<void> {
  try {
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
    if (!event) return;

    const tokens = await db.select().from(pushTokensTable);
    if (!tokens.length) return;

    const matches = tokens.filter((t) => {
      if (!t.city || !event.city) return false;
      const cityMatch = event.city.trim().toLowerCase() === t.city.trim().toLowerCase();
      if (!cityMatch) return false;
      const cats = Array.isArray(t.favoriteCategories) ? (t.favoriteCategories as string[]) : [];
      if (cats.length === 0 || !event.category) return true;
      return cats.some(
        (c) => typeof c === "string" && c.toLowerCase() === event.category!.toLowerCase()
      );
    }).slice(0, MAX_RECIPIENTS_PER_EVENT);
    if (!matches.length) {
      console.log(`[push] Event ${eventId} approved — no matching subscribers`);
      return;
    }

    const titleFr = event.titleFr || event.title;
    const titleEn = event.title || event.titleFr || "";
    const cityLabel = event.city ? ` à ${event.city}` : "";

    const messages: ExpoPushMessage[] = matches
      .filter((t) => isValidExpoToken(t.token))
      .map((t) => {
        const lang = t.language === "en" ? "en" : "fr";
        return {
          to: t.token,
          sound: "default",
          priority: "high",
          channelId: "default",
          title: lang === "fr" ? `🎉 Nouvel événement${cityLabel}` : `🎉 New event${event.city ? ` in ${event.city}` : ""}`,
          body: lang === "fr" ? titleFr : titleEn,
          data: { type: "event", eventId: event.id, url: `/event/${event.id}` },
        };
      });

    if (!messages.length) return;
    console.log(`[push] Sending ${messages.length} notifications for event ${eventId}`);
    await sendInChunks(messages);
  } catch (err) {
    console.error("[push] notifyEventApproved failed:", err);
  }
}

export async function upsertPushToken(input: {
  token: string;
  platform?: string | null;
  city?: string | null;
  favoriteCategories?: string[] | null;
  language?: string | null;
}): Promise<void> {
  if (!isValidExpoToken(input.token)) {
    throw new Error("Invalid Expo push token");
  }
  const values = {
    token: input.token,
    platform: input.platform ?? null,
    city: input.city ?? null,
    favoriteCategories: input.favoriteCategories ?? [],
    language: input.language ?? "fr",
    updatedAt: new Date(),
  };
  await db
    .insert(pushTokensTable)
    .values(values)
    .onConflictDoUpdate({
      target: pushTokensTable.token,
      set: {
        platform: values.platform,
        city: values.city,
        favoriteCategories: values.favoriteCategories,
        language: values.language,
        updatedAt: values.updatedAt,
      },
    });
}

export async function deletePushToken(token: string): Promise<void> {
  await db.delete(pushTokensTable).where(eq(pushTokensTable.token, token));
}

void EXPO_TOKEN_REGEX;
void sql;
