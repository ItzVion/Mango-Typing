import { Router, Request, Response } from "express";
import crypto from "crypto";
import { optionalAuth, requireAuth, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/db";
import { checkRateLimit, clientIp } from "../lib/rateLimit";
import { decryptSecret } from "../lib/secretCrypto";
import { isValidCapturedPayment } from "../lib/paymentValidation";
const router = Router();

async function getRazorpayKeys() {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });
  return { keyId: s?.razorpayKeyId ?? null, keySecret: decryptSecret(s?.razorpayKeySecret) };
}

async function markDonationPaid(orderId: string, paymentId: string) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.donation.findUnique({ where: { razorpayOrderId: orderId } });
    if (!current) return { ok: false as const, reason: "unknown-order" as const };
    if (current.status === "paid") {
      return current.razorpayPaymentId === paymentId
        ? { ok: true as const, donation: current, alreadyPaid: true }
        : { ok: false as const, reason: "payment-conflict" as const };
    }
    if (current.status !== "created" ||
        (current.razorpayPaymentId && current.razorpayPaymentId !== paymentId)) {
      return { ok: false as const, reason: "payment-conflict" as const };
    }

    const changed = await tx.donation.updateMany({
      where: {
        razorpayOrderId: orderId,
        status: current.status,
        razorpayPaymentId: current.razorpayPaymentId,
      },
      data: { razorpayPaymentId: paymentId, status: "paid" },
    });
    if (changed.count !== 1) {
      const latest = await tx.donation.findUnique({ where: { razorpayOrderId: orderId } });
      if (latest?.status === "paid" && latest.razorpayPaymentId === paymentId) {
        return { ok: true as const, donation: latest, alreadyPaid: true };
      }
      return { ok: false as const, reason: "payment-conflict" as const };
    }

    const updated = await tx.donation.findUniqueOrThrow({ where: { razorpayOrderId: orderId } });
    if (updated.userId) {
      await tx.user.update({ where: { id: updated.userId }, data: { hasDonated: true } });
    }
    return { ok: true as const, donation: updated, alreadyPaid: false };
  });
}

