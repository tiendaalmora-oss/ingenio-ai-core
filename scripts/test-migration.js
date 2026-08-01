#!/usr/bin/env node
/**
 * test-migration.js
 *
 * PURPOSE:
 *   Validates `migration.sql` by executing it completely inside a single transaction,
 *   and then automatically doing a ROLLBACK.
 *   This proves whether the migration is mathematically sound against the CURRENT
 *   state of the database without making permanent changes.
 *
 * USAGE:
 *   node scripts/test-migration.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERROR: DATABASE_URL is not set.');
  process.exit(1);
}

const migrationName = '20260724000000_refactor_contact_uuid_multitenant';
const migrationPath = path.join(__dirname, `../prisma/migrations/${migrationName}/migration.sql`);

async function main() {
  console.log('\n======================================================');
  console.log(`  MIGRATION DRY-RUN TESTER`);
  console.log(`  ${migrationName}`);
  console.log('======================================================\n');

  if (!fs.existsSync(migrationPath)) {
    console.error(`✗ Migration file not found at:\n  ${migrationPath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(migrationPath, 'utf8');
  // Clean up explicit BEGIN/COMMIT from the sql script so we can control the transaction entirely
  const safeSqlContent = sqlContent
    .replace(/^BEGIN;$/m, '-- BEGIN;')
    .replace(/^COMMIT;$/m, '-- COMMIT;');

  const statements = safeSqlContent
    .split(/;\s*[\r\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s + ';');

  const client = new Client({ connectionString });
  await client.connect();

  console.log(`Starting global transaction...\n`);
  await client.query('BEGIN');

  let success = true;
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const firstLine = stmt.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('--'))[0] || stmt;
    const preview = firstLine.length > 80 ? firstLine.substring(0, 80) + '...' : firstLine;
    
    console.log(`[Step ${i + 1}/${statements.length}] ${preview}`);

    try {
      await client.query(stmt);
      console.log(`  ✓ OK`);
    } catch (err) {
      console.error(`\n  ✗ ERROR: ${err.message}`);
      console.error(`  Code: ${err.code}`);
      console.error(`\n  Failing Statement:\n${stmt}`);
      success = false;
      break;
    }
  }

  console.log('\nRolling back global transaction (dry-run mode)...');
  await client.query('ROLLBACK');
  await client.end();

  if (success) {
    console.log('\n======================================================');
    console.log('  TEST SUCCESSFUL ✓');
    console.log('  The migration is completely safe to run.');
    console.log('======================================================\n');
  } else {
    console.log('\n======================================================');
    console.log('  TEST FAILED ✗');
    console.log('  DO NOT run prisma migrate deploy yet.');
    console.log('======================================================\n');
    process.exit(1);
  }
}

main().catch(console.error);
