import { Router, Request, Response } from "express";
import crypto from "crypto";
import { optionalAuth, requireAuth, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/db";
import { checkRateLimit, clientIp } from "../lib/rateLimit";
import { decryptSecret } from "../lib/secretCrypto";
const router = Router();
async function getRazorpayKeys() { const s = await prisma.settings.findUnique({ where: { id: 1 } }); return { keyId: s?.razorpayKeyId ?? null, keySecret: decryptSecret(s?.razorpayKeySecret) }; }
router.post("/create-order", optionalAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const ipLimit = await checkRateLimit(`donate-order:ip:${clientIp(req)}`, 10, 60 * 1000); if (!ipLimit.ok) return res.status(429).json({ error: "Too many requests. Slow down." });
  const { amountRupees } = req.body; const raw = Number(amountRupees);
  if (!Number.isFinite(raw) || !Number.isInteger(raw) || raw < 1 || raw > 100000) return res.status(400).json({ error: "Enter a whole number of rupees between ₹1 and ₹100,000" });
  const { keyId, keySecret } = await getRazorpayKeys(); if (!keyId || !keySecret) return res.status(503).json({ error: "Donations aren't set up yet — the owner needs to add Razorpay keys via /admin" });
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const orderRes = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" }, body: JSON.stringify({ amount: raw * 100, currency: "INR", receipt: `vct_${Date.now()}_${crypto.randomBytes(4).toString("hex")}` }) });
  const order = await orderRes.json(); if (!orderRes.ok) return res.status(502).json({ error: order?.error?.description || "Razorpay order creation failed" });
  await prisma.donation.create({ data: { userId: req.userId ?? null, amountRupees: raw, razorpayOrderId: order.id, status: "created" } });
  res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId });
});
router.post("/verify", optionalAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const ipLimit = await checkRateLimit(`donate-verify:ip:${clientIp(req)}`, 20, 60 * 1000); if (!ipLimit.ok) return res.status(429).json({ error: "Too many requests. Slow down." });
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body; if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return res.status(400).json({ error: "Missing payment fields" });
  const { keySecret } = await getRazorpayKeys(); if (!keySecret) return res.status(503).json({ error: "Donations aren't set up yet" });
  const existing = await prisma.donation.findUnique({ where: { razorpayOrderId: razorpay_order_id } }); if (!existing) return res.status(404).json({ error: "Unknown order" }); if (existing.status === "paid") return res.json({ ok: true });
  const expected = crypto.createHmac("sha256", keySecret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex"); const expectedBuf = Buffer.from(expected, "hex"); const givenBuf = Buffer.from(String(razorpay_signature), "hex");
  if (expectedBuf.length !== givenBuf.length || !crypto.timingSafeEqual(expectedBuf, givenBuf)) return res.status(400).json({ error: "Payment verification failed" });
  const donation = await prisma.donation.update({ where: { razorpayOrderId: razorpay_order_id }, data: { razorpayPaymentId: razorpay_payment_id, status: "paid" } }); if (donation.userId) await prisma.user.update({ where: { id: donation.userId }, data: { hasDonated: true } }); res.json({ ok: true });
});
router.post("/webhook", async (req: Request, res: Response): Promise<any> => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET; const signature = req.headers["x-razorpay-signature"]; const eventIdHeader = req.headers["x-razorpay-event-id"];
  if (!secret || typeof signature !== "string" || typeof eventIdHeader !== "string" || !eventIdHeader || eventIdHeader.length > 200 || !Buffer.isBuffer(req.body)) return res.status(400).json({ error: "Invalid webhook configuration or payload" });
  const eventId = String(eventIdHeader);
  const expected = crypto.createHmac("sha256", secret).update(req.body).digest("hex"); const expectedBuf = Buffer.from(expected, "hex"); const givenBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== givenBuf.length || !crypto.timingSafeEqual(expectedBuf, givenBuf)) return res.status(400).json({ error: "Invalid webhook signature" });
  const alreadyProcessed = await prisma.razorpayWebhookEvent.findUnique({ where: { eventId } }); if (alreadyProcessed) return res.json({ ok: true, duplicate: true });
  let event: any; try { event = JSON.parse(req.body.toString("utf8")); } catch { return res.status(400).json({ error: "Invalid JSON" }); }
  if (event?.event !== "payment.captured" && event?.event !== "order.paid") {
    await prisma.razorpayWebhookEvent.create({ data: { eventId, eventType: String(event?.event || "unknown") } });
    return res.json({ ok: true });
  }
  const payment = event?.payload?.payment?.entity; const order = event?.payload?.order?.entity; const paymentId = payment?.id; const orderId = payment?.order_id ?? order?.id; const status = payment?.status; const amountPaise = Number(payment?.amount ?? order?.amount);
  if (!paymentId || !orderId || status !== "captured" || !Number.isSafeInteger(amountPaise) || amountPaise < 100) return res.status(400).json({ error: "Incomplete payment event" });
  const existing = await prisma.donation.findUnique({ where: { razorpayOrderId: orderId } }); if (!existing) return res.status(404).json({ error: "Unknown order" }); if (existing.status === "paid") { try { await prisma.razorpayWebhookEvent.create({ data: { eventId, eventType: String(event.event) } }); } catch (err: any) { if (err?.code !== "P2002") throw err; } return res.json({ ok: true }); }
  if (existing.amountRupees * 100 !== amountPaise) return res.status(400).json({ error: "Payment amount mismatch" });
  const donation = await prisma.donation.update({ where: { razorpayOrderId: orderId }, data: { razorpayPaymentId: paymentId, status: "paid" } });
  if (donation.userId) await prisma.user.update({ where: { id: donation.userId }, data: { hasDonated: true } });
  try { await prisma.razorpayWebhookEvent.create({ data: { eventId, eventType: String(event.event) } }); } catch (err: any) { if (err?.code !== "P2002") throw err; }
  return res.json({ ok: true });
});
router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => { const donations = await prisma.donation.findMany({ where: { userId: req.userId, status: "paid" }, orderBy: { createdAt: "desc" }, select: { id: true, amountRupees: true, status: true, createdAt: true } }); res.json(donations); });
export default router;
