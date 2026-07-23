import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Check if any tenant exists
  const existingTenants = await prisma.tenant.findMany();
  
  let mainTenantId;

  if (existingTenants.length > 0) {
    console.log('Tenants already exist. Skipping tenant creation.');
    // Usamos el primero que exista para asegurar que haya un KnowledgeBundle básico
    mainTenantId = existingTenants[0].id;
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
          empresa: "FerreOS",
          descripcion: "Sistema de gestión para ferreterías.",
          tono: "Profesional, conciso y vendedor.",
          productos: ["Suscripción Mensual", "Suscripción Anual", "Módulo de Facturación"],
          precios: {
            "Suscripción Mensual": "$50 USD",
            "Suscripción Anual": "$500 USD"
          },
          instrucciones: "Eres el asistente virtual de FerreOS. Responde preguntas sobre precios y características. Si el usuario quiere comprar, pídele sus datos de contacto."
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
