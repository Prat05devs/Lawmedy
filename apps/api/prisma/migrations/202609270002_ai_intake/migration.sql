ALTER TABLE "Matter" ADD COLUMN "currentStatementId" TEXT;
UPDATE "Matter" m SET "currentStatementId" = s.id FROM (
  SELECT DISTINCT ON ("matterId") id, "matterId" FROM "MatterStatement" ORDER BY "matterId", "createdAt" DESC, id DESC
) s WHERE s."matterId" = m.id;
CREATE UNIQUE INDEX "Matter_currentStatementId_key" ON "Matter"("currentStatementId");
ALTER TABLE "Matter" ADD CONSTRAINT "Matter_currentStatementId_fkey" FOREIGN KEY ("currentStatementId") REFERENCES "MatterStatement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TYPE "AiRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');
CREATE TABLE "ai_runs" (
  "id" TEXT PRIMARY KEY, "matterId" TEXT NOT NULL, "taskType" TEXT NOT NULL,
  "provider" TEXT NOT NULL, "modelName" TEXT NOT NULL, "promptVersion" TEXT NOT NULL,
  "inputReference" TEXT NOT NULL, "output" JSONB, "status" "AiRunStatus" NOT NULL DEFAULT 'RUNNING',
  "inputTokens" INTEGER, "outputTokens" INTEGER, "latencyMs" INTEGER, "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "finishedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_runs_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ai_runs_matterId_inputReference_createdAt_idx" ON "ai_runs"("matterId", "inputReference", "createdAt");
CREATE TABLE "MatterAiAnalysis" (
  "id" TEXT PRIMARY KEY, "matterId" TEXT NOT NULL, "statementId" TEXT NOT NULL, "aiRunId" TEXT NOT NULL,
  "category" TEXT NOT NULL, "summary" TEXT NOT NULL, "facts" JSONB NOT NULL, "missingInformation" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MatterAiAnalysis_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MatterAiAnalysis_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "MatterStatement"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MatterAiAnalysis_aiRunId_fkey" FOREIGN KEY ("aiRunId") REFERENCES "ai_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MatterAiAnalysis_statementId_key" ON "MatterAiAnalysis"("statementId");
CREATE UNIQUE INDEX "MatterAiAnalysis_aiRunId_key" ON "MatterAiAnalysis"("aiRunId");
CREATE INDEX "MatterAiAnalysis_matterId_createdAt_idx" ON "MatterAiAnalysis"("matterId", "createdAt");
CREATE TABLE "MatterQuestion" (
  "id" TEXT PRIMARY KEY, "matterId" TEXT NOT NULL, "analysisId" TEXT NOT NULL,
  "question" TEXT NOT NULL, "questionType" TEXT NOT NULL, "position" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MatterQuestion_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MatterQuestion_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "MatterAiAnalysis"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MatterQuestion_analysisId_position_key" ON "MatterQuestion"("analysisId", "position");
CREATE INDEX "MatterQuestion_matterId_idx" ON "MatterQuestion"("matterId");
CREATE TABLE "MatterAnswer" (
  "id" TEXT PRIMARY KEY, "questionId" TEXT NOT NULL, "answer" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MatterAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "MatterQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MatterAnswer_questionId_key" ON "MatterAnswer"("questionId");
