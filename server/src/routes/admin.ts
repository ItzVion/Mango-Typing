import { Router, Request, Response } from "express";
import { hashPassword, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from "../lib/password";
import { requireOwner, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/db";
import { DEFAULT_LEGAL, getCurrentLegalVersion, clearLegalVersionCache } from "../lib/legal";

const router = Router();

async function audit(actorUserId: string | undefined, action: string, targetType?: string, targetId?: string, metadata?: unknown) {
  try {
    await prisma.auditLog.create({ data: { actorUserId: actorUserId ?? null, action, targetType: targetType ?? null, targetId: targetId ?? null, metadata: metadata === undefined ? null : JSON.stringify(metadata) } });
  } catch (err) { console.error("Failed to write audit log:", err); }
}

router.get("/users", requireOwner, async (_req: AuthRequest, res: Response) => { const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, username: true, email: true, role: true, hasDonated: true, createdAt: true, googleId: true } }); res.json(users); });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
router.post("/users", requireOwner, async (req: AuthRequest, res: Response): Promise<any> => {
  const { email, username, password } = req.body; if (!email || !username || !password) return res.status(400).json({ error: "Missing fields" });
  const normalEmail = String(email).trim().toLowerCase(); const trimmedUsername = String(username).trim();
  if (!EMAIL_RE.test(normalEmail) || normalEmail.length > 254) return res.status(400).json({ error: "Enter a valid email address." });
  if (trimmedUsername.length < 3 || trimmedUsername.length > 32) return res.status(400).json({ error: "Username must be between 3 and 32 characters." });
  if (String(password).length < MIN_PASSWORD_LENGTH || String(password).length > MAX_PASSWORD_LENGTH) return res.status(400).json({ error: `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.` });
  const existing = await prisma.user.findFirst({ where: { OR: [{ email: normalEmail }, { username: trimmedUsername }] } }); if (existing) return res.status(400).json({ error: "Username or email already taken" });
  const legalVersion = await getCurrentLegalVersion();
  const passwordHash = await hashPassword(password); const user = await prisma.user.create({ data: { email: normalEmail, username: trimmedUsername, passwordHash, termsAcceptedVersion: legalVersion, privacyAcceptedVersion: legalVersion, refundAcceptedVersion: legalVersion, legalAcceptedAt: new Date() } });
  await audit(req.userId, "ADMIN_USER_CREATE", "User", user.id, { username: user.username, email: user.email });
  res.json({ id: user.id, username: user.username, email: user.email, role: user.role, hasDonated: user.hasDonated, createdAt: user.createdAt });
});
router.delete("/users/:id", requireOwner, async (req: AuthRequest, res: Response): Promise<any> => { const target = await prisma.user.findUnique({ where: { id: req.params.id } }); if (!target) return res.status(404).json({ error: "User not found" }); if (target.role === "OWNER") return res.status(400).json({ error: "Can't delete an owner account" }); await prisma.user.delete({ where: { id: req.params.id } }); await audit(req.userId, "ADMIN_USER_DELETE", "User", target.id, { username: target.username }); res.json({ ok: true }); });
router.get("/donations", requireOwner, async (_req: AuthRequest, res: Response) => { const donations = await prisma.donation.findMany({ orderBy: { createdAt: "desc" }, include: { user: { select: { username: true, email: true } } } }); res.json(donations.map((d) => ({ id: d.id, amountRupees: d.amountRupees, status: d.status, createdAt: d.createdAt, razorpayPaymentId: d.razorpayPaymentId, username: d.user?.username ?? "Anonymous", email: d.user?.email ?? null, anonymous: !d.user }))); });
router.get("/legal/:slug", requireOwner, async (req: AuthRequest, res: Response): Promise<any> => { const slug = req.params.slug; if (!DEFAULT_LEGAL[slug]) return res.status(404).json({ error: "Unknown page" }); const row = await prisma.legalPage.findUnique({ where: { slug } }); const version = await getCurrentLegalVersion(); res.json({ slug, version, updatedAt: row?.updatedAt ?? null, content: row?.content ?? DEFAULT_LEGAL[slug] }); });
router.put("/legal/:slug", requireOwner, async (req: AuthRequest, res: Response): Promise<any> => {
  const slug = req.params.slug; if (!DEFAULT_LEGAL[slug]) return res.status(404).json({ error: "Unknown page" });
  const { content } = req.body; if (typeof content !== "string") return res.status(400).json({ error: "Missing content" });
  if (content.length > 250_000) return res.status(400).json({ error: "Legal page is too large." });
  const before = await prisma.legalPage.findUnique({ where: { slug }, select: { content: true } });
  if (before?.content === content) return res.json({ slug, unchanged: true, version: await getCurrentLegalVersion() });
  const row = await prisma.legalPage.upsert({ where: { slug }, update: { content, version: LEGAL_VERSION, updatedAt: new Date() }, create: { slug, content, version: LEGAL_VERSION } });
  clearLegalVersionCache();
  const version = await getCurrentLegalVersion();
  await audit(req.userId, "ADMIN_LEGAL_UPDATE", "LegalPage", slug, { version });
  res.json({ ...row, version });
});

export default router;
