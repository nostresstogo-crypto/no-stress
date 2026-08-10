import "./instrument";
import app from "./app";
import { logger } from "./lib/logger";
import { startEventCleanupScheduler } from "./lib/eventCleanup";
import { startSubscriptionExpiryScheduler } from "./lib/subscriptions";
import { startEventRemindersScheduler } from "./lib/eventReminders";
import { runMigrations } from "./lib/migrations.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

function startKeepalive(serverPort: number) {
  const INTERVAL_MS = 4 * 60 * 1000;

  // Préfère l'URL publique Replit pour empêcher la mise en veille du container.
  // En prod déployée, REPLIT_DEV_DOMAIN n'est pas défini — on replie sur localhost.
  const replitDomain = process.env.REPLIT_DEV_DOMAIN;
  const pingUrl = replitDomain
    ? `https://${replitDomain}/api/health`
    : `http://localhost:${serverPort}/health`;

  setInterval(() => {
    fetch(pingUrl)
      .then(() => logger.debug("[keepalive] ping ok"))
      .catch((err) => logger.warn({ err: err?.message }, "[keepalive] ping failed"));
  }, INTERVAL_MS);

  logger.info({ pingUrl }, "[keepalive] auto-ping démarré (toutes les 4 min)");
}

// Run idempotent DDL migrations before accepting traffic
runMigrations()
  .then(() => {
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }

      logger.info({ port }, "Server listening");
      startEventCleanupScheduler();
      startSubscriptionExpiryScheduler();
      startEventRemindersScheduler();
      startKeepalive(port);
    });
  })
  .catch((err) => {
    logger.error({ err }, "[migrations] fatal — server will not start");
    process.exit(1);
  });
