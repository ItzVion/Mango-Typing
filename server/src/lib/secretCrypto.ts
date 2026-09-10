import crypto from "crypto";

const ALGO = "aes-256-gcm";
const PREFIX = "enc2:";
const LEGACY_PREFIX = "enc1:";

function keyFromEnv(): Buffer {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!raw) throw new Error("SETTINGS_ENCRYPTION_KEY is required to encrypt stored secrets.");
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64url");
  if (key.length !== 32) throw new Error("SETTINGS_ENCRYPTION_KEY must be a 32-byte key (64 hex characters or base64url).");
  return key;
}

function legacyKey(): Buffer {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required for legacy secret migration.");
  return crypto.scryptSync(process.env.JWT_SECRET, "vc-typing:settings-secrets:v1", 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
}

export function isEncryptedSecret(value: string | null | undefined): boolean { return !!value && (value.startsWith(PREFIX) || value.startsWith(LEGACY_PREFIX)); }
export function generateSettingsEncryptionKey(): string { return crypto.randomBytes(32).toString("base64url"); }

export function encryptSecret(plain: string): string {
  const key = keyFromEnv(); const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]); const authTag = cipher.getAuthTag();
  return PREFIX + [iv, authTag, ciphertext].map((b) => b.toString("base64url")).join(".");
}

function decryptWithKey(value: string, prefix: string, key: Buffer): string | null {
  try {
    const [ivB64, tagB64, dataB64] = value.slice(prefix.length).split("."); const iv = Buffer.from(ivB64, "base64url");
    const authTag = Buffer.from(tagB64, "base64url"); const data = Buffer.from(dataB64, "base64url");
    if (iv.length !== 12 || authTag.length !== 16) return null;
    const decipher = crypto.createDecipheriv(ALGO, key, iv); decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch { return null; }
}

export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) return value ?? null;
  if (value.startsWith(PREFIX)) return decryptWithKey(value, PREFIX, keyFromEnv());
  if (value.startsWith(LEGACY_PREFIX)) return decryptWithKey(value, LEGACY_PREFIX, legacyKey());
  return null;
}
