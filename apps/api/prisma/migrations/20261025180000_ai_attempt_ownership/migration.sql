ALTER TABLE "ai_runs" ADD COLUMN "parentRunId" TEXT;
CREATE INDEX "ai_runs_parentRunId_idx" ON "ai_runs"("parentRunId");
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_parentRunId_fkey"
  FOREIGN KEY ("parentRunId") REFERENCES "ai_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Older provider attempts did not record ownership. Keep usage/status metadata,
-- but erase unowned output rather than retaining potentially personal content.
UPDATE "ai_runs" SET "output" = NULL WHERE "taskType" = 'PROVIDER_ATTEMPT' AND "matterId" IS NULL AND "parentRunId" IS NULL;
