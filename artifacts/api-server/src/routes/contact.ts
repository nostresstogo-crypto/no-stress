import { Router, type IRouter, type Request } from "express";
import { sendContactMessageEmail, sendContactConfirmationEmail } from "../email";

const router: IRouter = Router();

const MAX_MESSAGES = 500;
const messages: Array<{
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  ip: string;
  createdAt: string;
}> = [];

let nextId = 1;

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

router.post("/contact", async (req, res) => {
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return res
      .status(429)
      .json({ error: "Trop de demandes. Veuillez réessayer dans quelques minutes." });
  }

  const { name, email, subject, message } = req.body ?? {};

  const nameTrim = typeof name === "string" ? name.trim() : "";
  const emailTrim = typeof email === "string" ? email.trim() : "";
  const subjectTrim = typeof subject === "string" ? subject.trim() : "";
  const messageTrim = typeof message === "string" ? message.trim() : "";

  if (nameTrim.length < 2 || nameTrim.length > 100) {
    return res.status(400).json({ error: "Nom invalide (2 à 100 caractères)." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim) || emailTrim.length > 254) {
    return res.status(400).json({ error: "Email invalide." });
  }
  if (subjectTrim.length < 3 || subjectTrim.length > 200) {
    return res.status(400).json({ error: "Sujet invalide (3 à 200 caractères)." });
  }
  if (messageTrim.length < 10 || messageTrim.length > 5000) {
    return res.status(400).json({ error: "Message invalide (10 à 5000 caractères)." });
  }

  const entry = {
    id: `msg${nextId++}`,
    name: nameTrim,
    email: emailTrim,
    subject: subjectTrim,
    message: messageTrim,
    ip,
    createdAt: new Date().toISOString(),
  };
  messages.push(entry);
  if (messages.length > MAX_MESSAGES) messages.shift();

  try {
    await sendContactMessageEmail(entry.name, entry.email, entry.subject, entry.message);
  } catch (err) {
    console.error("[CONTACT] Admin notification failed:", err);
    return res.status(502).json({
      error:
        "Le service de messagerie est temporairement indisponible. Veuillez réessayer plus tard ou nous écrire à nostresstogo@gmail.com.",
    });
  }

  try {
    await sendContactConfirmationEmail(entry.email, entry.name);
  } catch (err) {
    console.warn("[CONTACT] Confirmation email failed (non-fatal):", err);
  }

  res.status(201).json({
    message: "Votre message a bien été envoyé. Nous vous répondrons dans les plus brefs délais.",
    id: entry.id,
  });
});

export default router;
