import { createClient } from "@libsql/client";

/**
 * Turso is accessed through Prisma's libSQL driver adapter at runtime. Prisma
 * Migrate is intentionally not used here: remote Turso schema changes are
 * applied through SQL/Turso tooling, while Vercel's serverless runtime must
 * still be able to recover from a database that was provisioned without the
 * latest migrations.
 *
 * This bootstrap is additive and idempotent. It only creates missing tables
 * and adds missing nullable/defaulted columns; it never drops or truncates
 * data. The cached promise means a warm function does this once per process.
 */
const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:./dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const db = createClient({ url, authToken });

let schemaPromise: Promise<void> | undefined;

async function exec(sql: string) {
  await db.execute(sql);
}

async function addColumn(table: string, definition: string) {
  try {
    await exec(`ALTER TABLE "${table}" ADD COLUMN ${definition}`);
  } catch (error: any) {
    // SQLite/libSQL reports a duplicate-column error when the column is
    // already present. That is the expected result on an up-to-date DB.
    const message = String(error?.message || error || "").toLowerCase();
    if (!message.includes("duplicate column") && !message.includes("already exists")) throw error;
  }
}

async function bootstrap() {
  await exec(`CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "username" TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT,
    "googleId" TEXT UNIQUE,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "hasDonated" BOOLEAN NOT NULL DEFAULT false,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "termsAcceptedVersion" TEXT,
    "privacyAcceptedVersion" TEXT,
    "refundAcceptedVersion" TEXT,
    "legalAcceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS "Sheet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "charCount" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'easy',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS "TypingTest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "sheetId" INTEGER NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'paper',
    "wpm" REAL NOT NULL,
    "rawWpm" REAL NOT NULL,
    "accuracy" REAL NOT NULL,
    "errors" INTEGER NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "secondStats" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("sheetId") REFERENCES "Sheet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "razorpayKeyId" TEXT,
    "razorpayKeySecret" TEXT,
    "donationMessage" TEXT NOT NULL DEFAULT 'Every rupee helps keep the servers running, the domains renewed, and new features shipping. Thank you for supporting VC Typing!',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "supportEmail" TEXT NOT NULL DEFAULT 'support@mangotyping.fun',
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpSecure" BOOLEAN,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "smtpFrom" TEXT,
    "smtpFromName" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS "Donation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "amountRupees" INTEGER NOT NULL,
    "razorpayOrderId" TEXT NOT NULL UNIQUE,
    "razorpayPaymentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'created',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS "LegalPage" (
    "slug" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS "OtpToken" (
    "email" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS "RateLimit" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS "VerificationCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "targetEmail" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`);

  // Additive compatibility for databases created by older versions.
  await addColumn("User", '"sessionVersion" INTEGER NOT NULL DEFAULT 0');
  await addColumn("User", '"termsAcceptedVersion" TEXT');
  await addColumn("User", '"privacyAcceptedVersion" TEXT');
  await addColumn("User", '"refundAcceptedVersion" TEXT');
  await addColumn("User", '"legalAcceptedAt" DATETIME');
  await addColumn("Sheet", '"difficulty" TEXT NOT NULL DEFAULT \'easy\'');
  await addColumn("Settings", '"maintenanceMode" BOOLEAN NOT NULL DEFAULT false');
  await addColumn("Settings", '"supportEmail" TEXT NOT NULL DEFAULT \'support@mangotyping.fun\'');
  await addColumn("Settings", '"smtpHost" TEXT');
  await addColumn("Settings", '"smtpPort" INTEGER');
  await addColumn("Settings", '"smtpSecure" BOOLEAN');
  await addColumn("Settings", '"smtpUser" TEXT');
  await addColumn("Settings", '"smtpPass" TEXT');
  await addColumn("Settings", '"smtpFrom" TEXT');
  await addColumn("Settings", '"smtpFromName" TEXT');
  await addColumn("OtpToken", '"attempts" INTEGER NOT NULL DEFAULT 0');
  await addColumn("OtpToken", '"lastSentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
  await addColumn("VerificationCode", '"attempts" INTEGER NOT NULL DEFAULT 0');

  await exec(`CREATE INDEX IF NOT EXISTS "TypingTest_userId_idx" ON "TypingTest" ("userId")`);
  await exec(`CREATE INDEX IF NOT EXISTS "VerificationCode_userId_purpose_idx" ON "VerificationCode" ("userId", "purpose")`);
}

export function ensureDbSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = bootstrap().catch((error) => {
      schemaPromise = undefined;
      throw error;
    });
  }
  return schemaPromise;
}
