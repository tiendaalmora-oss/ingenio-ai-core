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
  console.log('Consultando el estado exacto de la tabla Contact...\n');
  
  try {
    const contacts = await prisma.$queryRawUnsafe(`
      SELECT 
        "id", 
        "tenantId", 
        "externalId", 
        "phoneNormalized", 
        "phone", 
        "name"
      FROM "Contact"
      ORDER BY "id" ASC;
    `);
    
    console.table(contacts);
  } catch (error) {
    console.error('Error al consultar:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
