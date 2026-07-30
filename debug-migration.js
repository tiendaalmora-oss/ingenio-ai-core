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
  const statements = [
    `ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "externalId" TEXT, ADD COLUMN IF NOT EXISTS "phoneNormalized" TEXT, ADD COLUMN IF NOT EXISTS "_newId" TEXT;`,
    `UPDATE "Contact" SET "externalId" = "id", "phone" = regexp_replace("id", '@(c\\.us|lid|s\\.whatsapp\\.net)$', ''), "phoneNormalized" = regexp_replace("id", '@(c\\.us|lid|s\\.whatsapp\\.net)$', ''), "_newId" = gen_random_uuid()::text WHERE "externalId" IS NULL;`,
    `UPDATE "Contact" SET "id" = "_newId";`,
    `ALTER TABLE "Contact" DROP COLUMN "_newId";`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Contact_tenantId_phoneNormalized_key" ON "Contact"("tenantId", "phoneNormalized");`
  ];

  console.log('Iniciando depuración forense de la migración...');
  
  try {
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < statements.length; i++) {
        console.log('\nEjecutando Paso ' + (i + 1) + '...');
        try {
          await tx.$executeRawUnsafe(statements[i]);
          console.log('Paso ' + (i + 1) + ' completado EXITOSAMENTE.');
        } catch (e) {
          console.error('\n❌ ERROR FATAL EN EL PASO ' + (i + 1) + ':');
          console.error(e.message);
          throw e;
        }
      }
      throw new Error('DEBUG_SUCCESS');
    });
  } catch (e) {
    if (e.message === 'DEBUG_SUCCESS') {
      console.log('\n✅ Todos los pasos se ejecutaron sin error. Transacción revertida por seguridad.');
    } else {
      console.log('\nTransacción abortada para mantener la base de datos intacta.');
    }
  }
}
main().finally(() => prisma.$disconnect());
