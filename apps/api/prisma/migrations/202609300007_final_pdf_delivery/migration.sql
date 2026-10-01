CREATE TYPE "FinalDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED_CONFIGURATION');

CREATE TABLE "FinalDocument" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "documentVersionId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "renderedHtml" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryStatus" "FinalDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "emailedAt" TIMESTAMP(3),
    "deliveryError" TEXT,

    CONSTRAINT "FinalDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinalDocument_matterId_key" ON "FinalDocument"("matterId");
CREATE UNIQUE INDEX "FinalDocument_documentVersionId_key" ON "FinalDocument"("documentVersionId");
CREATE UNIQUE INDEX "FinalDocument_storageKey_key" ON "FinalDocument"("storageKey");
CREATE INDEX "FinalDocument_generatedAt_idx" ON "FinalDocument"("generatedAt");

ALTER TABLE "FinalDocument"
ADD CONSTRAINT "FinalDocument_matterId_fkey"
FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinalDocument"
ADD CONSTRAINT "FinalDocument_documentVersionId_fkey"
FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
