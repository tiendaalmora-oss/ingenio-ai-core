const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const dotenv = require('dotenv');
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Inspeccionando el catálogo de PostgreSQL para extraer llaves foráneas hacia Contact...\n');
  
  const query = `
    SELECT
        tc.table_name AS child_table, 
        kcu.column_name AS child_column, 
        tc.constraint_name, 
        rc.update_rule,
        rc.delete_rule
    FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints rc
          ON tc.constraint_name = rc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND ccu.table_name = 'Contact'
      AND ccu.column_name = 'id'
    ORDER BY tc.table_name;
  `;

  try {
    const result = await prisma.$queryRawUnsafe(query);
    if (result.length === 0) {
      console.log('No se encontraron tablas que dependan de Contact.id.');
    } else {
      console.log(`Se encontraron ${result.length} dependencias directas:`);
      console.table(result);
    }
  } catch (error) {
    console.error('Error al consultar el catálogo:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
