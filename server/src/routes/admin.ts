import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { requireOwner, AuthRequest, OWNER_EMAIL } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

const DEFAULT_LEGAL: Record<string, string> = {
  privacy:
    "VC Typing collects only the information needed to run the service: your username, email address, and typing test history if you create an account. Guest tests are not linked to any account.\n\nIf you sign in with Google, we receive your email, name, and profile picture from Google to create or match your account. We never receive your Google password.\n\nIf you donate, payment is processed entirely by Razorpay. We store the donation amount and payment status, but never your card, UPI, or bank details.\n\nWe do not sell or share your data with third parties for advertising. Data is used only to operate VC Typing's features: saved history, leaderboard-style stats, and donation recognition.\n\nYou can request account deletion at any time by contacting the site owner.",
  refund:
    "Donations made through VC Typing are voluntary contributions toward hosting, domain, and development costs — not a purchase of goods or a service subscription.\n\nBecause of this, donations are generally non-refundable. If a payment was made in error, was charged twice, or failed but still deducted funds, contact the site owner with your payment ID and we'll look into it.\n\nGenuine duplicate or failed-but-charged transactions are refunded via the original payment method through Razorpay.",
  terms:
    "VC Typing is a free typing practice platform offering typing tests, games, and a typing tutor. By using the site you agree to use it fairly and not attempt to disrupt, exploit, or automate abuse of its games, leaderboards, or donation system.\n\nAccounts are personal to you. Don't share credentials or impersonate other users. We may suspend accounts that abuse the service.\n\nGame difficulty and scoring are designed to be fair for everyone — there is no way to pay for an advantage in tests, games, or the tutor. Donations only support the site and award a visual star badge.\n\nThe service is provided \"as is\" without warranty. We may update these terms as the site evolves.",
};

// ── Users ────────────────────────────────────────────────────────────────
router.get("/users", requireOwner, async (_req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, username: true, email: true, role: true, hasDonated: true, createdAt: true, googleId: true },
  });
  res.json(users);
});

router.post("/users", requireOwner, async (req: AuthRequest, res: Response): Promise<any> => {
  const { email, username, password } = req.body;
  if (!email || !username || !password) return res.status(400).json({ error: "Missing fields" });

  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (existing) return res.status(400).json({ error: "Username or email already taken" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, username, passwordHash } });
  res.json({ id: user.id, username: user.username, email: user.email, role: user.role, hasDonated: user.hasDonated, createdAt: user.createdAt });
});

router.delete("/users/:id", requireOwner, async (req: AuthRequest, res: Response): Promise<any> => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: "User not found" });
  if (target.email === OWNER_EMAIL) return res.status(400).json({ error: "Can't delete the owner account" });
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Donations ────────────────────────────────────────────────────────────
router.get("/donations", requireOwner, async (_req: AuthRequest, res: Response) => {
  const donations = await prisma.donation.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { username: true, email: true } } },
  });
  res.json(
    donations.map((d) => ({
      id: d.id,
      amountRupees: d.amountRupees,
      status: d.status,
      createdAt: d.createdAt,
      razorpayPaymentId: d.razorpayPaymentId,
      username: d.user?.username ?? "Anonymous",
      email: d.user?.email ?? null,
      anonymous: !d.user,
    }))
  );
});

// ── Legal pages ──────────────────────────────────────────────────────────
router.get("/legal/:slug", requireOwner, async (req: AuthRequest, res: Response): Promise<any> => {
  const slug = req.params.slug;
  if (!DEFAULT_LEGAL[slug]) return res.status(404).json({ error: "Unknown page" });
  const row = await prisma.legalPage.findUnique({ where: { slug } });
  res.json({ slug, content: row?.content ?? DEFAULT_LEGAL[slug] });
});

router.put("/legal/:slug", requireOwner, async (req: AuthRequest, res: Response): Promise<any> => {
  const slug = req.params.slug;
  if (!DEFAULT_LEGAL[slug]) return res.status(404).json({ error: "Unknown page" });
  const { content } = req.body;
  if (typeof content !== "string") return res.status(400).json({ error: "Missing content" });
  const row = await prisma.legalPage.upsert({
    where: { slug },
    update: { content },
    create: { slug, content },
  });
  res.json(row);
});

export default router;
export { DEFAULT_LEGAL };
