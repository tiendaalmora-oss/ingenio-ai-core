"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding database...');
    const ferreosTenant = await prisma.tenant.upsert({
        where: { id: 'ferreos' },
        update: { name: 'FerreOS', currentBundleVersion: 'v1' },
        create: { id: 'ferreos', name: 'FerreOS', currentBundleVersion: 'v1' },
    });
    console.log(`Tenant Upserted: ${ferreosTenant.name}`);
    const bundle = await prisma.knowledgeBundle.upsert({
        where: { tenantId: ferreosTenant.id },
        update: {
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
        },
        create: {
            tenantId: ferreosTenant.id,
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
    console.log(`KnowledgeBundle Upserted for Tenant: ${ferreosTenant.id}`);
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