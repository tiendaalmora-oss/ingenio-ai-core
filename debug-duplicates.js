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
  console.log('Buscando contactos duplicados por tenantId y phoneNormalized...');
  
  const query = `
    WITH NormalizedContacts AS (
      SELECT 
        "id",
        "tenantId",
        "name",
        regexp_replace("id", '@(c\\.us|lid|s\\.whatsapp\\.net)$', '') AS "phoneNormalized"
      FROM "Contact"
    ),
    Duplicates AS (
      SELECT "tenantId", "phoneNormalized", COUNT(*) as total_duplicates
      FROM NormalizedContacts
      GROUP BY "tenantId", "phoneNormalized"
      HAVING COUNT(*) > 1
    )
    SELECT 
      nc."tenantId",
      nc."phoneNormalized",
      nc."id" AS "original_id_waha",
      nc."name"
    FROM NormalizedContacts nc
    JOIN Duplicates d 
      ON nc."tenantId" = d."tenantId" 
     AND nc."phoneNormalized" = d."phoneNormalized"
    ORDER BY nc."tenantId", nc."phoneNormalized", nc."id";
  `;

  try {
    const results = await prisma.$queryRawUnsafe(query);
    
    if (results.length === 0) {
      console.log('✅ No se encontraron duplicados.');
    } else {
      console.log(`\n❌ Se encontraron ${results.length} registros conflictivos:\n`);
      console.table(results);
    }
  } catch (error) {
    console.error('Error ejecutando la consulta:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
