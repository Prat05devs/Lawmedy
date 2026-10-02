-- Manual payment verification: user submits a payment reference, the team verifies it.
ALTER TYPE "MatterStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_VERIFICATION' AFTER 'READY_FOR_PAYMENT';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED' AFTER 'CREATED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TABLE "Payment"
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "verifiedById" TEXT,
  ADD COLUMN "reviewNote" TEXT;
