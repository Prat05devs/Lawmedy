-- Indexes for the queues the admin desk and the recovery sweep read by status.
CREATE INDEX IF NOT EXISTS "Payment_status_submittedAt_idx" ON "Payment"("status", "submittedAt");
CREATE INDEX IF NOT EXISTS "Matter_status_updatedAt_idx" ON "Matter"("status", "updatedAt");
CREATE INDEX IF NOT EXISTS "Evidence_status_createdAt_idx" ON "Evidence"("status", "createdAt");
