import crypto from "crypto";

const HMAC_PREFIX = "hmac1:";

function legacyHashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

// OTPs are short-lived and single-use. Use a server-secret keyed hash so a
// database-only leak cannot cheaply brute-force a six-digit code offline.
// The prefix distinguishes new keyed hashes from existing SHA-256 hashes.
export function hashCode(code: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required to hash verification codes.");
  const digest = crypto.createHmac("sha256", secret).update(code).digest("hex");
  return HMAC_PREFIX + digest;
}

export function codesMatch(candidate: string, storedHash: string): boolean {
  let expectedHex: string;
  let storedHex = storedHash;

  if (storedHash.startsWith(HMAC_PREFIX)) {
    const secret = process.env.JWT_SECRET;
    if (!secret) return false;
    expectedHex = crypto.createHmac("sha256", secret).update(candidate).digest("hex");
    storedHex = storedHash.slice(HMAC_PREFIX.length);
  } else {
    // Backward compatibility for live OTPs created before keyed hashing.
    expectedHex = legacyHashCode(candidate);
  }

  if (!/^[a-f0-9]{64}$/i.test(storedHex)) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const stored = Buffer.from(storedHex, "hex");
  return expected.length === stored.length && crypto.timingSafeEqual(expected, stored);
}

export const MAX_CODE_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 30 * 1000;
