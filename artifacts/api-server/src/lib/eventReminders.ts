import { db, eventsTable, favoritesTable } from "@workspace/db";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { logger } from "./logger.js";
import { notifyEventReminderUser, notifyEventReminderPartner } from "./pushNotifications.js";

const RUN_INTERVAL_MS = 30 * 60 * 1000;
const INITIAL_DELAY_MS = 90_000;

const WINDOW_24H_MIN_MS = (24 - 0.5) * 60 * 60 * 1000;
const WINDOW_24H_MAX_MS = (24 + 0.5) * 60 * 60 * 1000;
const WINDOW_2H_MIN_MS = (2 - 0.5) * 60 * 60 * 1000;
const WINDOW_2H_MAX_MS = (2 + 0.5) * 60 * 60 * 1000;

function parseEventDatetime(date: string, time: string | null): Date | null {
  try {
    const t = (time ?? "00:00").split(":").slice(0, 2).join(":");
    const d = new Date(`${date}T${t}:00`);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

async function runEventReminders(): Promise<void> {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const maxDateStr = new Date(now.getTime() + WINDOW_24H_MAX_MS + 60_000).toISOString().slice(0, 10);

  const candidates = await db
    .select()
    .from(eventsTable)
    .where(
      and(
        eq(eventsTable.status, "approved"),
        gte(eventsTable.date, todayStr),
        lte(eventsTable.date, maxDateStr),
      ),
    );

  if (candidates.length === 0) return;

  const events24h: typeof candidates = [];
  const events2h: typeof candidates = [];

  for (const e of candidates) {
    const dt = parseEventDatetime(e.date, e.time);
    if (!dt) continue;
    const ms = dt.getTime() - now.getTime();
    if (ms >= WINDOW_24H_MIN_MS && ms <= WINDOW_24H_MAX_MS) events24h.push(e);
    else if (ms >= WINDOW_2H_MIN_MS && ms <= WINDOW_2H_MAX_MS) events2h.push(e);
  }

  logger.info(
    { total: candidates.length, in24h: events24h.length, in2h: events2h.length },
    "[event-reminders] scan complete",
  );

  await processReminders(events24h, "24h", now);
  await processReminders(events2h, "2h", now);
}

async function processReminders(
  events: typeof eventsTable.$inferSelect[],
  type: "24h" | "2h",
  now: Date,
): Promise<void> {
  const reminderField = type === "24h" ? favoritesTable.reminder24hSentAt : favoritesTable.reminder2hSentAt;
  const partnerField = type === "24h" ? eventsTable.partnerReminder24hSentAt : eventsTable.partnerReminder2hSentAt;

  for (const event of events) {
    try {
      const claimedFavs = await db
        .update(favoritesTable)
        .set({ [type === "24h" ? "reminder24hSentAt" : "reminder2hSentAt"]: now })
        .where(
          and(
            eq(favoritesTable.itemType, "event"),
            eq(favoritesTable.itemId, event.id),
            isNull(reminderField),
          ),
        )
        .returning({ userId: favoritesTable.userId });

      if (claimedFavs.length > 0) {
        const userIds = claimedFavs.map((f) => f.userId);
        await notifyEventReminderUser({ event, type, userIds });
      }

      if (event.partnerId) {
        const [claimedPartner] = await db
          .update(eventsTable)
          .set({ [type === "24h" ? "partnerReminder24hSentAt" : "partnerReminder2hSentAt"]: now } as any)
          .where(and(eq(eventsTable.id, event.id), isNull(partnerField as any)))
          .returning({ id: eventsTable.id });

        if (claimedPartner) {
          await notifyEventReminderPartner({ event, type });
        }
      }
    } catch (err) {
      logger.warn({ err, eventId: event.id, type }, "[event-reminders] failed for event");
    }
  }
}

export function startEventRemindersScheduler(): void {
  logger.info({ intervalMin: RUN_INTERVAL_MS / 60_000 }, "[event-reminders] scheduler registered");
  setTimeout(() => {
    runEventReminders().catch((err) =>
      logger.warn({ err }, "[event-reminders] initial run failed"),
    );
    setInterval(() => {
      runEventReminders().catch((err) =>
        logger.warn({ err }, "[event-reminders] scheduled run failed"),
      );
    }, RUN_INTERVAL_MS);
  }, INITIAL_DELAY_MS);
}
