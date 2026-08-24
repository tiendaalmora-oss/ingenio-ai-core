import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Check if any tenant exists
  const existingTenants = await prisma.tenant.findMany();
  
  let mainTenantId;

  if (existingTenants.length > 0) {
    console.log('Tenants already exist. Reusing the first tenant.');
    mainTenantId = existingTenants[0].id;

    // Ensure the existing tenant has the correct wahaSession
    if (existingTenants[0].wahaSession !== 'ferreos') {
      console.log('Updating existing tenant to have wahaSession: ferreos');
      await prisma.tenant.update({
        where: { id: mainTenantId },
        data: { wahaSession: 'ferreos' }
      });
    }
  } else {
    console.log('No tenants found. Creating the main default tenant...');
    const newTenant = await prisma.tenant.create({
      data: {
        // En lugar de forzar un ID demo, dejamos que genere un UUID, o usamos uno canónico de producción
        name: 'Default Tenant',
        wahaSession: 'ferreos',
        currentBundleVersion: 'v1'
      }
    });
    mainTenantId = newTenant.id;
    console.log(`Main Tenant Created: ${newTenant.name} with session ${newTenant.wahaSession}`);
  }

  // 2. Ensure a KnowledgeBundle exists for the main tenant
  const existingBundle = await prisma.knowledgeBundle.findUnique({
    where: { tenantId: mainTenantId }
  });

  if (!existingBundle) {
    console.log('Creating initial KnowledgeBundle...');
    await prisma.knowledgeBundle.create({
      data: {
        tenantId: mainTenantId,
        systemPrompt: {
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
          instrucciones: "El asistente se encuentra listo para configurar. Carga tus productos y servicios desde el Business Studio."
        },
        version: 1
      }
    });
    console.log(`KnowledgeBundle created for Tenant: ${mainTenantId}`);
  } else {
    console.log('KnowledgeBundle already exists. Skipping creation.');
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
