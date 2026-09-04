"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    await prisma.tenant.updateMany({
        where: { id: 'ferreos' },
        data: { wahaSession: 'ferreos' }
    });
    const defaultTenant = await prisma.tenant.findUnique({ where: { id: 'default' } });
    if (defaultTenant) {
        await prisma.contact.updateMany({
            where: { tenantId: 'default' },
            data: { tenantId: 'ferreos' }
        });
        const defaultBundle = await prisma.knowledgeBundle.findUnique({ where: { tenantId: 'default' } });
        if (defaultBundle) {
            const ferreosBundle = await prisma.knowledgeBundle.findUnique({ where: { tenantId: 'ferreos' } });
            if (!ferreosBundle) {
                await prisma.knowledgeBundle.update({
                    where: { tenantId: 'default' },
                    data: { tenantId: 'ferreos' }
                });
            }
        }
        await prisma.funnel.updateMany({
            where: { tenantId: 'default' },
            data: { tenantId: 'ferreos' }
        });
    }
    console.log("Migration complete.");
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=migrate.js.map