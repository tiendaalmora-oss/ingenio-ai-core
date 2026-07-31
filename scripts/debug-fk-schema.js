#!/usr/bin/env node
/**
 * debug-fk-schema.js
 *
 * PURPOSE:
 *   Print all foreign-key constraints that reference Contact(id) by querying
 *   the PostgreSQL information_schema catalog directly. Useful for verifying
 *   the real schema before designing migrations or repair scripts.
 *
 * USAGE:
 *   node scripts/debug-fk-schema.js
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

async function main() {
  console.log('');
  console.log('Foreign-key constraints referencing Contact(id):');
  console.log('');

  const result = await prisma.$queryRawUnsafe(`
    SELECT
        kcu.table_name  AS child_table,
        kcu.column_name AS child_column,
        tc.constraint_name,
        rc.update_rule,
        rc.delete_rule
    FROM
        information_schema.table_constraints      AS tc
        JOIN information_schema.key_column_usage  AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema   = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema   = tc.table_schema
        JOIN information_schema.referential_constraints rc
          ON tc.constraint_name = rc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name  = 'Contact'
      AND ccu.column_name = 'id'
    ORDER BY tc.table_name;
  `);

  if (result.length === 0) {
    console.log('No FK references found.');
  } else {
    console.table(result);
  }
}

main().finally(() => prisma.$disconnect());
