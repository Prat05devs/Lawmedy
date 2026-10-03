-- Guest quick checks are logged to ai_runs before any matter exists.
ALTER TABLE "ai_runs" ALTER COLUMN "matterId" DROP NOT NULL;
