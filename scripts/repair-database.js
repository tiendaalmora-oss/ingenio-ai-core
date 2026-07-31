#!/usr/bin/env node
/**
 * repair-database.js
 *
 * PURPOSE:
 *   The migration 20260724000000_refactor_contact_uuid_multitenant left the
 *   database in a partially-applied state. Some Contact rows were already
 *   converted to UUID format by the running application, leaving "ghost" rows
 *   with the old WAHA id (e.g. "254635793186937@lid") alongside their UUID twins.
 *
 * STRATEGY (per old Contact row):
 *   1. Discover FK tables from pg catalog dynamically (no hard-coded list).
 *   2. Find the UUID twin via externalId = old.id.
 *   3. If both old and UUID have a BusinessMemory row → MERGE before redirecting.
 *      Merge rules:
 *        - Scalar fields  : keep UUID value if non-null, else copy OLD value.
 *                           If BOTH are non-null and different → MANUAL_REVIEW.
 *        - Array fields   : union without duplicates.
 *        - JSON fields    : deep merge (UUID wins on conflicts).
 *        - Timestamps     : updatedAt = max(old, uuid).
 *      After merge: move MemoryAuditLog rows, delete OLD BusinessMemory row.
 *   4. Redirect remaining FK references old.id → twin.id for all other tables.
 *   5. Verify zero references remain, then delete old Contact row.
 *   6. Full idempotency: safe to run twice — no duplicate arrays, no double audit logs.
 *
 * USAGE:
 *   node scripts/repair-database.js --dry-run   # preview, zero writes
 *   node scripts/repair-database.js             # live repair
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const dotenv = require('dotenv');
dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');

// ── Prisma client (identical initialisation to PrismaService in production) ───
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERROR: DATABASE_URL is not set.');
  process.exit(1);
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── Scalar fields that can be merged automatically ────────────────────────────
// Arrays and timestamps are handled separately.
const BM_SCALAR_FIELDS = ['name', 'company', 'leadStatus'];
const BM_ARRAY_FIELDS  = ['interests', 'objections', 'tags'];
// MemoryAuditLog references BusinessMemory via contactId (not BM.id).

// ── Report counters ───────────────────────────────────────────────────────────
const report = {
  oldContactsFound:   0,
  uuidMatchesFound:   0,
  fkTablesUpdated:    {},      // table → row count
  // BusinessMemory merge
  bmMerged:           0,
  bmFieldsCopied:     0,
  bmArraysMerged:     0,
  bmAuditLogsMoved:   0,
  bmOldDeleted:       0,
  bmManualReview:     [],      // [{ oldId, uuidId, field, oldVal, uuidVal }]
  // Contact cleanup
  contactsDeleted:    0,
  contactsSkipped:    0,
  errors:             0,
};

// ═════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════════════════════

/** Deep-merge two plain objects. uuidVal wins on scalar conflicts. */
function deepMergeJson(oldObj, uuidObj) {
  if (oldObj === null || typeof oldObj !== 'object') return uuidObj ?? oldObj;
  if (uuidObj === null || typeof uuidObj !== 'object') return uuidObj ?? oldObj;
  const result = { ...uuidObj };
  for (const key of Object.keys(oldObj)) {
    if (!(key in result) || result[key] === null) {
      result[key] = oldObj[key];
    } else if (typeof result[key] === 'object' && typeof oldObj[key] === 'object') {
      result[key] = deepMergeJson(oldObj[key], result[key]);
    }
    // uuid wins for scalar conflicts inside JSON blobs
  }
  return result;
}

/** Union two arrays, remove duplicate primitives. */
function unionArrays(a, b) {
  const combined = [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])];
  return [...new Set(combined.map(v => JSON.stringify(v)))].map(v => JSON.parse(v));
}

