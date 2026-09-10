import crypto from "crypto";

const N = 32768;
const R = 8;
const P = 1;
const KEYLEN = 32;
const SALT_LEN = 16;
const PREFIX = "scrypt$1$";

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEYLEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 }, (err, derived) => {
      if (err) reject(err); else resolve(derived);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LEN);
  const derived = await derive(password, salt);
  return `${PREFIX}${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  if (!encoded.startsWith(PREFIX)) return false;
  const parts = encoded.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt" || parts[1] !== "1") return false;
  try {
    const salt = Buffer.from(parts[2], "base64url");
    const expected = Buffer.from(parts[3], "base64url");
    if (salt.length !== SALT_LEN || expected.length !== KEYLEN) return false;
    const actual = await derive(password, salt);
    return crypto.timingSafeEqual(actual, expected);
  } catch { return false; }
}

export function isModernPasswordHash(encoded: string): boolean { return encoded.startsWith(PREFIX); }
