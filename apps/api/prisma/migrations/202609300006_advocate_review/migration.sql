ALTER TYPE "MatterStatus" ADD VALUE IF NOT EXISTS 'UNDER_ADVOCATE_REVIEW';
ALTER TYPE "MatterStatus" ADD VALUE IF NOT EXISTS 'USER_RESPONSE_REQUIRED';
ALTER TYPE "MatterStatus" ADD VALUE IF NOT EXISTS 'APPROVED';

CREATE TYPE "UserRole" AS ENUM ('USER', 'ADVOCATE', 'ADMIN');
CREATE TYPE "MatterAssignmentStatus" AS ENUM ('PENDING', 'WAITING_FOR_USER', 'COMPLETED');

ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';
ALTER TABLE "MatterQuestion" ALTER COLUMN "analysisId" DROP NOT NULL;
ALTER TABLE "MatterQuestion" ADD COLUMN "requestedByAdvocateId" TEXT;
ALTER TABLE "DocumentVersion" ALTER COLUMN "aiRunId" DROP NOT NULL;
ALTER TABLE "LegalDocument" ADD COLUMN "reviewedById" TEXT;
ALTER TABLE "LegalDocument" ADD COLUMN "reviewedAt" TIMESTAMP(3);

CREATE TABLE "MatterAssignment" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "advocateId" TEXT NOT NULL,
    "status" "MatterAssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "newInformation" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MatterAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MatterAssignment_matterId_key" ON "MatterAssignment"("matterId");
CREATE INDEX "MatterAssignment_advocateId_status_assignedAt_idx" ON "MatterAssignment"("advocateId", "status", "assignedAt");
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

ALTER TABLE "MatterQuestion" ADD CONSTRAINT "MatterQuestion_requestedByAdvocateId_fkey" FOREIGN KEY ("requestedByAdvocateId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LegalDocument" ADD CONSTRAINT "LegalDocument_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MatterAssignment" ADD CONSTRAINT "MatterAssignment_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MatterAssignment" ADD CONSTRAINT "MatterAssignment_advocateId_fkey" FOREIGN KEY ("advocateId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
