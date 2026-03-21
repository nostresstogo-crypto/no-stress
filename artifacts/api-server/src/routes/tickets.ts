import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/tickets", (req, res) => {
  const { eventId, ticketTypeId, quantity, paymentMethod, phoneNumber } = req.body;
  if (!eventId || !ticketTypeId || !quantity || !paymentMethod || !phoneNumber) {
    return res.status(400).json({ error: "All fields are required" });
  }
  const transactionId = `TXN_${Date.now()}`;
  res.status(201).json({
    transactionId,
    status: "success",
    ticket: {
      id: `TKT_${Date.now()}`,
      eventId,
      ticketType: ticketTypeId,
      qrCode: `qr_${transactionId}`,
    },
  });
});

export default router;
