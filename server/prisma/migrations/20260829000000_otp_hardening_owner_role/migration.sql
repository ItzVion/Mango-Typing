-- Brute-force / abuse hardening for OTP and verification-code flows.
-- attempts: counts failed verification attempts; row is invalidated once a
--           limit is hit in application code (see auth.ts / account.ts).
-- lastSentAt: lets /resend-otp enforce a server-side cooldown, not just the
--             client-side timer (which a direct API call could bypass).
ALTER TABLE "OtpToken" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OtpToken" ADD COLUMN "lastSentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "VerificationCode" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- Set the existing owner account's role. Safe to re-run (idempotent).
UPDATE "User" SET "role" = 'OWNER' WHERE lower("email") = lower('vion4712@gmail.com');
