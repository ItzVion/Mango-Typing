// Fails fast on boot instead of silently running with insecure defaults.
// Only enforced in production — local dev keeps the convenience fallbacks
// that live inline in the files that use them (auth middleware, etc).
export function validateConfig() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) return;

  const missing: string[] = [];
  if (!process.env.JWT_SECRET) missing.push("JWT_SECRET");
  if (!process.env.TURSO_DATABASE_URL && !process.env.DATABASE_URL) missing.push("TURSO_DATABASE_URL or DATABASE_URL");

  if (missing.length) {
    console.error(`Refusing to start: missing required environment variable(s): ${missing.join(", ")}`);
    throw new Error(`Missing required environment variable(s): ${missing.join(", ")}`);
  }

  // These aren't fatal — the features they gate just won't work — but they're
  // worth a loud one-time warning instead of a confusing runtime 500 later.
  if (!process.env.GOOGLE_CLIENT_ID) console.warn("GOOGLE_CLIENT_ID not set — Google sign-in is disabled.");
  if (!process.env.SMTP_HOST && !process.env.SMTP_USER) {
    console.warn("No SMTP_* env vars set — OTP emails rely entirely on Admin > Email settings being configured.");
  }
}
