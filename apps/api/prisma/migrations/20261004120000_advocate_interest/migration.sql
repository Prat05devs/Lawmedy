-- Advocates registering interest in the upcoming advocate portal.
-- CreateEnum
CREATE TYPE "AdvocateInterestStatus" AS ENUM ('NEW', 'CONTACTED', 'ONBOARDED', 'NOT_SUITABLE');

-- CreateTable
CREATE TABLE "AdvocateInterest" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "practicePlace" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'app',
    "status" "AdvocateInterestStatus" NOT NULL DEFAULT 'NEW',
    "contactedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvocateInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdvocateInterest_email_key" ON "AdvocateInterest"("email");

-- CreateIndex
CREATE INDEX "AdvocateInterest_status_createdAt_idx" ON "AdvocateInterest"("status", "createdAt");

