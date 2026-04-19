import { Router, type IRouter } from "express";
import { requireAdmin } from "./admin";

const router: IRouter = Router();

const deletionRequests: any[] = [];

let nextId = 1;

router.post("/account/deletion-request", (req, res) => {
  const { email, name, accountType, reason } = req.body;
  if (!email || !name || !accountType) {
    return res.status(400).json({ error: "Email, nom et type de compte requis." });
  }
  const existing = deletionRequests.find(
    (r) => r.email === email && r.status === "pending"
  );
  if (existing) {
    return res.status(409).json({ error: "Une demande de suppression est déjà en cours pour cet email." });
  }
  const request = {
    id: `dr${nextId++}`,
    email,
    name,
    accountType,
    reason: reason || null,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  deletionRequests.push(request);
  res.status(201).json({
    message: "Votre demande de suppression a bien été reçue. Elle sera traitée dans un délai de 30 jours.",
    requestId: request.id,
  });
});

router.get("/admin/deletion-requests", requireAdmin, (req, res) => {
  const { status } = req.query;
  if (status) {
    return res.json(deletionRequests.filter((r) => r.status === status));
  }
  res.json(deletionRequests);
});

router.post("/admin/deletion-requests/:id/process", requireAdmin, (req, res) => {
  const request = deletionRequests.find((r) => r.id === req.params.id);
  if (!request) return res.status(404).json({ error: "Demande introuvable." });
  request.status = "processed";
  res.json({ message: "Demande marquée comme traitée.", request });
});

export default router;
