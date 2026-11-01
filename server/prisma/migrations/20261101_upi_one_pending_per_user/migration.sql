-- Enforce at most one pending UPI claim per account, including concurrent requests.
-- Existing production data was checked for duplicate pending claims before applying.
CREATE UNIQUE INDEX IF NOT EXISTS "UpiDonationClaim_one_pending_per_user"
ON public."UpiDonationClaim" ("userId")
WHERE status = 'PENDING';
