#!/usr/bin/env node
/**
 * debug-all-migrations.js
 *
 * PURPOSE:
 *   List all rows in the `_prisma_migrations` table to detect duplicate entries,
 *   half-applied states, or rolled-back migrations that might be causing P3009.
 *
 * USAGE:
 *   node scripts/debug-all-migrations.js
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

async function main() {
  console.log('\n======================================================');
  console.log('  ALL PRISMA MIGRATIONS DIAGNOSTIC');
  console.log('======================================================\n');

  try {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT 
        id,
        migration_name,
        started_at,
        finished_at,
        rolled_back_at,
        applied_steps_count,
        logs
      FROM _prisma_migrations
      ORDER BY started_at ASC
    `);

    if (rows.length === 0) {
      console.log('  Table _prisma_migrations is empty.');
    } else {
      console.table(
        rows.map(row => ({
          id: row.id,
          migration_name: row.migration_name,
          started_at: row.started_at ? row.started_at.toISOString() : null,
          finished_at: row.finished_at ? row.finished_at.toISOString() : null,
          rolled_back_at: row.rolled_back_at ? row.rolled_back_at.toISOString() : null,
          steps: row.applied_steps_count,
          logs: row.logs ? (row.logs.length > 50 ? row.logs.substring(0, 50) + '...' : row.logs) : null
        }))
      );

      console.log('\n======================================================');
      console.log('  DUPLICATE CHECK');
      console.log('======================================================\n');

      const nameCounts = {};
      for (const row of rows) {
        nameCounts[row.migration_name] = (nameCounts[row.migration_name] || 0) + 1;
      }

      let hasDuplicates = false;
      for (const [name, count] of Object.entries(nameCounts)) {
        if (count > 1) {
          hasDuplicates = true;
          console.warn(`  ⚠ WARNING: Migration "${name}" appears ${count} times in the table!`);
          
          // Print full details for the duplicates
          const duplicates = rows.filter(r => r.migration_name === name);
          for (const d of duplicates) {
            console.log(`\n    ID: ${d.id}`);
            console.log(`    started_at:      ${d.started_at ? d.started_at.toISOString() : null}`);
            console.log(`    finished_at:     ${d.finished_at ? d.finished_at.toISOString() : null}`);
            console.log(`    rolled_back_at:  ${d.rolled_back_at ? d.rolled_back_at.toISOString() : null}`);
            console.log(`    steps:           ${d.applied_steps_count}`);
            console.log(`    logs:\n${d.logs || '      (null)'}`);
          }
        }
      }

      if (!hasDuplicates) {
        console.log('  ✓ No duplicate migration names found.');
      }
    }
  } catch (err) {
    console.error('  Error reading _prisma_migrations:', err.message);
  }

  console.log('\n======================================================\n');
}

main().finally(() => prisma.$disconnect());
