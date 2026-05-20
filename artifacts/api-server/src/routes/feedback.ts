import { Router, type IRouter, type Request } from "express";
import { sendTesterFeedbackEmail } from "../email.js";

const router: IRouter = Router();

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const ipHits = new Map<string, number[]>();

function getClientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  return req.ip || req.socket.remoteAddress || "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const hits = (ipHits.get(ip) || []).filter((t) => t > windowStart);
  if (hits.length >= RATE_LIMIT_MAX) {
    ipHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  return false;
}

router.post("/feedback", async (req, res) => {
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Trop de demandes. Veuillez réessayer dans quelques minutes." });
  }

  const { name, email, phone, message } = req.body ?? {};

  const nameTrim = typeof name === "string" ? name.trim() : "";
  const emailTrim = typeof email === "string" ? email.trim() : "";
  const phoneTrim = typeof phone === "string" ? phone.trim() : null;
  const messageTrim = typeof message === "string" ? message.trim() : "";

  if (nameTrim.length < 2 || nameTrim.length > 100) {
    return res.status(400).json({ error: "Nom invalide (2 à 100 caractères)." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim) || emailTrim.length > 254) {
    return res.status(400).json({ error: "Email invalide." });
  }
  if (phoneTrim && (phoneTrim.length < 6 || phoneTrim.length > 20)) {
    return res.status(400).json({ error: "Numéro de téléphone invalide." });
  }
  if (messageTrim.length < 10 || messageTrim.length > 20000) {
    return res.status(400).json({ error: "Message invalide (10 à 20000 caractères)." });
  }

  try {
    await sendTesterFeedbackEmail(nameTrim, emailTrim, phoneTrim || null, messageTrim);
  } catch (err) {
    console.error("[FEEDBACK] Email failed:", err);
    return res.status(502).json({ error: "Le service de messagerie est temporairement indisponible. Veuillez réessayer plus tard." });
  }

  res.status(201).json({ message: "Feedback envoyé avec succès. Merci pour votre retour !" });
});

export default router;
