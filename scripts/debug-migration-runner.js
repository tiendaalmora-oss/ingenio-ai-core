#!/usr/bin/env node
/**
 * debug-migration-runner.js
 *
 * PURPOSE:
 *   Reads the SQL migration file for the 20260724000000 migration.
 *   Splits it into individual statements.
 *   Executes them one by one sequentially in their own short transaction (BEGIN; stmt; COMMIT).
 *   Stops exactly at the first statement that fails and prints the raw PostgreSQL error.
 *   This avoids the "current transaction is aborted" mask that Prisma outputs.
 *
 * USAGE:
 *   node scripts/debug-migration-runner.js
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
  console.log(`  MIGRATION STATEMENT RUNNER`);
  console.log(`  ${migrationName}`);
  console.log('======================================================\n');

  if (!fs.existsSync(migrationPath)) {
    console.error(`✗ Migration file not found at:\n  ${migrationPath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(migrationPath, 'utf8');

  // Split by semicolon followed by newline(s), which is standard for Prisma SQL files.
  const statements = sqlContent
    .split(/;\s*[\r\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s + ';'); // Restore the semicolon for execution

  console.log(`Found ${statements.length} individual statements in migration.sql.\n`);

  const client = new Client({ connectionString });
  await client.connect();

  let successCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    // Create a 1-line preview for the console
    const firstLine = stmt.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('--'))[0] || stmt;
    const preview = firstLine.length > 80 ? firstLine.substring(0, 80) + '...' : firstLine;

    console.log(`[Step ${i + 1}/${statements.length}] ${preview}`);

    try {
      // Execute each statement in isolation to prevent a failing statement
      // from poisoning a giant global transaction block.
      await client.query('BEGIN');
      await client.query(stmt);
      await client.query('COMMIT');
      console.log(`  ✓ Success\n`);
      successCount++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`\n  ✗ FAILED at Step ${i + 1}\n`);
      console.error(`======================================================`);
      console.error(`  RAW POSTGRESQL ERROR`);
      console.error(`======================================================`);
      console.error(`  Code   : ${err.code}`);
      console.error(`  Message: ${err.message}`);
      if (err.detail) console.error(`  Detail : ${err.detail}`);
      if (err.hint)   console.error(`  Hint   : ${err.hint}`);
      console.error(`\n  Failing SQL Statement:\n`);
      console.error(stmt);
      console.error(`\n======================================================\n`);
      console.error(`STOPPING EXECUTION.`);
      break;
    }
  }

  await client.end();

  console.log(`\nExecution finished. ${successCount} out of ${statements.length} statements executed successfully.`);
}

main().catch(console.error);
