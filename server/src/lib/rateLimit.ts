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
  const row = await prisma.rateLimit.findUnique({ where: { key } });

  if (!row || now.getTime() - row.windowStart.getTime() > windowMs) {
    await prisma.rateLimit.upsert({
      where: { key },
      update: { count: 1, windowStart: now },
      create: { key, count: 1, windowStart: now },
    });
    return { ok: true, retryAfterMs: 0 };
  }

  if (row.count >= limit) {
    return { ok: false, retryAfterMs: windowMs - (now.getTime() - row.windowStart.getTime()) };
  }

  await prisma.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
  return { ok: true, retryAfterMs: 0 };
}

// req.ip requires `app.set("trust proxy", ...)` to be accurate behind
// Vercel's proxy; x-forwarded-for is set reliably by Vercel's edge network.
export function clientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}
