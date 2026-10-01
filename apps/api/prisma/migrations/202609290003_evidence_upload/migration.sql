CREATE TYPE "EvidenceStatus" AS ENUM ('PROCESSING', 'PROCESSED', 'FAILED');
CREATE TYPE "EvidenceExtractionStatus" AS ENUM ('SUCCEEDED', 'FAILED');

CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "status" "EvidenceStatus" NOT NULL DEFAULT 'PROCESSING',
    "statusMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EvidenceExtraction" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "aiRunId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "extraction" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION,
    "status" "EvidenceExtractionStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvidenceExtraction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Evidence_storageKey_key" ON "Evidence"("storageKey");
CREATE INDEX "Evidence_matterId_createdAt_idx" ON "Evidence"("matterId", "createdAt");
CREATE UNIQUE INDEX "EvidenceExtraction_evidenceId_key" ON "EvidenceExtraction"("evidenceId");
CREATE UNIQUE INDEX "EvidenceExtraction_aiRunId_key" ON "EvidenceExtraction"("aiRunId");

ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EvidenceExtraction" ADD CONSTRAINT "EvidenceExtraction_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EvidenceExtraction" ADD CONSTRAINT "EvidenceExtraction_aiRunId_fkey" FOREIGN KEY ("aiRunId") REFERENCES "ai_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
