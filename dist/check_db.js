"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const memories = await prisma.businessMemory.findMany({
        include: {
            contact: true
        }
    });
    console.log(JSON.stringify(memories.map(m => ({
        id: m.id,
        contactId: m.contactId,
        tenantId: m.contact?.tenantId,
        name: m.name,
        leadStatus: m.leadStatus
    })), null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=check_db.js.map