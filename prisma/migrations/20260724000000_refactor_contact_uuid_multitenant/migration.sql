-- ============================================================
-- Migration: refactor_contact_uuid_multitenant
-- Purpose  : Normalize Contact model for true multi-tenant isolation.
--            The same WhatsApp phone number can now exist across different
--            tenants as independent Contact rows, each with its own UUID PK.
--
-- RE-WRITTEN FOR FULL IDEMPOTENCY OVER PARTIALLY MIGRATED DBs.
-- ============================================================

BEGIN;

SELECT 'PASO 1: Add new fields to Contact';
ALTER TABLE "Contact"
  ADD COLUMN IF NOT EXISTS "externalId"      TEXT,
  ADD COLUMN IF NOT EXISTS "phoneNormalized" TEXT,
  ADD COLUMN IF NOT EXISTS "_newId"          TEXT;

SELECT 'PASO 2: Back-fill externalId and generate UUIDs safely';
UPDATE "Contact"
SET
  "externalId"      = COALESCE("externalId", "id"),
  "phone"           = COALESCE("phone", regexp_replace("id", '@(c\.us|lid|s\.whatsapp\.net|g\.us)$', '')),
  "phoneNormalized" = COALESCE("phoneNormalized", regexp_replace("id", '@(c\.us|lid|s\.whatsapp\.net|g\.us)$', '')),
  "_newId"          = COALESCE("_newId", gen_random_uuid()::text)
WHERE "id" LIKE '%@%';

SELECT 'PASO 3: Replace the PK value with the new UUID only for old IDs';
UPDATE "Contact"
SET "id" = "_newId"
WHERE "id" LIKE '%@%' AND "_newId" IS NOT NULL;

SELECT 'PASO 4: Drop staging column';
ALTER TABLE "Contact"
  DROP COLUMN IF EXISTS "_newId";

SELECT 'PASO 5: Add composite unique constraint';
CREATE UNIQUE INDEX IF NOT EXISTS "Contact_tenantId_phoneNormalized_key"
  ON "Contact"("tenantId", "phoneNormalized");

SELECT 'PASO 6: Commit';
COMMIT;
