import { Router, type IRouter } from "express";
import { upsertPushToken, deletePushToken } from "../lib/pushNotifications.js";
import { rateLimit, verifyToken } from "../lib/auth-utils.js";

const router: IRouter = Router();

const pushLimiter = rateLimit({ windowMs: 60_000, max: 10, key: "push" });

function authIds(req: any): { userId: number | null; partnerId: number | null } {
  const auth = req.headers["authorization"];
  if (typeof auth !== "string" || !auth.startsWith("Bearer ")) {
    return { userId: null, partnerId: null };
  }
  const payload = verifyToken(auth.slice(7));
  if (!payload?.sub) return { userId: null, partnerId: null };
  if (payload.sub.startsWith("u_")) {
    const id = parseInt(payload.sub.slice(2), 10);
    return { userId: Number.isFinite(id) ? id : null, partnerId: null };
  }
  if (payload.sub.startsWith("p_")) {
    const id = parseInt(payload.sub.slice(2), 10);
    return { userId: null, partnerId: Number.isFinite(id) ? id : null };
  }
  return { userId: null, partnerId: null };
}

router.post("/push/register", pushLimiter, async (req, res) => {
  try {
    const { token, platform, city, favoriteCategories, language } = req.body || {};
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "token required" });
    }
    const { userId, partnerId } = authIds(req);
    await upsertPushToken({
      token,
      platform: typeof platform === "string" ? platform : null,
      city: typeof city === "string" ? city : null,
      favoriteCategories: Array.isArray(favoriteCategories)
        ? favoriteCategories.filter((c) => typeof c === "string")
        : [],
      language: typeof language === "string" ? language : "fr",
      userId,
      partnerId,
    });
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[push/register]", err);
    res.status(400).json({ error: err?.message || "failed" });
  }
});

router.post("/push/unregister", async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "token required" });
    }
    await deletePushToken(token);
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[push/unregister]", err);
    res.status(400).json({ error: err?.message || "failed" });
  }
});

export default router;