async function recordWebhookEvent(eventId: string, eventType: string): Promise<boolean> {
  try {
    await prisma.razorpayWebhookEvent.create({ data: { eventId, eventType } });
    return true;
  } catch (err: any) {
    if (err?.code === "P2002") return false;
    throw err;
  }
}
router.post("/create-order", optionalAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const ipLimit = await checkRateLimit(`donate-order:ip:${clientIp(req)}`, 10, 60 * 1000); if (!ipLimit.ok) return res.status(429).json({ error: "Too many requests. Slow down." });
  const { amountRupees } = req.body; const raw = Number(amountRupees);
  if (!Number.isFinite(raw) || !Number.isInteger(raw) || raw < 1 || raw > 100000) return res.status(400).json({ error: "Enter a whole number of rupees between ₹1 and ₹100,000" });
  const { keyId, keySecret } = await getRazorpayKeys(); if (!keyId || !keySecret) return res.status(503).json({ error: "Donations aren't set up yet — the owner needs to add Razorpay keys via /admin" });
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  let orderRes: globalThis.Response;
  try {
    orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: raw * 100, currency: "INR", receipt: `mt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}` }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (err: any) {
    console.error("Razorpay order request failed:", err?.message || "network error");
    return res.status(502).json({ error: "Payment provider is temporarily unavailable." });
  }
  const order: any = await orderRes.json().catch(() => null);
  if (!orderRes.ok || typeof order?.id !== "string" || order.amount !== raw * 100 || order.currency !== "INR") {
    console.error("Razorpay order creation returned an invalid response.");
    return res.status(502).json({ error: "Razorpay order creation failed." });
  }
  await prisma.donation.create({ data: { userId: req.userId ?? null, amountRupees: raw, razorpayOrderId: order.id, status: "created" } });
  res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId });
});
router.post("/verify", optionalAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const ipLimit = await checkRateLimit(`donate-verify:ip:${clientIp(req)}`, 20, 60 * 1000);
  if (!ipLimit.ok) return res.status(429).json({ error: "Too many requests. Slow down." });

  const body = req.body || {};
  const orderId = typeof body.razorpay_order_id === "string" ? body.razorpay_order_id : "";
  const paymentId = typeof body.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
  const signature = typeof body.razorpay_signature === "string" ? body.razorpay_signature : "";
  if (!/^order_[A-Za-z0-9]+$/.test(orderId) ||
      !/^pay_[A-Za-z0-9]+$/.test(paymentId) ||
      !/^[a-f0-9]{64}$/i.test(signature)) {
    return res.status(400).json({ error: "Missing or invalid payment fields." });
  }

  const { keyId, keySecret } = await getRazorpayKeys();
  if (!keyId || !keySecret) return res.status(503).json({ error: "Donations aren't set up yet." });
  const existing = await prisma.donation.findUnique({ where: { razorpayOrderId: orderId } });
  if (!existing) return res.status(404).json({ error: "Unknown order." });

  const expectedSignature = crypto.createHmac("sha256", keySecret)
    .update(orderId + "|" + paymentId).digest("hex");
  const expectedBuf = Buffer.from(expectedSignature, "hex");
  const givenBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== givenBuf.length || !crypto.timingSafeEqual(expectedBuf, givenBuf)) {
    return res.status(400).json({ error: "Payment verification failed." });
  }

  // A valid checkout signature alone is not enough to mark an order paid:
  // independently fetch Razorpay's canonical payment record and verify its
  // captured status, order, currency, and exact amount before updating Neon.
  let providerResponse: globalThis.Response;
  try {
    const auth = Buffer.from(keyId + ":" + keySecret).toString("base64");
    providerResponse = await fetch("https://api.razorpay.com/v1/payments/" + encodeURIComponent(paymentId), {
      method: "GET",
      headers: { Authorization: "Basic " + auth },
      signal: AbortSignal.timeout(8000),
    });
  } catch (err: any) {
    console.error("Razorpay payment lookup failed:", err?.message || "network error");
    return res.status(502).json({ error: "Payment could not be verified with the provider. Please retry." });
  }
  const providerPayment: unknown = await providerResponse.json().catch(() => null);
  if (!providerResponse.ok) {
    console.error("Razorpay payment lookup returned a non-success status:", providerResponse.status);
    return res.status(502).json({ error: "Payment could not be verified with the provider. Please retry." });
  }
  if (!isValidCapturedPayment(providerPayment, {
    paymentId,
    orderId,
    amountPaise: existing.amountRupees * 100,
  })) {
    return res.status(400).json({ error: "Payment is not captured for this order or the amount does not match." });
  }

  const result = await markDonationPaid(orderId, paymentId);
  if (!result.ok) {
    if (result.reason === "unknown-order") return res.status(404).json({ error: "Unknown order." });
    return res.status(409).json({ error: "This order is already linked to a different payment." });
  }
  return res.json({ ok: true });
});
router.post("/webhook", async (req: Request, res: Response): Promise<any> => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers["x-razorpay-signature"];
  const eventIdHeader = req.headers["x-razorpay-event-id"];
  if (!secret) return res.status(503).json({ error: "Payment webhook is not configured." });
  if (typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature) ||
      typeof eventIdHeader !== "string" || !eventIdHeader || eventIdHeader.length > 200 ||
      !Buffer.isBuffer(req.body)) {
    return res.status(400).json({ error: "Invalid webhook configuration or payload." });
  }

  const expectedSignature = crypto.createHmac("sha256", secret).update(req.body).digest("hex");
  const expectedBuf = Buffer.from(expectedSignature, "hex");
  const givenBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== givenBuf.length || !crypto.timingSafeEqual(expectedBuf, givenBuf)) {
    return res.status(400).json({ error: "Invalid webhook signature." });
  }

  const eventId = eventIdHeader;
  const prior = await prisma.razorpayWebhookEvent.findUnique({ where: { eventId } });
  if (prior) return res.json({ ok: true, duplicate: true });

  let event: any;
  try { event = JSON.parse(req.body.toString("utf8")); }
  catch { return res.status(400).json({ error: "Invalid JSON." }); }

  if (event?.event !== "payment.captured" && event?.event !== "order.paid") {
    const inserted = await recordWebhookEvent(eventId, String(event?.event || "unknown"));
    return res.json({ ok: true, duplicate: !inserted });
  }

  const payment = event?.payload?.payment?.entity;
  const order = event?.payload?.order?.entity;
  const paymentId = typeof payment?.id === "string" ? payment.id : "";
  const orderId = typeof payment?.order_id === "string" ? payment.order_id : "";
  if (!/^pay_[A-Za-z0-9]+$/.test(paymentId) || !/^order_[A-Za-z0-9]+$/.test(orderId) ||
      (order?.id && order.id !== orderId)) {
    return res.status(400).json({ error: "Incomplete payment event." });
  }

  const existing = await prisma.donation.findUnique({ where: { razorpayOrderId: orderId } });
  if (!existing) return res.status(404).json({ error: "Unknown order." });
  if (!isValidCapturedPayment(payment, {
    paymentId,
    orderId,
    amountPaise: existing.amountRupees * 100,
  })) {
    return res.status(400).json({ error: "Payment event does not match a captured INR order and expected amount." });
  }

  const result = await markDonationPaid(orderId, paymentId);
  if (!result.ok) {
    if (result.reason === "unknown-order") return res.status(404).json({ error: "Unknown order." });
    return res.status(409).json({ error: "Order is already associated with another payment." });
  }

  // Recording after the idempotent status update allows safe retries if the
  // database briefly fails while recording the event ID.
  const inserted = await recordWebhookEvent(eventId, String(event.event));
  return res.json({ ok: true, duplicate: !inserted });
});

router.post("/upi-claim", requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const ipLimit = await checkRateLimit(`upi-claim:ip:${clientIp(req)}`, 5, 60 * 60 * 1000);
  if (!ipLimit.ok) return res.status(429).json({ error: "Too many UPI claims. Please try again later." });
  const raw = Number(req.body?.amountRupees);
  if (!Number.isSafeInteger(raw) || raw < 1 || raw > 100000) return res.status(400).json({ error: "Enter a whole amount between ₹1 and ₹1,00,000." });
  const existing = await prisma.upiDonationClaim.findFirst({ where: { userId: req.userId!, status: "PENDING" }, orderBy: { createdAt: "desc" } });
  if (existing) return res.status(409).json({ error: "You already have a UPI payment awaiting review.", claim: { id: existing.id, amountRupees: existing.amountRupees, status: existing.status, createdAt: existing.createdAt } });
  const claim = await prisma.upiDonationClaim.create({ data: { userId: req.userId!, amountRupees: raw }, select: { id: true, amountRupees: true, status: true, createdAt: true } });
  return res.status(201).json({ ok: true, claim });
});
router.get("/upi-claim/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const claim = await prisma.upiDonationClaim.findFirst({ where: { userId: req.userId! }, orderBy: { createdAt: "desc" }, select: { id: true, amountRupees: true, status: true, createdAt: true, reviewedAt: true, reviewNote: true } });
  res.json(claim);
});

router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => { const donations = await prisma.donation.findMany({ where: { userId: req.userId, status: "paid" }, orderBy: { createdAt: "desc" }, select: { id: true, amountRupees: true, status: true, createdAt: true } }); res.json(donations); });
export default router;
