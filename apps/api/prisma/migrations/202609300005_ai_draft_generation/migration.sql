ALTER TYPE "MatterStatus" ADD VALUE IF NOT EXISTS 'AI_PROCESSING';
ALTER TYPE "MatterStatus" ADD VALUE IF NOT EXISTS 'DRAFT_GENERATED';

CREATE TYPE "LegalDocumentStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED', 'MISSING_INFORMATION');
CREATE TYPE "DocumentVersionCreatorType" AS ENUM ('AI', 'ADVOCATE');

CREATE TABLE "LegalDocument" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "status" "LegalDocumentStatus" NOT NULL DEFAULT 'PROCESSING',
    "currentVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "createdByType" "DocumentVersionCreatorType" NOT NULL,
    "createdById" TEXT NOT NULL,
    "aiRunId" TEXT NOT NULL,
    "qa" JSONB,
    "qaAiRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LegalDocument_matterId_documentType_key" ON "LegalDocument"("matterId", "documentType");
CREATE INDEX "LegalDocument_matterId_idx" ON "LegalDocument"("matterId");
CREATE UNIQUE INDEX "DocumentVersion_aiRunId_key" ON "DocumentVersion"("aiRunId");
CREATE UNIQUE INDEX "DocumentVersion_qaAiRunId_key" ON "DocumentVersion"("qaAiRunId");
CREATE UNIQUE INDEX "DocumentVersion_documentId_versionNumber_key" ON "DocumentVersion"("documentId", "versionNumber");
CREATE INDEX "DocumentVersion_documentId_createdAt_idx" ON "DocumentVersion"("documentId", "createdAt");

ALTER TABLE "LegalDocument" ADD CONSTRAINT "LegalDocument_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LegalDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_aiRunId_fkey" FOREIGN KEY ("aiRunId") REFERENCES "ai_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_qaAiRunId_fkey" FOREIGN KEY ("qaAiRunId") REFERENCES "ai_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
