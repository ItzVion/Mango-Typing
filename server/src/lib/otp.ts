import crypto from "crypto";

// OTPs/verification codes are short-lived (10 min) and single-use, but we
// still don't store them in plaintext — a DB read (backup, admin query,
// logging mistake) shouldn't hand over a live code.
export function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function codesMatch(candidate: string, storedHash: string): boolean {
  const candidateHash = Buffer.from(hashCode(candidate), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return candidateHash.length === stored.length && crypto.timingSafeEqual(candidateHash, stored);
}

export const MAX_CODE_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 30 * 1000;
