import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";

const router: IRouter = Router();

// Liveness — process is up. Cheap, no external deps. Use this for orchestrator
// liveness probes (Replit deployments, k8s, etc.).
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Readiness — server is up AND can talk to its dependencies (DB).
// Use this for load-balancer health checks where you want bad instances out.
router.get("/readyz", async (_req, res) => {
  const checks: Record<string, "ok" | "fail"> = {};
  let ok = true;
  try {
    await db.execute(sql`select 1`);
    checks.db = "ok";
  } catch {
    checks.db = "fail";
    ok = false;
  }
  res.status(ok ? 200 : 503).json({ status: ok ? "ok" : "degraded", checks });
});

// Sentry test — throws so we can confirm errors flow into Sentry.
// Safe in prod (just throws once per call, captured by setupExpressErrorHandler).
router.get("/_sentry-test", (_req, _res) => {
  throw new Error("sentry-test-" + Date.now());
});

export default router;
