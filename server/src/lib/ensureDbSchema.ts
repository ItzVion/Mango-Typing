import { prisma } from "./db";

let connectionPromise: Promise<void> | undefined;

const REQUIRED_TABLES = [
  "User",
  "Sheet",
  "TypingTest",
  "Settings",
  "Donation",
  "LegalPage",
  "OtpToken",
  "RateLimit",
  "VerificationCode",
  "RazorpayWebhookEvent",
  "AuditLog",
  "PrivacyRequest",
];

async function connectAndVerify(): Promise<void> {
  await prisma.$connect();
  const result = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
      AND tablename = ANY(${REQUIRED_TABLES})
  `;
  const found = new Set(result.map((row) => row.tablename));
  const missing = REQUIRED_TABLES.filter((name) => !found.has(name));
  if (missing.length) {
    throw new Error(`Database schema incomplete: missing table(s): ${missing.join(", ")}`);
  }
}

export function ensureDbSchema(): Promise<void> {
  if (!connectionPromise) {
    connectionPromise = connectAndVerify().catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  }
  return connectionPromise;
}

export function ensureSecuritySchema(): Promise<void> {
  return ensureDbSchema();
}
