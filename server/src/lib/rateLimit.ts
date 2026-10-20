import { Request } from "express";
import { prisma } from "./db";

// Keep cleanup state and helpers at module scope. Defining them inside the
// request handler below their first use causes a temporal-dead-zone exception.
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
const RATE_LIMIT_RETENTION_MS = 24 * 60 * 60 * 1000;
let lastRateLimitCleanupAt = 0;

async function cleanupExpiredRateLimits(nowMs: number): Promise<void> {
  if (nowMs - lastRateLimitCleanupAt < RATE_LIMIT_CLEANUP_INTERVAL_MS) return;

  // Set before awaiting so concurrent requests in this instance don't all run it.
  lastRateLimitCleanupAt = nowMs;
  try {
    await prisma.rateLimit.deleteMany({
      where: { windowStart: { lt: new Date(nowMs - RATE_LIMIT_RETENTION_MS) } },
    });
  } catch (error) {
    // Cleanup is best-effort and must never disable the actual rate limiter.
    console.error("Failed to clean expired rate-limit rows:", error);
  }
}

// DB-backed fixed-window rate limiter. This works across serverless invocations
// and concurrent instances unlike an in-memory Map.
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
  await cleanupExpiredRateLimits(now.getTime());

  // The UPSERT serializes updates to each key, avoiding a reset race at
  // fixed-window boundaries.
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

  // A live window that has reached its limit returns no row; read its start
  // time only to calculate the retry delay.
  const row = await prisma.rateLimit.findUnique({ where: { key } });
  const retryAfterMs = row
    ? Math.max(1, windowMs - (now.getTime() - row.windowStart.getTime()))
    : windowMs;

  return { ok: false, retryAfterMs };
}

// Relies on app.set("trust proxy", 1) in index.ts so client IPs use exactly
// the configured trusted proxy hop count instead of trusting arbitrary headers.
export function clientIp(req: Request): string {
  return req.ip || req.socket?.remoteAddress || "unknown";
}
