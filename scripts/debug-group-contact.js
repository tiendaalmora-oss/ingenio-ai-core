#!/usr/bin/env node
/**
 * debug-group-contact.js
 *
 * PURPOSE:
 *   Diagnose the @g.us contact that repair-database.js skipped (no UUID twin)
 *   and verify-database.js flags as a blocking old-id row.
 *
 *   Produces a full forensic report WITHOUT modifying any data.
 *
 * USAGE:
 *   node scripts/debug-group-contact.js [contactId]
 *   node scripts/debug-group-contact.js 120363424203726380@g.us
 *
 *   If no argument is given, reports all old-style (@) contacts that have
 *   no UUID twin in the database.
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const dotenv = require('dotenv');
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERROR: DATABASE_URL is not set.');
  process.exit(1);
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Classify WAHA id suffix
function classifyWahaId(id) {
  if (id.endsWith('@c.us'))              return { type: 'individual',        safe: true  };
  if (id.endsWith('@lid'))               return { type: 'individual (lid)',  safe: true  };
  if (id.endsWith('@g.us'))             return { type: 'GROUP',              safe: false };
  if (id.endsWith('@s.whatsapp.net'))   return { type: 'system/broadcast',   safe: false };
  if (id === 'status@broadcast')         return { type: 'broadcast channel', safe: false };
  return                                        { type: 'unknown suffix',     safe: false };
}

async function diagnoseContact(contactId) {
  console.log('');
  console.log('══════════════════════════════════════════════════════');
  console.log(`  CONTACT DIAGNOSTIC`);
  console.log(`  ${contactId}`);
  console.log('══════════════════════════════════════════════════════');

  // ── 1. Contact row itself ─────────────────────────────────────────────────
  const contacts = await prisma.$queryRawUnsafe(
    `SELECT * FROM "Contact" WHERE "id" = $1`, contactId
  );

  if (contacts.length === 0) {
    console.log('\n  ✓ Contact does NOT exist in database. Nothing to do.');
    return;
  }

  const c = contacts[0];
  console.log('\n[1] Contact row:');
  for (const [k, v] of Object.entries(c)) {
    const display = v === null ? '<null>' : v instanceof Date ? v.toISOString() : String(v);
    console.log(`    ${k.padEnd(20)} ${display}`);
  }

  // ── 2. WAHA id classification ─────────────────────────────────────────────
  const { type, safe } = classifyWahaId(contactId);
  console.log(`\n[2] WAHA id type    : ${type}`);
  console.log(`    Safe to migrate  : ${safe ? 'YES (individual number)' : 'NO  — group/broadcast/system ids should not become Contacts'}`);

  // ── 3. UUID twin lookup ───────────────────────────────────────────────────
  console.log('\n[3] UUID twin lookup (via externalId):');
  const twins = await prisma.$queryRawUnsafe(
    `SELECT "id", "externalId", "phone", "phoneNormalized", "tenantId"
     FROM "Contact"
     WHERE "externalId" = $1 AND "id" !~ '@'`,
    contactId
  );
  if (twins.length > 0) {
    console.log('    ✓ UUID twin FOUND:');
    for (const t of twins) console.table([t]);
  } else {
    console.log('    ✗ No UUID twin found.');
  }

  // ── 4. Dynamic FK reference scan ─────────────────────────────────────────
  console.log('\n[4] FK references from catalog:');
  const fkTables = await prisma.$queryRawUnsafe(`
    SELECT kcu.table_name AS child_table, kcu.column_name AS child_column
    FROM information_schema.table_constraints      AS tc
    JOIN information_schema.key_column_usage       AS kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema    = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema    = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name     = 'Contact'
      AND ccu.column_name    = 'id'
    ORDER BY kcu.table_name;
  `);

  let totalRefs = 0;
  const refDetail = [];
  for (const { child_table, child_column } of fkTables) {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS cnt FROM "${child_table}" WHERE "${child_column}" = $1`,
      contactId
    );
    const cnt = Number(rows[0].cnt);
    totalRefs += cnt;
    refDetail.push({ table: child_table, column: child_column, rows: cnt });
  }

  console.table(refDetail);
  console.log(`    Total references : ${totalRefs}`);

  // ── 5. Sample child data (first 3 rows per table with refs) ───────────────
  for (const { table, column, rows } of refDetail) {
    if (rows === 0) continue;
    
    if (!table) {
      console.log(`\n[5] No sample rows available (table is undefined).`);
      continue;
    }

    console.log(`\n[5] Sample rows from "${table}" (up to 3):`);
    const sample = await prisma.$queryRawUnsafe(
      `SELECT * FROM "${table}" WHERE "${column}" = $1 LIMIT 3`,
      contactId
    );
    console.table(sample);
  }

  // ── 6. Recommendation ─────────────────────────────────────────────────────
  console.log('\n[6] RECOMMENDATION:');

  if (type === 'GROUP') {
    console.log(`
  This contact represents a WhatsApp GROUP (suffix @g.us).
  Groups are NOT individual users and should not be stored as business Contacts.
  
  The application created this row when a group message was received, which is
  a known edge case in WAHA webhook handlers.

  OPTIONS (choose one):
  
  A) DELETE (recommended if totalRefs === 0 or all refs are low-value):
     Safe if Conversation rows contain no meaningful business data.
     The repair script can be extended to delete @g.us / @broadcast contacts
     that have no UUID twin, after optionally archiving their conversations.

  B) ARCHIVE then DELETE:
     Export Conversation + Interaction rows to a log file, then delete the Contact.
     Preserves data traceability without blocking the migration.

  C) CREATE a UUID Contact and redirect (not recommended for groups):
     Would require inventing a phone number, which has no business meaning for a group.

  CURRENT BLOCKING IMPACT:
  - The migration 20260724000000_refactor_contact_uuid_multitenant cannot run
    because this row still has the old-style id AND has no UUID twin.
  - The migration UPDATE will try to set phoneNormalized = "120363424203726380"
    which will work only if there is no existing index conflict.
  - Then it will try to set id = <new_uuid> which will trigger ON UPDATE CASCADE
    on ${totalRefs} child row(s).
  
  VERDICT: This contact CAN be migrated automatically by the Prisma migration
  if it has no phoneNormalized conflict (likely safe). The repair script correctly
  skipped it because there is no UUID twin — the migration itself will handle it.
  
  To confirm, run: npx prisma migrate deploy
  If it still fails, extend repair-database.js to handle this case before migrate.
`);
  } else if (!safe) {
    console.log(`
  This contact has a system/broadcast id (${type}).
  It should be treated like the group case above.
  Recommendation: ARCHIVE + DELETE if no critical data in child rows.
`);
  } else if (twins.length > 0) {
    console.log(`
  UUID twin EXISTS — the repair script should have handled this.
  Re-run: node scripts/repair-database.js
`);
  } else {
    console.log(`
  Individual contact with no UUID twin.
  The Prisma migration will create the UUID automatically via the UPDATE+CASCADE flow.
  If the migration fails for this row, extend repair-database.js to create a UUID
  twin manually before running prisma migrate deploy.
`);
  }

  console.log('══════════════════════════════════════════════════════\n');
}

async function main() {
  const arg = process.argv[2];

  if (arg) {
    await diagnoseContact(arg);
  } else {
    // Auto-mode: find all old-style contacts with no UUID twin
    console.log('No contactId argument provided. Scanning for orphaned old-style contacts...\n');
    const orphans = await prisma.$queryRawUnsafe(`
      SELECT old."id"
      FROM "Contact" old
      WHERE old."id" LIKE '%@%'
        AND NOT EXISTS (
          SELECT 1 FROM "Contact" twin
          WHERE twin."externalId" = old."id"
            AND twin."id" !~ '@'
        )
      ORDER BY old."id";
    `);

    if (orphans.length === 0) {
      console.log('✓ No orphaned old-style contacts found. Database is clean.');
    } else {
      console.log(`Found ${orphans.length} old-style contact(s) with no UUID twin:\n`);
      for (const { id } of orphans) {
        await diagnoseContact(id);
      }
    }
  }
}

main().finally(() => prisma.$disconnect());
