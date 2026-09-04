-- Lets a password change or an owner-forced logout invalidate every
-- previously issued JWT for that user, without a token blocklist table.
-- Bumped on password change; embedded in the JWT at sign time and checked
-- against the live DB value on every authenticated request.
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
