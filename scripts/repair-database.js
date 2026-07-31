#!/usr/bin/env node
/**
 * repair-database.js
 *
 * PURPOSE:
 *   The migration 20260724000000_refactor_contact_uuid_multitenant left the
 *   database in a partially-applied state. Some Contact rows were already
 *   converted to UUID format by the running application (before the migration
 *   could be re-applied cleanly), leaving "ghost" rows with the old WAHA id
 *   (e.g. "254635793186937@lid") alongside their new UUID twins.
 *
 *   When Prisma tries to run the migration it collides on the UNIQUE index
 *   (tenantId, phoneNormalized) — error 23505.
 *
 * STRATEGY:
 *   1. Discover ALL foreign-key tables that reference Contact(id) dynamically
 *      from the PostgreSQL catalog — no hard-coded table list.
 *   2. For every "old" Contact (id contains "@"), look for its UUID twin via
 *      externalId = old.id.
 *   3. Redirect every FK in every child table from old.id → twin.id.
 *   4. Delete the old Contact row only when zero references remain.
 *   5. Print a full report.
 *
 * USAGE:
 *   node scripts/repair-database.js --dry-run   # preview, no changes
 *   node scripts/repair-database.js             # real repair
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const dotenv = require('dotenv');
dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');

// ── Prisma setup (identical to PrismaService in production) ─────────────────
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERROR: DATABASE_URL environment variable is not set.');
  process.exit(1);
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── Report counters ──────────────────────────────────────────────────────────
const report = {
  oldContactsFound: 0,
  uuidMatchesFound: 0,
  fkTablesUpdated: {},
  contactsDeleted: 0,
  contactsSkipped: 0,
  errors: 0,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Discover all tables and columns that have a FK → Contact(id) */
async function discoverFkTables(tx) {
  const rows = await tx.$queryRawUnsafe(`
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
  return rows; // [{ child_table, child_column }]
}

/** Count remaining rows in a child table pointing to a given contactId */
async function countRefs(tx, table, column, contactId) {
  const rows = await tx.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS cnt FROM "${table}" WHERE "${column}" = $1`,
    contactId
  );
  return Number(rows[0].cnt);
}

/** Redirect FK in child table from oldId → newId */
async function redirectFk(tx, table, column, oldId, newId) {
  if (DRY_RUN) {
    const cnt = await countRefs(tx, table, column, oldId);
    report.fkTablesUpdated[table] = (report.fkTablesUpdated[table] || 0) + cnt;
    return cnt;
  }
  const result = await tx.$executeRawUnsafe(
    `UPDATE "${table}" SET "${column}" = $1 WHERE "${column}" = $2`,
    newId,
    oldId
  );
  report.fkTablesUpdated[table] = (report.fkTablesUpdated[table] || 0) + result;
  return result;
}

// ── Core repair logic ────────────────────────────────────────────────────────
async function run() {
  console.log('');
  console.log('======================================================');
  console.log(`  DATABASE REPAIR SCRIPT ${DRY_RUN ? '[DRY-RUN MODE]' : '[LIVE MODE]'}`);
  console.log('======================================================');
  console.log('');

  // We need a transaction per old-contact so the operation is atomic per row.
  // A single giant transaction over many rows risks a timeout on large datasets.

  // 1. Fetch all old contacts OUTSIDE a transaction (read-only)
  const oldContacts = await prisma.$queryRawUnsafe(`
    SELECT "id", "tenantId", "name", "phone"
    FROM "Contact"
    WHERE "id" LIKE '%@%'
    ORDER BY "id";
  `);

  report.oldContactsFound = oldContacts.length;
  console.log(`Old contacts found: ${oldContacts.length}`);

  if (oldContacts.length === 0) {
    console.log('Nothing to repair. Database is clean.');
    printReport();
    return;
  }

  // 2. Discover FK tables ONCE (read-only, outside transaction)
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

  console.log(`FK tables discovered: ${fkTables.map(r => r.child_table).join(', ')}`);
  console.log('');

  // 3. Process each old contact
  for (const old of oldContacts) {
    console.log(`Processing old contact: "${old.id}" (tenant: ${old.tenantId})`);

    try {
      await prisma.$transaction(async (tx) => {
        // Find UUID twin by externalId
        const twins = await tx.$queryRawUnsafe(
          `SELECT "id" FROM "Contact" WHERE "externalId" = $1 AND "id" NOT LIKE '%@%'`,
          old.id
        );

        if (twins.length === 0) {
          console.log(`  ⚠ No UUID twin found — skipping (migration will handle this row).`);
          report.contactsSkipped++;
          return; // commit empty transaction (no-op)
        }

        const twin = twins[0];
        report.uuidMatchesFound++;
        console.log(`  ✓ UUID twin: ${twin.id}`);

        // Redirect all FK references
        for (const { child_table, child_column } of fkTables) {
          const moved = await redirectFk(tx, child_table, child_column, old.id, twin.id);
          if (moved > 0) {
            console.log(`  → ${child_table}.${child_column}: moved ${moved} row(s)`);
          }
        }

        // Verify no references remain before deleting
        let remaining = 0;
        for (const { child_table, child_column } of fkTables) {
          remaining += await countRefs(tx, child_table, child_column, old.id);
        }

        if (remaining > 0) {
          console.warn(`  ⚠ ${remaining} reference(s) still point to old id — NOT deleting.`);
          report.contactsSkipped++;
          return;
        }

        if (!DRY_RUN) {
          await tx.$executeRawUnsafe(`DELETE FROM "Contact" WHERE "id" = $1`, old.id);
          console.log(`  ✓ Old contact deleted.`);
        } else {
          console.log(`  [dry-run] Would delete old contact.`);
        }
        report.contactsDeleted++;
      });
    } catch (err) {
      console.error(`  ✗ Error processing "${old.id}": ${err.message}`);
      report.errors++;
    }

    console.log('');
  }

  printReport();
}

function printReport() {
  const fkLines = Object.entries(report.fkTablesUpdated)
    .map(([t, n]) => `  ${t.padEnd(30)} ${n}`)
    .join('\n') || '  (none)';

  console.log('');
  console.log('======================================================');
  console.log(`  DATABASE REPAIR REPORT ${DRY_RUN ? '[DRY-RUN]' : ''}`);
  console.log('======================================================');
  console.log(`  Old Contacts Found       ${report.oldContactsFound}`);
  console.log(`  UUID Matches Found       ${report.uuidMatchesFound}`);
  console.log('');
  console.log('  FK Rows Redirected per Table:');
  console.log(fkLines);
  console.log('');
  console.log(`  Contacts Deleted         ${report.contactsDeleted}`);
  console.log(`  Contacts Skipped         ${report.contactsSkipped}`);
  console.log(`  Errors                   ${report.errors}`);
  console.log('------------------------------------------------------');
  if (report.errors === 0) {
    console.log('  Status: Completed Successfully ✓');
  } else {
    console.log('  Status: Completed with ERRORS — review output above.');
  }
  console.log('======================================================');
  console.log('');
}

run().finally(() => prisma.$disconnect());
