import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function cleanSlate() {
  console.log('🧹 Starting clean slate reset...');

  // 1. Delete all transactional / conversation / CRM data
  console.log('Deleting MemoryAuditLog...');
  await prisma.memoryAuditLog.deleteMany();

  console.log('Deleting BusinessMemory...');
  await prisma.businessMemory.deleteMany();

  console.log('Deleting Task...');
  await prisma.task.deleteMany();

  console.log('Deleting ActiveFunnel...');
  await prisma.activeFunnel.deleteMany();

  console.log('Deleting Interaction...');
  await prisma.interaction.deleteMany();

  console.log('Deleting Conversation...');
  await prisma.conversation.deleteMany();

  console.log('Deleting Contact...');
  await prisma.contact.deleteMany();

  console.log('Deleting PendingOutboundMessage & IncomingMessageFailure...');
  await prisma.pendingOutboundMessage.deleteMany();
  await prisma.incomingMessageFailure.deleteMany();

  // 2. Delete Funnels, KnowledgeBundles and Tenants for a pure fresh start
  console.log('Resetting KnowledgeBundles, Funnels and Tenants...');
  await prisma.knowledgeBundle.deleteMany();
  await prisma.funnel.deleteMany();
  await prisma.tenant.deleteMany();

  // 3. Create fresh main tenant
  const targetSession = process.env.WAHA_SESSION || 'ferreos';
  const emptyBundlePrompt = {
    _raw: {
      identidad: { nombre: 'Asistente Virtual', tono: 'Profesional, empático y vendedor' },
      empresa: { nombre: '', descripcion: '', sitioWeb: '' },
      productos: [],
      categorias: [],
      servicios: [],
      faqs: [],
      objeciones: [],
      scriptsComerciales: [],
      promociones: [],
      seguimientos: [],
      soporte: [],
      politicasAtencion: []
    },
    instrucciones: 'El asistente se encuentra listo para configurar. Carga tus productos y servicios desde el Business Studio.'
  };

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Mi Empresa',
      wahaSession: targetSession,
      currentBundleVersion: 'v1',
    }
  });

  await prisma.knowledgeBundle.create({
    data: {
      tenantId: tenant.id,
      systemPrompt: emptyBundlePrompt,
      version: 1
    }
  });

  console.log(`✅ Pristine single tenant created with ID: ${tenant.id} (wahaSession: ${tenant.wahaSession})`);
  console.log('✨ Clean slate completed successfully! 0 Leads, 0 Chats, 0 Tasks.');
}

cleanSlate()
  .catch((e) => {
    console.error('❌ Error during clean slate:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
