-- CreateEnum
CREATE TYPE "GovernmentLevel" AS ENUM ('CENTRAL', 'STATE', 'LOCAL');

-- DropForeignKey
ALTER TABLE "DocumentVersion" DROP CONSTRAINT "DocumentVersion_aiRunId_fkey";

-- DropForeignKey
ALTER TABLE "MatterQuestion" DROP CONSTRAINT "MatterQuestion_analysisId_fkey";

-- CreateTable
CREATE TABLE "PublicAuthority" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "governmentLevel" "GovernmentLevel" NOT NULL,
    "state" TEXT,
    "address" TEXT NOT NULL,
    "rtiPortalUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicAuthority_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RtiDetail" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "governmentLevel" "GovernmentLevel" NOT NULL,
    "state" TEXT,
    "department" TEXT NOT NULL,
    "publicAuthorityId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3),
    "periodTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RtiDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatterWorkflowConfiguration" (
    "id" TEXT NOT NULL,
    "matterType" "MatterType" NOT NULL,
    "category" TEXT NOT NULL DEFAULT '*',
    "requiresAdvocateReview" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatterWorkflowConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicAuthority_name_key" ON "PublicAuthority"("name");

-- CreateIndex
CREATE INDEX "PublicAuthority_governmentLevel_state_name_idx" ON "PublicAuthority"("governmentLevel", "state", "name");

-- CreateIndex
CREATE UNIQUE INDEX "RtiDetail_matterId_key" ON "RtiDetail"("matterId");

-- CreateIndex
CREATE INDEX "RtiDetail_publicAuthorityId_idx" ON "RtiDetail"("publicAuthorityId");

-- CreateIndex
CREATE UNIQUE INDEX "MatterWorkflowConfiguration_matterType_category_key" ON "MatterWorkflowConfiguration"("matterType", "category");

-- AddForeignKey
ALTER TABLE "RtiDetail" ADD CONSTRAINT "RtiDetail_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RtiDetail" ADD CONSTRAINT "RtiDetail_publicAuthorityId_fkey" FOREIGN KEY ("publicAuthorityId") REFERENCES "PublicAuthority"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterQuestion" ADD CONSTRAINT "MatterQuestion_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "MatterAiAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_aiRunId_fkey" FOREIGN KEY ("aiRunId") REFERENCES "ai_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
