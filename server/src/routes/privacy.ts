import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/db";
import { checkRateLimit } from "../lib/rateLimit";

const router = Router();
const TYPES = new Set(["ACCESS", "CORRECT", "DELETE", "WITHDRAW_CONSENT", "GRIEVANCE"]);

router.get("/export", requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { id: true, username: true, email: true, avatarUrl: true, role: true, hasDonated: true, createdAt: true, termsAcceptedVersion: true, privacyAcceptedVersion: true, refundAcceptedVersion: true, legalAcceptedAt: true } });
  if (!user) return res.status(404).json({ error: "User not found." });
  const [tests, donations, requests] = await Promise.all([
    prisma.typingTest.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "desc" }, select: { id: true, sheetId: true, mode: true, wpm: true, rawWpm: true, accuracy: true, errors: true, durationSec: true, secondStats: true, createdAt: true } }),
    prisma.donation.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "desc" }, select: { id: true, amountRupees: true, razorpayOrderId: true, razorpayPaymentId: true, status: true, createdAt: true } }),
    prisma.privacyRequest.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "desc" }, select: { id: true, type: true, status: true, details: true, createdAt: true, updatedAt: true } }),
  ]);
  res.setHeader("Cache-Control", "no-store");
  res.json({ exportedAt: new Date().toISOString(), user, tests, donations, privacyRequests: requests });
});

router.get("/requests", requireAuth, async (req: AuthRequest, res: Response) => {
  const rows = await prisma.privacyRequest.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "desc" }, select: { id: true, type: true, status: true, details: true, createdAt: true, updatedAt: true } });
  res.setHeader("Cache-Control", "no-store");
  res.json(rows);
});

router.post("/requests", requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const limit = await checkRateLimit(`privacy-request:acct:${req.userId}`, 5, 60 * 60 * 1000);
  if (!limit.ok) return res.status(429).json({ error: "Too many privacy requests. Please try again later." });
  const type = String(req.body?.type || "").trim().toUpperCase();
  const details = typeof req.body?.details === "string" ? req.body.details.trim() : "";
  if (!TYPES.has(type)) return res.status(400).json({ error: "Unsupported privacy request type." });
  if (details.length > 10_000) return res.status(400).json({ error: "Request details are too long." });
  const open = await prisma.privacyRequest.findFirst({ where: { userId: req.userId, type, status: "OPEN" } });
  if (open) return res.json({ id: open.id, status: open.status, duplicate: true });
  const request = await prisma.privacyRequest.create({ data: { userId: req.userId!, type, details: details || null } });
  res.status(201).json({ id: request.id, type: request.type, status: request.status, createdAt: request.createdAt });
});

export default router;
