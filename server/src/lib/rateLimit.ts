import { Request } from "express";
import { prisma } from "./db";

// DB-backed fixed-window rate limiter. Vercel serverless functions share no
// in-process memory between invocations, so an in-memory Map would reset on
// every cold start and wouldn't be shared across concurrent instances —
// this needs to live in the DB to actually work.
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: boolean; retryAfterMs: number }> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowMs);

  // Atomic conditional increment: only succeeds if a live window row exists
  // AND its count is still under the limit, checked and incremented in one
  // statement. This is the fix for the previous read-then-write race, where
  // N concurrent requests could all read count = limit-1 and all pass —
  // exactly the scenario a brute-force attempt produces.
  const inc = await prisma.rateLimit.updateMany({
    where: { key, windowStart: { gt: cutoff }, count: { lt: limit } },
    data: { count: { increment: 1 } },
  });
  if (inc.count > 0) return { ok: true, retryAfterMs: 0 };

  // updateMany matched nothing — either the limit is already hit in a live
  // window (genuinely blocked), or there's no live window (expired/never
  // started).
  const row = await prisma.rateLimit.findUnique({ where: { key } });
  if (row && row.windowStart > cutoff) {
    return { ok: false, retryAfterMs: windowMs - (now.getTime() - row.windowStart.getTime()) };
  }

  // No live window: start a fresh one. A concurrent request could still race
  // here, but the worst case is a couple of extra allowed requests right at
  // a window boundary — not a bypass within an established window, which is
  // the case above that actually matters for brute-force protection.
  await prisma.rateLimit.upsert({
    where: { key },
    update: { count: 1, windowStart: now },
    create: { key, count: 1, windowStart: now },
  });
  return { ok: true, retryAfterMs: 0 };
}

// req.ip requires `app.set("trust proxy", ...)` to be accurate behind
// Vercel's proxy; x-forwarded-for is set reliably by Vercel's edge network.
export function clientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}
