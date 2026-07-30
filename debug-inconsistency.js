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
  console.log('--- INICIANDO DIAGNÓSTICO PROFUNDO DE LA INCONSISTENCIA ---');

  try {
    // 1. Verificar si el índice único ya existe
    console.log('\n1. Verificando si el índice Contact_tenantId_phoneNormalized_key existe en la BD...');
    const indexQuery = `
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'Contact' AND indexname = 'Contact_tenantId_phoneNormalized_key';
    `;
    const indexResults = await prisma.$queryRawUnsafe(indexQuery);
    if (indexResults.length > 0) {
      console.log('⚠️ ¡EL ÍNDICE YA EXISTE EN LA BASE DE DATOS!');
      console.log(indexResults[0].indexdef);
    } else {
      console.log('✅ El índice NO existe (como se esperaba antes de la migración).');
    }

    // 2. Verificar estado de las columnas
    console.log('\n2. Verificando estado actual de externalId y phoneNormalized...');
    const columnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Contact' AND column_name IN ('externalId', 'phoneNormalized', '_newId');
    `;
    const columns = await prisma.$queryRawUnsafe(columnsQuery);
    if (columns.length > 0) {
      console.log('⚠️ Las siguientes columnas YA EXISTEN: ', columns.map(c => c.column_name).join(', '));
      
      const dataState = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as total, 
               SUM(CASE WHEN "externalId" IS NOT NULL THEN 1 ELSE 0 END) as has_externalId,
               SUM(CASE WHEN "phoneNormalized" IS NOT NULL THEN 1 ELSE 0 END) as has_phoneNormalized
        FROM "Contact";
      `);
      console.table(dataState);
    } else {
      console.log('✅ Las columnas no existen todavía.');
    }

    // 3. Ejecutar el paso 1 y 2 para atrapar el error exacto y ver el antes/después
    console.log('\n3. Simulando Paso 1 y Paso 2 en una transacción segura...');
    await prisma.$transaction(async (tx) => {
      // Paso 1
      await tx.$executeRawUnsafe(`
        ALTER TABLE "Contact"
          ADD COLUMN IF NOT EXISTS "externalId"      TEXT,
          ADD COLUMN IF NOT EXISTS "phoneNormalized" TEXT,
          ADD COLUMN IF NOT EXISTS "_newId"          TEXT;
      `);
      
      // Mostrar datos ANTES del UPDATE
      console.log('\nEstado de una muestra de 3 filas ANTES del UPDATE:');
      const beforeUpdate = await tx.$queryRawUnsafe(`
        SELECT "id", "tenantId", "externalId", "phoneNormalized" 
        FROM "Contact" LIMIT 3;
      `);
      console.table(beforeUpdate);

      // Paso 2
      try {
        await tx.$executeRawUnsafe(`
          UPDATE "Contact"
          SET
            "externalId"      = "id",
            "phone"           = regexp_replace("id", '@(c\\.us|lid|s\\.whatsapp\\.net)$', ''),
            "phoneNormalized" = regexp_replace("id", '@(c\\.us|lid|s\\.whatsapp\\.net)$', ''),
            "_newId"          = gen_random_uuid()::text
          WHERE "externalId" IS NULL;
        `);
        console.log('\n✅ UPDATE ejecutado exitosamente. No hubo error 23505.');
        
        // Mostrar datos DESPUÉS del UPDATE
        console.log('Estado de la muestra DESPUÉS del UPDATE:');
        const afterUpdate = await tx.$queryRawUnsafe(`
          SELECT "id", "tenantId", "externalId", "phoneNormalized" 
          FROM "Contact" LIMIT 3;
        `);
        console.table(afterUpdate);
      } catch (e) {
        console.error('\n❌ EL UPDATE FALLÓ CON EL ERROR:');
        console.error(e.message);
      }

      throw new Error('DEBUG_SUCCESS');
    });

  } catch (error) {
    if (error.message === 'DEBUG_SUCCESS') {
      console.log('\nSimulación finalizada y revertida por seguridad.');
    } else {
      console.error('\nError en el script de depuración:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
