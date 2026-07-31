#!/usr/bin/env node
/**
 * verify-database.js
 *
 * PURPOSE:
 *   Post-migration health check. Verifies the database is fully clean after
 *   repair-database.js + prisma migrate deploy have been executed.
 *
 * Checks:
 *   1. No old-style WAHA ids remain in Contact.
 *   2. Every Contact has a valid UUID id.
 *   3. Every Contact has non-null externalId, phoneNormalized and phone.
 *   4. No orphaned FK references (child rows pointing to non-existent Contact).
 *   5. The UNIQUE index on (tenantId, phoneNormalized) is satisfied.
 *
 * USAGE:
 *   node scripts/verify-database.js
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const dotenv = require('dotenv');
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERROR: DATABASE_URL environment variable is not set.');
  process.exit(1);
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

let passed = 0;
let failed = 0;

function ok(msg) {
  console.log(`  ✓ PASS: ${msg}`);
  passed++;
}

function fail(msg, detail = '') {
  console.error(`  ✗ FAIL: ${msg}${detail ? '\n         ' + detail : ''}`);
  failed++;
}

async function run() {
  console.log('');
  console.log('======================================================');
  console.log('  DATABASE VERIFICATION');
  console.log('======================================================');
  console.log('');

  // ── Check 1: No old WAHA ids remain ────────────────────────────────────────
  console.log('[1] Checking for old WAHA-style ids in Contact...');
  const oldIds = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS cnt FROM "Contact" WHERE "id" LIKE '%@%'`
  );
  const oldIdCount = Number(oldIds[0].cnt);
  if (oldIdCount === 0) {
    ok(`No old WAHA ids found.`);
  } else {
    fail(`${oldIdCount} Contact row(s) still have a WAHA-style id.`,
         'Run: node scripts/repair-database.js');
  }

  // ── Check 2: All Contact ids are UUIDs ─────────────────────────────────────
  console.log('[2] Checking all Contact ids are UUID format...');
  const nonUuid = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS cnt FROM "Contact"
     WHERE "id" !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'`
  );
  const nonUuidCount = Number(nonUuid[0].cnt);
  if (nonUuidCount === 0) {
    ok('All Contact ids are valid UUIDs.');
  } else {
    fail(`${nonUuidCount} Contact row(s) have a non-UUID id.`);
  }

  // ── Check 3: Required fields populated ────────────────────────────────────
  console.log('[3] Checking externalId, phoneNormalized, phone are populated...');
  const missingFields = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS cnt FROM "Contact"
     WHERE "externalId" IS NULL OR "phoneNormalized" IS NULL OR "phone" IS NULL`
  );
  const missingCount = Number(missingFields[0].cnt);
  if (missingCount === 0) {
    ok('All Contact rows have externalId, phoneNormalized and phone.');
  } else {
    fail(`${missingCount} Contact row(s) are missing required fields.`);
  }

  // ── Check 4: No orphaned FK references ────────────────────────────────────
  console.log('[4] Checking for orphaned FK references...');
  const fkTables = await prisma.$queryRawUnsafe(`
    SELECT
      kcu.table_name  AS child_table,
      kcu.column_name AS child_column
    FROM
      information_schema.table_constraints      AS tc
      JOIN information_schema.key_column_usage  AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema   = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema   = tc.table_schema
    WHERE
      tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name   = 'Contact'
      AND ccu.column_name  = 'id'
    ORDER BY kcu.table_name;
  `);

  for (const { child_table, child_column } of fkTables) {
    const orphans = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS cnt
       FROM "${child_table}" child
       LEFT JOIN "Contact" c ON c."id" = child."${child_column}"
       WHERE c."id" IS NULL`
    );
    const orphanCount = Number(orphans[0].cnt);
    if (orphanCount === 0) {
      ok(`${child_table}: no orphaned references.`);
    } else {
      fail(`${child_table}: ${orphanCount} orphaned row(s).`);
    }
  }

  // ── Check 5: Unique constraint satisfied ─────────────────────────────────
  console.log('[5] Checking uniqueness of (tenantId, phoneNormalized)...');
  const dupes = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS cnt FROM (
       SELECT "tenantId", "phoneNormalized"
       FROM "Contact"
       WHERE "phoneNormalized" IS NOT NULL
       GROUP BY "tenantId", "phoneNormalized"
       HAVING COUNT(*) > 1
     ) sub`
  );
  const dupeCount = Number(dupes[0].cnt);
  if (dupeCount === 0) {
    ok('No duplicate (tenantId, phoneNormalized) pairs.');
  } else {
    fail(`${dupeCount} duplicate (tenantId, phoneNormalized) pair(s) detected.`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('');
  console.log('======================================================');
  console.log('  VERIFICATION REPORT');
  console.log('======================================================');
  console.log(`  Checks passed: ${passed}`);
  console.log(`  Checks failed: ${failed}`);
  console.log('------------------------------------------------------');
  if (failed === 0) {
    console.log('  Status: Database is HEALTHY ✓');
    console.log('  Safe to run: npx prisma migrate deploy');
  } else {
    console.log('  Status: Database needs attention ✗');
    process.exitCode = 1;
  }
  console.log('======================================================');
  console.log('');
}

run().finally(() => prisma.$disconnect());
