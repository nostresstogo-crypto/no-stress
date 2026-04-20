import { eq, and } from "drizzle-orm";
import { db, eventsTable } from "@workspace/db";
import { logger } from "./logger";

const ARCHIVE_AFTER_DAYS = 30;
const RUN_INTERVAL_MS = 6 * 60 * 60 * 1000;

function parseEventDate(date: string | null | undefined): Date | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isFinite(d.getTime())) return d;
  return null;
}

export async function archiveExpiredEvents(): Promise<{ scanned: number; archived: number }> {
  const cutoff = new Date(Date.now() - ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.status, "approved"));

  let archived = 0;
  for (const row of rows) {
    const d = parseEventDate(row.date);
    if (!d || d > cutoff) continue;
    await db
      .update(eventsTable)
      .set({ status: "archived" })
      .where(and(eq(eventsTable.id, row.id), eq(eventsTable.status, "approved")));
    archived++;
  }
  return { scanned: rows.length, archived };
}

export function startEventCleanupScheduler(): void {
  const run = () => {
    archiveExpiredEvents()
      .then(({ scanned, archived }) => {
        if (archived > 0) {
          logger.info({ scanned, archived }, "[event-cleanup] archived expired events");
        }
      })
      .catch((err) => {
        logger.error({ err: { message: err?.message } }, "[event-cleanup] failed");
      });
  };
  setTimeout(run, 5_000);
  setInterval(run, RUN_INTERVAL_MS);
}
