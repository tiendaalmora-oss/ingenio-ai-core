"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding database...');
    const existingTenants = await prisma.tenant.findMany();
    let mainTenantId;
    if (existingTenants.length > 0) {
        console.log('Tenants already exist. Reusing the first tenant.');
        mainTenantId = existingTenants[0].id;
        if (existingTenants[0].wahaSession !== 'ferreos') {
            console.log('Updating existing tenant to have wahaSession: ferreos');
            await prisma.tenant.update({
                where: { id: mainTenantId },
                data: { wahaSession: 'ferreos' }
            });
        }
    }
    else {
        console.log('No tenants found. Creating the main default tenant...');
        const newTenant = await prisma.tenant.create({
            data: {
                name: 'Default Tenant',
                wahaSession: 'ferreos',
                currentBundleVersion: 'v1'
            }
        });
        mainTenantId = newTenant.id;
        console.log(`Main Tenant Created: ${newTenant.name} with session ${newTenant.wahaSession}`);
    }
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
    }
    else {
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
//# sourceMappingURL=seed.js.map