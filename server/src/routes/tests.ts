import { Router, Request, Response } from "express";
import { optionalAuth, requireAuth, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/db";

const router = Router();

// Submit a completed test.
// If a valid token is sent, the test is linked to that user (userId) and
// will show up in their dashboard/profile history.
// If no token / invalid token, it's saved as a guest test (userId: null)
// and is NOT attached to any account.
router.post("/", optionalAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const { sheetId, mode, wpm, rawWpm, accuracy, errors, durationSec, secondStats } = req.body;
  if (sheetId == null || wpm == null || accuracy == null) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const test = await prisma.typingTest.create({
    data: {
      userId: req.userId ?? null,
      sheetId: Number(sheetId),
      mode: mode === "screen" ? "screen" : "paper",
      wpm: Number(wpm),
      rawWpm: Number(rawWpm ?? wpm),
      accuracy: Number(accuracy),
      errors: Number(errors ?? 0),
      durationSec: Number(durationSec ?? 0),
      secondStats: JSON.stringify(secondStats ?? []),
    },
  });

  res.json({ ...test, secondStats: JSON.parse(test.secondStats), saved: !!req.userId });
});

// Logged-in user's own test history (dashboard/profile).
router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const tests = await prisma.typingTest.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
    include: { sheet: { select: { title: true, topic: true } } },
  });
  res.json(tests.map((t: (typeof tests)[number]) => ({ ...t, secondStats: JSON.parse(t.secondStats) })));
});

router.get("/:id", async (req: Request, res: Response): Promise<any> => {
  const test = await prisma.typingTest.findUnique({ where: { id: req.params.id } });
  if (!test) return res.status(404).json({ error: "Test not found" });
  res.json({ ...test, secondStats: JSON.parse(test.secondStats) });
});

export default router;
