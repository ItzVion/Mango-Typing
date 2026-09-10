-- Brute-force / abuse hardening for OTP and verification-code flows.
-- attempts: counts failed verification attempts; row is invalidated once a
-- limit is hit in application code (see auth.ts / account.ts).
-- lastSentAt: lets /resend-otp enforce a server-side cooldown, not just the
-- client-side timer (which a direct API call could bypass).
ALTER TABLE "OtpToken" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OtpToken" ADD COLUMN "lastSentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Older databases may predate VerificationCode. Create the table here so
-- this migration remains usable from a fresh database before adding its
-- hardening column.
CREATE TABLE IF NOT EXISTS "VerificationCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "targetEmail" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "VerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Existing databases that already have the table only need the column.
-- SQLite has no ADD COLUMN IF NOT EXISTS, so this migration intentionally
-- creates the table with attempts for fresh installs and relies on later
-- schema synchronization for legacy installations where the table exists.

-- Set the existing owner account's role. Safe to re-run (idempotent).
UPDATE "User" SET "role" = 'OWNER' WHERE lower("email") = lower('vion4712@gmail.com');
