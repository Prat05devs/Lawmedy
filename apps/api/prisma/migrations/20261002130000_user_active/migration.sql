-- Lets an admin deactivate an advocate without deleting their history.
ALTER TABLE "User" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
