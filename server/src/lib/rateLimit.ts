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
  if (!Number.isSafeInteger(limit) || limit < 1 || !Number.isFinite(windowMs) || windowMs < 1) {
    throw new Error("Invalid rate-limit configuration.");
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() - windowMs);

  // A single PostgreSQL UPSERT serializes updates to the key. This prevents
  // concurrent requests at a window boundary from all resetting the same
  // expired row and bypassing the configured limit.
  const rows = await prisma.$queryRaw<Array<{ count: number; windowStart: Date }>>`
    INSERT INTO public."RateLimit" AS rl ("key", "count", "windowStart")
    VALUES (${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN rl."windowStart" <= ${cutoff} THEN 1 ELSE rl."count" + 1 END,
      "windowStart" = CASE WHEN rl."windowStart" <= ${cutoff} THEN ${now} ELSE rl."windowStart" END
    WHERE rl."windowStart" <= ${cutoff} OR rl."count" < ${limit}
    RETURNING "count", "windowStart"
  `;

  if (rows.length === 1) return { ok: true, retryAfterMs: 0 };

  // No row is returned when a live rate-limit window has already reached its
  // limit. Read it only to calculate the retry delay.
  const row = await prisma.rateLimit.findUnique({ where: { key } });
  const retryAfterMs = row
    ? Math.max(1, windowMs - (now.getTime() - row.windowStart.getTime()))
    : windowMs;
  return { ok: false, retryAfterMs };
}

// Relies on `app.set("trust proxy", 1)` in index.ts. With that set, Express's
// own req.ip is derived from x-forwarded-for but only trusts exactly the
// number of proxy hops configured — a client can't just add its own
// x-forwarded-for header and have it taken as the real IP, unlike manually
// reading req.headers["x-forwarded-for"] outright (the previous approach).
export function clientIp(req: Request): string {
  return req.ip || req.socket?.remoteAddress || "unknown";
}
