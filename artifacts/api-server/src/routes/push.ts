import { Router, type IRouter } from "express";
import { upsertPushToken, deletePushToken } from "../lib/pushNotifications.js";
import { rateLimit } from "../lib/auth-utils.js";

const router: IRouter = Router();

const pushLimiter = rateLimit({ windowMs: 60_000, max: 10, key: "push" });

router.post("/push/register", pushLimiter, async (req, res) => {
  try {
    const { token, platform, city, favoriteCategories, language } = req.body || {};
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "token required" });
    }
    await upsertPushToken({
      token,
      platform: typeof platform === "string" ? platform : null,
      city: typeof city === "string" ? city : null,
      favoriteCategories: Array.isArray(favoriteCategories)
        ? favoriteCategories.filter((c) => typeof c === "string")
        : [],
      language: typeof language === "string" ? language : "fr",
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
