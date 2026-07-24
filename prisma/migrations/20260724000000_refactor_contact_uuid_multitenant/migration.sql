-- ============================================================
-- Migration: refactor_contact_uuid_multitenant
-- Purpose  : Normalize Contact model for true multi-tenant isolation.
--            The same WhatsApp phone number can now exist across different
--            tenants as independent Contact rows, each with its own UUID PK.
--
-- SAFETY STRATEGY (no ON UPDATE CASCADE assumed):
--   We rename the existing PK column, add the new UUID id column,
--   back-fill data, update all FK columns manually in other tables,
--   then apply the new constraints — all inside a single transaction.
-- ============================================================

BEGIN;

-- 1. Add new fields to Contact
ALTER TABLE "Contact"
  ADD COLUMN IF NOT EXISTS "externalId"      TEXT,
  ADD COLUMN IF NOT EXISTS "phoneNormalized" TEXT,
  ADD COLUMN IF NOT EXISTS "_newId"          TEXT;         -- temporary staging column

-- 2. Back-fill externalId from the old id (which held the WAHA phone string)
UPDATE "Contact"
SET
  "externalId"      = "id",
  "phone"           = regexp_replace("id", '@(c\.us|lid|s\.whatsapp\.net)$', ''),
  "phoneNormalized" = regexp_replace("id", '@(c\.us|lid|s\.whatsapp\.net)$', ''),
  "_newId"          = gen_random_uuid()::text
WHERE "externalId" IS NULL;

-- 3. Update FK columns in every child table BEFORE touching the PK
--    (No CASCADE → must be done manually and explicitly)

UPDATE "Conversation" conv
SET "contactId" = c."_newId"
FROM "Contact" c
WHERE conv."contactId" = c."id";

UPDATE "BusinessMemory" bm
SET "contactId" = c."_newId"
FROM "Contact" c
WHERE bm."contactId" = c."id";

UPDATE "MemoryAuditLog" mal
SET "contactId" = c."_newId"
FROM "Contact" c
WHERE mal."contactId" = c."id";

UPDATE "Task" t
SET "contactId" = c."_newId"
FROM "Contact" c
WHERE t."contactId" = c."id";

-- 4. Replace the PK value with the new UUID
UPDATE "Contact"
SET "id" = "_newId";

-- 5. Drop staging column
ALTER TABLE "Contact"
  DROP COLUMN "_newId";

-- 6. Add the composite unique constraint @@unique([tenantId, phoneNormalized])
CREATE UNIQUE INDEX IF NOT EXISTS "Contact_tenantId_phoneNormalized_key"
  ON "Contact"("tenantId", "phoneNormalized");

-- 7. Mark schema as baseline so prisma migrate doesn't try to re-run it
--    (The _prisma_migrations table will be created on first proper migrate deploy)

COMMIT;
