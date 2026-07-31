-- ============================================================
-- Migration: refactor_contact_uuid_multitenant
-- Purpose  : Normalize Contact model for true multi-tenant isolation.
--            The same WhatsApp phone number can now exist across different
--            tenants as independent Contact rows, each with its own UUID PK.
--
-- SAFETY STRATEGY (ON UPDATE CASCADE assumed):
--   We add the new UUID id column, back-fill data,
--   update the PK directly, relying on ON UPDATE CASCADE to update all FK columns,
--   then apply the new constraints — all inside a single transaction.
-- ============================================================

BEGIN;

SELECT 'PASO 1: Add new fields to Contact';
-- 1. Add new fields to Contact
ALTER TABLE "Contact"
  ADD COLUMN IF NOT EXISTS "externalId"      TEXT,
  ADD COLUMN IF NOT EXISTS "phoneNormalized" TEXT,
  ADD COLUMN IF NOT EXISTS "_newId"          TEXT;         -- temporary staging column

SELECT 'PASO 2: Back-fill externalId';
-- 2. Back-fill externalId from the old id (which held the WAHA phone string)
UPDATE "Contact"
SET
  "externalId"      = COALESCE("externalId", "id"),
  "phone"           = COALESCE("phone", regexp_replace("id", '@(c\.us|lid|s\.whatsapp\.net)$', '')),
  "phoneNormalized" = COALESCE("phoneNormalized", regexp_replace("id", '@(c\.us|lid|s\.whatsapp\.net)$', '')),
  "_newId"          = gen_random_uuid()::text
WHERE "id" LIKE '%@%' AND "_newId" IS NULL;

-- 3. (Skipped) ON UPDATE CASCADE will automatically propagate changes when we update the PK


SELECT 'PASO 3: Replace the PK value with the new UUID';
-- 4. Replace the PK value with the new UUID
UPDATE "Contact"
SET "id" = "_newId"
WHERE "_newId" IS NOT NULL;

SELECT 'PASO 4: Drop staging column';
-- 5. Drop staging column
ALTER TABLE "Contact"
  DROP COLUMN "_newId";

SELECT 'PASO 5: Add composite unique constraint';
-- 6. Add the composite unique constraint @@unique([tenantId, phoneNormalized])
CREATE UNIQUE INDEX IF NOT EXISTS "Contact_tenantId_phoneNormalized_key"
  ON "Contact"("tenantId", "phoneNormalized");

-- 7. Mark schema as baseline so prisma migrate doesn't try to re-run it
--    (The _prisma_migrations table will be created on first proper migrate deploy)

SELECT 'PASO 6: Commit';
COMMIT;

