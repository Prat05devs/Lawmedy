CREATE TYPE "MatterType" AS ENUM ('LEGAL_NOTICE', 'RTI');
CREATE TYPE "MatterStatus" AS ENUM ('DRAFT', 'INTAKE_IN_PROGRESS', 'COMPLETED');
CREATE SEQUENCE matter_reference_sequence;
CREATE FUNCTION next_matter_reference() RETURNS text LANGUAGE sql AS $$
  SELECT 'MAT-' || EXTRACT(YEAR FROM CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::text || '-' ||
    CASE WHEN n < 1000000 THEN lpad(n::text, 6, '0') ELSE n::text END
  FROM nextval('matter_reference_sequence') AS n;
$$;
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY, "email" TEXT NOT NULL, "passwordHash" TEXT NOT NULL,
  "fullName" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "Matter" (
  "id" TEXT PRIMARY KEY, "referenceNumber" TEXT NOT NULL DEFAULT next_matter_reference(),
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "type" "MatterType" NOT NULL, "status" "MatterStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "Matter_referenceNumber_key" ON "Matter"("referenceNumber");
CREATE INDEX "Matter_userId_createdAt_idx" ON "Matter"("userId", "createdAt");
CREATE TABLE "MatterStatement" (
  "id" TEXT PRIMARY KEY, "matterId" TEXT NOT NULL REFERENCES "Matter"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "statement" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "MatterStatement_matterId_createdAt_idx" ON "MatterStatement"("matterId", "createdAt");
CREATE TABLE "audit_logs" (
  "id" TEXT PRIMARY KEY, "actorType" TEXT NOT NULL DEFAULT 'USER', "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL, "entityType" TEXT NOT NULL, "entityId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");
