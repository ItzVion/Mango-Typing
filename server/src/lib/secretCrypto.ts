import crypto from "crypto";

// VC-04: Razorpay key secret and SMTP password were previously stored as
// plaintext in the Settings table — anyone with DB read access (a Turso
// console login, a leaked DATABASE_URL, a backup dump) could read them
// directly. This wraps them in AES-256-GCM before they ever touch the DB.
//
// Key is derived from JWT_SECRET (already a required, secret env var) with
// scrypt + a fixed, purpose-specific salt/info string, rather than requiring
// a brand new env var to be provisioned before this can ship. This keeps the
// encryption key itself out of the database (it never leaves the server
// process), which is the actual point — a DB leak alone no longer exposes
// usable secrets.
const KEY = crypto.scryptSync(process.env.JWT_SECRET!, "vc-typing:settings-secrets:v1", 32);
const ALGO = "aes-256-gcm";
const PREFIX = "enc1:"; // lets decrypt() recognize our format vs. pre-existing plaintext rows

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return PREFIX + [iv, authTag, ciphertext].map((b) => b.toString("base64")).join(".");
}

// Transparently passes through anything not in our envelope format, so
// secrets saved before this change (plaintext) keep working until the next
// time they're re-saved from /admin (which always encrypts on write).
export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) return value ?? null;
  if (!value.startsWith(PREFIX)) return value;
  try {
    const [ivB64, tagB64, dataB64] = value.slice(PREFIX.length).split(".");
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(tagB64, "base64");
    const data = Buffer.from(dataB64, "base64");
    const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    // Corrupt/unreadable value (e.g. JWT_SECRET rotated) — fail closed rather
    // than handing back ciphertext as if it were a usable secret.
    return null;
  }
}
