#!/usr/bin/env node
/**
 * debug-migration-log.js
 *
 * PURPOSE:
 *   Inspect the `_prisma_migrations` table to view the exact state and logs
 *   of the failed migration `20260724000000_refactor_contact_uuid_multitenant`.
 *
 * USAGE:
 *   node scripts/debug-migration-log.js
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
  console.log('  MIGRATION DIAGNOSTIC LOG');
  console.log('======================================================\n');

  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM _prisma_migrations WHERE migration_name = $1`,
      '20260724000000_refactor_contact_uuid_multitenant'
    );

    if (rows.length === 0) {
      console.log('  ✗ No record found for migration: 20260724000000_refactor_contact_uuid_multitenant');
    } else {
      const row = rows[0];
      console.log(`  Migration Name       : ${row.migration_name}`);
      console.log(`  Checksum             : ${row.checksum}`);
      console.log(`  Started At           : ${row.started_at ? row.started_at.toISOString() : 'null'}`);
      console.log(`  Finished At          : ${row.finished_at ? row.finished_at.toISOString() : 'null'}`);
      console.log(`  Rolled Back At       : ${row.rolled_back_at ? row.rolled_back_at.toISOString() : 'null'}`);
      console.log(`  Applied Steps Count  : ${row.applied_steps_count}`);
      console.log(`\n  Logs:\n`);
      console.log(row.logs ? row.logs : '  (No logs recorded)');
      
      console.log('\n  Full raw record:');
      console.dir(row, { depth: null, colors: true });
    }
  } catch (err) {
    console.error('  Error reading _prisma_migrations:', err.message);
  }

  console.log('\n======================================================\n');
}

main().finally(() => prisma.$disconnect());
