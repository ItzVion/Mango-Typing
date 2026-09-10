// Fails fast on boot instead of silently running with insecure defaults.
export function validateConfig() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) return;

  const missing: string[] = [];
  if (!process.env.JWT_SECRET) missing.push("JWT_SECRET");
  if (!process.env.SETTINGS_ENCRYPTION_KEY) missing.push("SETTINGS_ENCRYPTION_KEY");
  if (!process.env.TURSO_DATABASE_URL && !process.env.DATABASE_URL) missing.push("TURSO_DATABASE_URL or DATABASE_URL");
  if (process.env.SETTINGS_ENCRYPTION_KEY) {
    try {
      const rawKey = process.env.SETTINGS_ENCRYPTION_KEY!;
      const key = /^[0-9a-fA-F]{64}$/.test(rawKey) ? Buffer.from(rawKey, "hex") : Buffer.from(rawKey, "base64url");
      if (key.length !== 32) throw new Error();
    } catch {
      missing.push("SETTINGS_ENCRYPTION_KEY (must be a 32-byte key: 64 hex or base64url)");
    }
  }
  if (missing.length) {
    console.error(`Refusing to start: missing required environment variable(s): ${missing.join(", ")}`);
    throw new Error(`Missing required environment variable(s): ${missing.join(", ")}`);
  }
  if (!process.env.GOOGLE_CLIENT_ID) console.warn("GOOGLE_CLIENT_ID not set — Google sign-in is disabled.");
  if (!process.env.SMTP_HOST && !process.env.SMTP_USER) console.warn("No SMTP_* env vars set — OTP emails rely entirely on Admin > Email settings being configured.");
}
