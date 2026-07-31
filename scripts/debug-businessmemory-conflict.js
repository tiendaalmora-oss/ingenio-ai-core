#!/usr/bin/env node
/**
 * debug-businessmemory-conflict.js
 *
 * PURPOSE:
 *   Diagnose the 23505 conflict on BusinessMemory_contactId_key.
 *
 *   For each "old" Contact (id contains "@") that has a UUID twin (matched via
 *   externalId), this script fetches the full BusinessMemory record for BOTH
 *   the old and the UUID contact, compares them field by field, and produces a
 *   detailed analysis report — WITHOUT modifying any data.
 *
 * USAGE:
 *   node scripts/debug-businessmemory-conflict.js
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

// Fields of BusinessMemory that are semantically meaningful (not FK/PK)
const MEMORY_FIELDS = [
  'id', 'contactId', 'name', 'company',
  'interests', 'lastInteraction', 'objections',
  'leadStatus', 'tags', 'updatedAt',
];

/** Fetch ALL columns from BusinessMemory for a given contactId */
async function fetchMemory(contactId) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT * FROM "BusinessMemory" WHERE "contactId" = $1`,
    contactId
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Fetch MemoryAuditLog count for a given contactId */
async function fetchAuditCount(contactId) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS cnt FROM "MemoryAuditLog" WHERE "contactId" = $1`,
    contactId
  );
  return Number(rows[0].cnt);
}

/** Pretty-print a memory record */
function printMemory(label, mem) {
  if (!mem) {
    console.log(`  ${label}: ── (NO RECORD) ──`);
    return;
  }
  console.log(`  ${label}:`);
  for (const key of Object.keys(mem)) {
    const val = mem[key];
    const display = val === null       ? '<null>'
                  : Array.isArray(val) ? JSON.stringify(val)
                  : val instanceof Date ? val.toISOString()
                  : String(val);
    console.log(`    ${key.padEnd(20)} ${display}`);
  }
}

/** Compare two memory records field by field */
function compareMemories(oldMem, uuidMem) {
  if (!oldMem || !uuidMem) return null;

  const allKeys = new Set([
    ...Object.keys(oldMem),
    ...Object.keys(uuidMem),
  ]);
  // Remove structural keys not meaningful for data comparison
  allKeys.delete('id');
  allKeys.delete('contactId');
  allKeys.delete('updatedAt');

  const differences = [];
  const identical = [];

  for (const key of allKeys) {
    const a = JSON.stringify(oldMem[key] ?? null);
    const b = JSON.stringify(uuidMem[key] ?? null);
    if (a === b) {
      identical.push(key);
    } else {
      differences.push({ field: key, oldValue: oldMem[key], uuidValue: uuidMem[key] });
    }
  }

  return { identical, differences };
}

/** Recommend which record to keep */
function recommend(oldMem, uuidMem, diff) {
  if (!oldMem) return 'KEEP_UUID (old has no BusinessMemory)';
  if (!uuidMem) return 'KEEP_OLD  (uuid has no BusinessMemory — redirect contactId)';
  if (diff.differences.length === 0) return 'SAFE_DELETE_OLD (records are identical — delete old)';

  // Check if any meaningful field in old has more data than uuid
  const oldRicher = diff.differences.some(({ field, oldValue, uuidValue }) => {
    const hasOld = oldValue !== null && !(Array.isArray(oldValue) && oldValue.length === 0);
    const hasUuid = uuidValue !== null && !(Array.isArray(uuidValue) && uuidValue.length === 0);
    return hasOld && !hasUuid;
  });

  const uuidRicher = diff.differences.some(({ field, oldValue, uuidValue }) => {
    const hasOld = oldValue !== null && !(Array.isArray(oldValue) && oldValue.length === 0);
    const hasUuid = uuidValue !== null && !(Array.isArray(uuidValue) && uuidValue.length === 0);
    return hasUuid && !hasOld;
  });

  if (oldRicher && uuidRicher) return 'MERGE_REQUIRED (both records have unique data)';
  if (oldRicher)  return 'KEEP_OLD_DATA (old record has richer data — merge into uuid row then delete old)';
  return 'KEEP_UUID (uuid record is equal or richer — delete old)';
}

async function main() {
  console.log('');
  console.log('======================================================');
  console.log('  BUSINESSMEMORY CONFLICT ANALYSIS');
  console.log('======================================================');
  console.log('');

  // 1. Find all old contacts that have a UUID twin
  const oldContacts = await prisma.$queryRawUnsafe(`
    SELECT old."id" AS old_id, old."tenantId", old."name",
           twin."id" AS uuid_id
    FROM "Contact" old
    JOIN "Contact" twin
      ON twin."externalId" = old."id"
     AND twin."id" !~ '%@%'
    WHERE old."id" LIKE '%@%'
    ORDER BY old."id";
  `);

  if (oldContacts.length === 0) {
    console.log('No old/UUID contact pairs found. Nothing to analyze.');
    await prisma.$disconnect();
    return;
  }

  let pairsAnalyzed = 0;

  for (const pair of oldContacts) {
    pairsAnalyzed++;
    console.log(`${'─'.repeat(54)}`);
    console.log(`Contact pair ${pairsAnalyzed}:`);
    console.log(`  OLD  : ${pair.old_id}  (tenant: ${pair.tenantId})`);
    console.log(`  UUID : ${pair.uuid_id}`);
    console.log('');

    const [oldMem, uuidMem] = await Promise.all([
      fetchMemory(pair.old_id),
      fetchMemory(pair.uuid_id),
    ]);

    const [oldAuditCnt, uuidAuditCnt] = await Promise.all([
      fetchAuditCount(pair.old_id),
      fetchAuditCount(pair.uuid_id),
    ]);

    // Print full records
    printMemory('BusinessMemory [OLD]', oldMem);
    console.log(`  MemoryAuditLog rows [OLD] : ${oldAuditCnt}`);
    console.log('');
    printMemory('BusinessMemory [UUID]', uuidMem);
    console.log(`  MemoryAuditLog rows [UUID]: ${uuidAuditCnt}`);
    console.log('');

    // Comparison
    const diff = compareMemories(oldMem, uuidMem);

    if (!diff) {
      console.log('  Comparison: N/A (one or both records missing)');
    } else if (diff.differences.length === 0) {
      console.log('  Comparison: ✓ IDENTICAL (all data fields match)');
    } else {
      console.log(`  Comparison: ✗ DIFFERENT (${diff.differences.length} field(s) differ)`);
      console.log('');
      console.log('  Differences:');
      for (const { field, oldValue, uuidValue } of diff.differences) {
        const oldStr  = JSON.stringify(oldValue  ?? null);
        const uuidStr = JSON.stringify(uuidValue ?? null);
        console.log(`    Field: ${field}`);
        console.log(`      OLD  = ${oldStr}`);
        console.log(`      UUID = ${uuidStr}`);
      }
      if (diff.identical.length > 0) {
        console.log(`\n  Identical fields: ${diff.identical.join(', ')}`);
      }
    }

    // Recommendation
    const action = recommend(oldMem, uuidMem, diff);
    console.log('');
    console.log(`  Recommended action: ${action}`);
    console.log('');
  }

  console.log('======================================================');
  console.log('  END OF ANALYSIS — NO DATA MODIFIED');
  console.log('======================================================');
  console.log('');
}

main().finally(() => prisma.$disconnect());
