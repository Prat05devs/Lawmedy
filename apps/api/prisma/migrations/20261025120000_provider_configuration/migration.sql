CREATE TABLE "provider_configuration" (
  "id" TEXT NOT NULL DEFAULT 'providers',
  "paymentMode" TEXT NOT NULL,
  "geminiModel" TEXT NOT NULL,
  "geminiFallbackModels" TEXT[] NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "provider_configuration_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "provider_credentials" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT '',
  "label" TEXT NOT NULL,
  "ciphertext" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "retired" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "provider_credentials_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "provider_credentials_provider_mode_retired_idx" ON "provider_credentials"("provider", "mode", "retired");
ALTER TABLE "Payment" ADD COLUMN "providerCredentialId" TEXT;
