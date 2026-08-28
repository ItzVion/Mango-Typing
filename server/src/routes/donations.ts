import { Router, Request, Response } from "express";
import crypto from "crypto";
import { optionalAuth, requireAuth, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/db";
const router = Router();
async function getRazorpayKeys() {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });
  return { keyId: s?.razorpayKeyId ?? null, keySecret: s?.razorpayKeySecret ?? null };
}
// Create a Razorpay order for the given rupee amount.
// Amount must be a whole number of rupees, minimum ₹1.
router.post("/create-order", optionalAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const { amountRupees } = req.body;
  const raw = Number(amountRupees);
  if (!Number.isFinite(raw) || !Number.isInteger(raw) || raw < 1 || raw > 100000) {
    return res.status(400).json({ error: "Enter a whole number of rupees between ₹1 and ₹100,000" });
  }
  const amount = raw;
  const { keyId, keySecret } = await getRazorpayKeys();
  if (!keyId || !keySecret) {
    return res.status(503).json({ error: "Donations aren't set up yet — the owner needs to add Razorpay keys via /payedit" });
  }
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amount * 100, currency: "INR", receipt: `vct_${Date.now()}` }),
  });
  const order = await orderRes.json();
  if (!orderRes.ok) return res.status(502).json({ error: order?.error?.description || "Razorpay order creation failed" });
  await prisma.donation.create({
    data: { userId: req.userId ?? null, amountRupees: amount, razorpayOrderId: order.id, status: "created" },
  });
  res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId });
});
// Verify the payment signature Razorpay's checkout returns, mark donation paid,
// and flag the user's account with hasDonated so the UI can show their star.
router.post("/verify", optionalAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: "Missing payment fields" });
  }
  const { keySecret } = await getRazorpayKeys();
  if (!keySecret) return res.status(503).json({ error: "Donations aren't set up yet" });

  const existing = await prisma.donation.findUnique({ where: { razorpayOrderId: razorpay_order_id } });
  if (!existing) return res.status(404).json({ error: "Unknown order" });
  // Already verified — treat as success without re-processing, instead of
  // silently re-running the update on every duplicate client call.
  if (existing.status === "paid") return res.json({ ok: true });

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const givenBuf = Buffer.from(String(razorpay_signature), "hex");
  const signatureValid =
    expectedBuf.length === givenBuf.length && crypto.timingSafeEqual(expectedBuf, givenBuf);
  if (!signatureValid) return res.status(400).json({ error: "Payment verification failed" });

  const donation = await prisma.donation.update({
    where: { razorpayOrderId: razorpay_order_id },
    data: { razorpayPaymentId: razorpay_payment_id, status: "paid" },
  });
  if (donation.userId) {
    await prisma.user.update({ where: { id: donation.userId }, data: { hasDonated: true } });
  }
  res.json({ ok: true });
});
// Logged-in user's own donation history.
router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const donations = await prisma.donation.findMany({
    where: { userId: req.userId, status: "paid" },
    orderBy: { createdAt: "desc" },
    select: { id: true, amountRupees: true, status: true, createdAt: true },
  });
  res.json(donations);
});
export default router;
