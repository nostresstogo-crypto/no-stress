import { pool } from "@workspace/db";
import { logger } from "./logger.js";

/**
 * Idempotent DDL migrations — run once at server startup.
 * Each statement uses IF NOT EXISTS / IF EXISTS so re-runs are safe.
 * Add new migrations at the end; never remove or edit existing ones.
 */
const migrations: Array<{ name: string; sql: string }> = [
  {
    name: "create_partner_notifications",
    sql: `
      CREATE TABLE IF NOT EXISTS partner_notifications (
        id           SERIAL PRIMARY KEY,
        partner_id   INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
        type         TEXT NOT NULL,
        title_fr     TEXT NOT NULL,
        title_en     TEXT NOT NULL,
        body_fr      TEXT NOT NULL,
        body_en      TEXT NOT NULL,
        data         JSONB,
        push_sent    INTEGER NOT NULL DEFAULT 0,
        read_at      TIMESTAMP,
        created_at   TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS partner_notifications_partner_id_idx
        ON partner_notifications (partner_id);
      CREATE INDEX IF NOT EXISTS partner_notifications_created_at_idx
        ON partner_notifications (created_at DESC);
    `,
  },
];

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    for (const migration of migrations) {
      try {
        await client.query(migration.sql);
        logger.debug({ migration: migration.name }, "[migrations] applied");
      } catch (err) {
        logger.error({ err, migration: migration.name }, "[migrations] FAILED — server will not start");
        throw err;
      }
    }
    logger.info({ count: migrations.length }, "[migrations] all up-to-date");
  } finally {
    client.release();
  }
}
