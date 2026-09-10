-- Store the legal-policy version accepted by each account.
-- These fields are nullable so existing accounts remain valid and can be
-- required to re-accept the current policies by the application layer.
ALTER TABLE "User" ADD COLUMN "termsAcceptedVersion" TEXT;
ALTER TABLE "User" ADD COLUMN "privacyAcceptedVersion" TEXT;
ALTER TABLE "User" ADD COLUMN "refundAcceptedVersion" TEXT;
ALTER TABLE "User" ADD COLUMN "legalAcceptedAt" DATETIME;
