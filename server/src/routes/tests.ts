import { Router, Request, Response } from "express";
import { optionalAuth, requireAuth, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/db";
import { checkRateLimit, clientIp } from "../lib/rateLimit";

const router = Router();

// Sanity bounds on submitted results — a typing test has physical limits,
// so anything outside these is either a bug or someone posting fake scores
// straight to the API (the endpoint accepts guest submissions, so it can't
// require auth to filter this out).
const MAX_WPM = 400;
const MAX_DURATION_SEC = 3600;

function boundsError(wpm: number, rawWpm: number, accuracy: number, errors: number, durationSec: number): string | null {
  if (!(wpm >= 0 && wpm <= MAX_WPM)) return "Invalid wpm.";
  if (!(rawWpm >= 0 && rawWpm <= MAX_WPM)) return "Invalid rawWpm.";
  if (!(accuracy >= 0 && accuracy <= 100)) return "Invalid accuracy.";
  if (!(errors >= 0)) return "Invalid errors.";
  if (!(durationSec >= 1 && durationSec <= MAX_DURATION_SEC)) return "Invalid durationSec.";
  return null;
}

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

  // Rate limit per-IP (covers guest spam) and per-account (covers a logged
  // in account being used to flood the leaderboard/history).
  const ip = clientIp(req);
  const ipLimit = await checkRateLimit(`test-submit:ip:${ip}`, 30, 60 * 1000);
  if (!ipLimit.ok) return res.status(429).json({ error: "Too many submissions. Slow down." });
  if (req.userId) {
    const acctLimit = await checkRateLimit(`test-submit:acct:${req.userId}`, 30, 60 * 1000);
    if (!acctLimit.ok) return res.status(429).json({ error: "Too many submissions. Slow down." });
  }

  const numWpm = Number(wpm);
  const numRawWpm = Number(rawWpm ?? wpm);
  const numAccuracy = Number(accuracy);
  const numErrors = Number(errors ?? 0);
  const numDuration = Number(durationSec ?? 0);
  const err = boundsError(numWpm, numRawWpm, numAccuracy, numErrors, numDuration);
  if (err) return res.status(400).json({ error: err });

  const test = await prisma.typingTest.create({
    data: {
      userId: req.userId ?? null,
      sheetId: Number(sheetId),
      mode: mode === "screen" ? "screen" : "paper",
      wpm: numWpm,
      rawWpm: numRawWpm,
      accuracy: numAccuracy,
      errors: numErrors,
      durationSec: numDuration,
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

// Not used by the client today, but was a public IDOR: any test ID (a UUID,
// but still) returned any user's full result. Now requires auth + ownership,
// and returns 404 (not 403) for someone else's test — same response for
// "doesn't exist" and "exists but isn't yours" so IDs can't be enumerated.
router.get("/:id", requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const test = await prisma.typingTest.findUnique({ where: { id: req.params.id } });
  if (!test || test.userId !== req.userId) return res.status(404).json({ error: "Test not found" });
  res.json({ ...test, secondStats: JSON.parse(test.secondStats) });
});

export default router;
