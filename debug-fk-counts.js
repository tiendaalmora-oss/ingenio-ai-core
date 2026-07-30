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
  console.log('Inspeccionando llaves foráneas hacia Contact.id...\n');
  
  const tables = ['Conversation', 'BusinessMemory', 'Task'];
  
  try {
    for (const table of tables) {
      console.log(`\n--- Tabla: ${table} ---`);
      const query = `
        SELECT 
          SUM(CASE WHEN "contactId" ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN 1 ELSE 0 END) as uuid_count,
          SUM(CASE WHEN "contactId" !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN 1 ELSE 0 END) as old_id_count
        FROM "${table}";
      `;
      const result = await prisma.$queryRawUnsafe(query);
      console.table(result);
    }
  } catch (error) {
    console.error('Error al consultar:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
