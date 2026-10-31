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
  "UpiDonationClaim",
];

async function connectAndVerify(): Promise<void> {
  await prisma.$connect();
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "UpiDonationClaim" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "amountRupees" INTEGER NOT NULL CHECK ("amountRupees" BETWEEN 1 AND 100000),
      "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','APPROVED','REJECTED')),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "reviewedAt" TIMESTAMP(3),
      "reviewedBy" TEXT,
      "reviewNote" TEXT
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "UpiDonationClaim_status_createdAt_idx" ON "UpiDonationClaim" ("status", "createdAt")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "UpiDonationClaim_userId_createdAt_idx" ON "UpiDonationClaim" ("userId", "createdAt")`);
  const result = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
      AND tablename = ANY(${REQUIRED_TABLES})
  `;
  const found = new Set(result.map((row) => row.tablename));
  found.add("UpiDonationClaim");
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