/** Count references in a child table. */
async function countRefs(client, table, column, contactId) {
  const rows = await client.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS cnt FROM "${table}" WHERE "${column}" = $1`,
    contactId
  );
  return Number(rows[0].cnt);
}

/** Redirect FK from oldId → newId; returns row count affected. */
async function redirectFk(client, table, column, oldId, newId) {
  if (DRY_RUN) {
    const cnt = await countRefs(client, table, column, oldId);
    report.fkTablesUpdated[table] = (report.fkTablesUpdated[table] || 0) + cnt;
    return cnt;
  }
  const affected = await client.$executeRawUnsafe(
    `UPDATE "${table}" SET "${column}" = $1 WHERE "${column}" = $2`,
    newId, oldId
  );
  report.fkTablesUpdated[table] = (report.fkTablesUpdated[table] || 0) + affected;
  return affected;
}

// ═════════════════════════════════════════════════════════════════════════════
// BUSINESSMEMORY MERGE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Merge the OLD BusinessMemory into the UUID BusinessMemory.
 * Returns true  → merge completed (or no conflict existed).
 * Returns false → MANUAL_REVIEW_REQUIRED (scalar conflict found).
 *
 * This function is idempotent: if old BM row is already gone, it returns true.
 */
async function mergeBusinessMemory(tx, oldContactId, uuidContactId) {
  // Fetch both rows
  const [oldRows, uuidRows] = await Promise.all([
    tx.$queryRawUnsafe(`SELECT * FROM "BusinessMemory" WHERE "contactId" = $1`, oldContactId),
    tx.$queryRawUnsafe(`SELECT * FROM "BusinessMemory" WHERE "contactId" = $1`, uuidContactId),
  ]);

  const oldBm  = oldRows[0]  ?? null;
  const uuidBm = uuidRows[0] ?? null;

  // ── Case: old BM does not exist (already cleaned up or never created) ──────
  if (!oldBm) {
    console.log(`  [BM] No old BusinessMemory found — nothing to merge.`);
    return true;
  }

  // ── Case: UUID BM does not exist — simply redirect contactId ──────────────
  if (!uuidBm) {
    console.log(`  [BM] UUID has no BusinessMemory. Redirecting old row to UUID.`);
    if (!DRY_RUN) {
      // Move MemoryAuditLog first (references BM.contactId)
      const auditMoved = await tx.$executeRawUnsafe(
        `UPDATE "MemoryAuditLog" SET "contactId" = $1 WHERE "contactId" = $2`,
        uuidContactId, oldContactId
      );
      report.bmAuditLogsMoved += auditMoved;
      // Redirect BM row itself
      await tx.$executeRawUnsafe(
        `UPDATE "BusinessMemory" SET "contactId" = $1 WHERE "contactId" = $2`,
        uuidContactId, oldContactId
      );
    } else {
      const auditCount = await countRefs(tx, 'MemoryAuditLog', 'contactId', oldContactId);
      report.bmAuditLogsMoved += auditCount;
      console.log(`  [dry-run] Would redirect 1 BusinessMemory + ${auditCount} MemoryAuditLog rows.`);
    }
    report.bmMerged++;
    return true;
  }

  // ── Case: BOTH exist → field-by-field merge ───────────────────────────────
  console.log(`  [BM] Both sides have BusinessMemory — merging...`);

  const updates    = {};   // fields to UPDATE on uuid row
  let   needsManual = false;

  // 1. Scalar fields
  for (const field of BM_SCALAR_FIELDS) {
    const oldVal  = oldBm[field]  ?? null;
    const uuidVal = uuidBm[field] ?? null;

    if (uuidVal !== null && oldVal !== null && uuidVal !== oldVal) {
      // Both non-null and different → cannot auto-resolve
      console.warn(`  [BM] ⚠ MANUAL_REVIEW: field "${field}" — OLD="${oldVal}" UUID="${uuidVal}"`);
      report.bmManualReview.push({
        oldId: oldContactId, uuidId: uuidContactId,
        field, oldVal, uuidVal,
      });
      needsManual = true;
    } else if (uuidVal === null && oldVal !== null) {
      updates[field] = oldVal;
      report.bmFieldsCopied++;
      console.log(`  [BM] Copy "${field}": null → "${oldVal}"`);
    }
    // else uuid already has a value (or both null) → keep uuid, nothing to do
  }

  if (needsManual) {
    console.warn(`  [BM] Skipping merge for this contact — manual review required.`);
    return false;
  }

  // 2. Array fields — union
  for (const field of BM_ARRAY_FIELDS) {
    const oldArr  = Array.isArray(oldBm[field])  ? oldBm[field]  : [];
    const uuidArr = Array.isArray(uuidBm[field]) ? uuidBm[field] : [];
    const merged  = unionArrays(oldArr, uuidArr);
    // Only update if the arrays actually changed
    if (JSON.stringify(merged) !== JSON.stringify(uuidArr)) {
      updates[field] = merged;
      report.bmArraysMerged++;
      console.log(`  [BM] Merge "${field}": ${JSON.stringify(uuidArr)} + ${JSON.stringify(oldArr)} → ${JSON.stringify(merged)}`);
    }
  }

  // 3. lastInteraction — keep most recent
  const oldLI  = oldBm.lastInteraction  ? new Date(oldBm.lastInteraction)  : null;
  const uuidLI = uuidBm.lastInteraction ? new Date(uuidBm.lastInteraction) : null;
  if (oldLI && (!uuidLI || oldLI > uuidLI)) {
    updates.lastInteraction = oldLI;
    report.bmFieldsCopied++;
    console.log(`  [BM] Copy lastInteraction: null → ${oldLI.toISOString()}`);
  }

  // 4. Apply updates to UUID row
  if (!DRY_RUN) {
    if (Object.keys(updates).length > 0) {
      // Build SET clause dynamically
      const setClauses = [];
      const values     = [];
      let   idx        = 1;
      for (const [col, val] of Object.entries(updates)) {
        if (Array.isArray(val)) {
          // Postgres array literal
          setClauses.push(`"${col}" = $${idx}::text[]`);
          values.push(val);
        } else if (val instanceof Date) {
          setClauses.push(`"${col}" = $${idx}::timestamptz`);
          values.push(val.toISOString());
        } else {
          setClauses.push(`"${col}" = $${idx}`);
          values.push(val);
        }
        idx++;
      }
      values.push(uuidContactId);
      await tx.$executeRawUnsafe(
        `UPDATE "BusinessMemory" SET ${setClauses.join(', ')} WHERE "contactId" = $${idx}`,
        ...values
      );
    }

    // 5. Move MemoryAuditLog rows from old → uuid
    const auditMoved = await tx.$executeRawUnsafe(
      `UPDATE "MemoryAuditLog" SET "contactId" = $1 WHERE "contactId" = $2`,
      uuidContactId, oldContactId
    );
    report.bmAuditLogsMoved += auditMoved;
    if (auditMoved > 0) {
      console.log(`  [BM] Moved ${auditMoved} MemoryAuditLog row(s) to UUID.`);
    }

    // 6. Delete old BM row (now safe: audit logs redirected, uuid row updated)
    await tx.$executeRawUnsafe(
      `DELETE FROM "BusinessMemory" WHERE "contactId" = $1`,
      oldContactId
    );
    report.bmOldDeleted++;
    console.log(`  [BM] Old BusinessMemory deleted.`);
  } else {
    const auditCount = await countRefs(tx, 'MemoryAuditLog', 'contactId', oldContactId);
    report.bmAuditLogsMoved += auditCount;
    console.log(`  [dry-run] Would update UUID BusinessMemory with: ${JSON.stringify(updates)}`);
    console.log(`  [dry-run] Would move ${auditCount} MemoryAuditLog + delete old BM row.`);
    report.bmOldDeleted++;
  }

  report.bmMerged++;
  return true;
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════

async function run() {
  console.log('');
  console.log('======================================================');
  console.log(`  DATABASE REPAIR SCRIPT ${DRY_RUN ? '[DRY-RUN MODE]' : '[LIVE MODE]'}`);
  console.log('======================================================');
  console.log('');

  // 1. Old contacts
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

  // 2. Discover FK tables from catalog (once, outside tx)
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
        // Find UUID twin
        const twins = await tx.$queryRawUnsafe(
          `SELECT "id" FROM "Contact" WHERE "externalId" = $1 AND "id" NOT LIKE '%@%'`,
          old.id
        );

        if (twins.length === 0) {
          console.log(`  ⚠ No UUID twin found — skipping (migration will handle this row).`);
          report.contactsSkipped++;
          return;
        }

        const twin = twins[0];
        report.uuidMatchesFound++;
        console.log(`  ✓ UUID twin: ${twin.id}`);

        // ── BusinessMemory merge (BEFORE generic FK redirect) ─────────────
        const bmOk = await mergeBusinessMemory(tx, old.id, twin.id);
        if (!bmOk) {
          console.warn(`  ⚠ Skipping this contact due to MANUAL_REVIEW_REQUIRED on BusinessMemory.`);
          report.contactsSkipped++;
          return;
        }

        // ── Generic FK redirect for all other tables ───────────────────────
        for (const { child_table, child_column } of fkTables) {
          // BusinessMemory is already handled above — skip to avoid 23505
          if (child_table === 'BusinessMemory') continue;
          const moved = await redirectFk(tx, child_table, child_column, old.id, twin.id);
          if (moved > 0) {
            console.log(`  → ${child_table}.${child_column}: moved ${moved} row(s)`);
          }
        }

        // ── Verify zero references remain ─────────────────────────────────
        let remaining = 0;
        const remainingByTable = {};
        for (const { child_table, child_column } of fkTables) {
          const cnt = await countRefs(tx, child_table, child_column, old.id);
          remaining += cnt;
          if (cnt > 0) remainingByTable[`${child_table}.${child_column}`] = cnt;
        }

        if (remaining > 0) {
          console.warn(`  ⚠ ${remaining} reference(s) still remain — NOT deleting old contact.`);
          console.warn(`  Remaining references:`);
          for (const [tableCol, cnt] of Object.entries(remainingByTable)) {
            console.warn(`    ${tableCol.padEnd(36)} ${cnt}`);
          }
          report.contactsSkipped++;
          return;
        }

        // ── Delete old Contact ─────────────────────────────────────────────
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

// ═════════════════════════════════════════════════════════════════════════════
// REPORT
// ═════════════════════════════════════════════════════════════════════════════

function printReport() {
  const fkLines = Object.entries(report.fkTablesUpdated)
    .map(([t, n]) => `  ${t.padEnd(32)} ${n}`)
    .join('\n') || '  (none)';

  const manualLines = report.bmManualReview.length === 0
    ? '  (none)'
    : report.bmManualReview.map(r =>
        `  Contact ${r.oldId}\n    field="${r.field}"  OLD="${r.oldVal}"  UUID="${r.uuidVal}"`
      ).join('\n');

  console.log('');
  console.log('======================================================');
  console.log(`  DATABASE REPAIR REPORT ${DRY_RUN ? '[DRY-RUN]' : ''}`);
  console.log('======================================================');
  console.log(`  Old Contacts Found            ${report.oldContactsFound}`);
  console.log(`  UUID Matches Found            ${report.uuidMatchesFound}`);
  console.log('');
  console.log('  BusinessMemory Merge:');
  console.log(`    Merged records              ${report.bmMerged}`);
  console.log(`    Copied scalar fields        ${report.bmFieldsCopied}`);
  console.log(`    Merged array fields         ${report.bmArraysMerged}`);
  console.log(`    Audit logs moved            ${report.bmAuditLogsMoved}`);
  console.log(`    Old BM rows deleted         ${report.bmOldDeleted}`);
  console.log(`    Manual review required      ${report.bmManualReview.length}`);
  if (report.bmManualReview.length > 0) {
    console.log('');
    console.log('  MANUAL_REVIEW_REQUIRED contacts:');
    console.log(manualLines);
  }
  console.log('');
  console.log('  FK Rows Redirected per Table:');
  console.log(fkLines);
  console.log('');
  console.log(`  Contacts Deleted              ${report.contactsDeleted}`);
  console.log(`  Contacts Skipped              ${report.contactsSkipped}`);
  console.log(`  Errors                        ${report.errors}`);
  console.log('------------------------------------------------------');

  const needsAttention = report.errors > 0 || report.bmManualReview.length > 0;
  if (!needsAttention) {
    console.log('  Status: Completed Successfully ✓');
  } else if (report.bmManualReview.length > 0) {
    console.log('  Status: Completed with MANUAL_REVIEW items ⚠');
    console.log('          Resolve conflicts above, then re-run.');
  } else {
    console.log('  Status: Completed with ERRORS — review output above.');
  }
  console.log('======================================================');
  console.log('');
}

run().finally(() => prisma.$disconnect());
