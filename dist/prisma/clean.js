"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const connectionString = process.env.DATABASE_URL;
const pool = new pg_1.Pool({ connectionString });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function cleanSlate() {
    console.log('🧹 Starting clean slate reset...');
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
    console.log('Resetting KnowledgeBundles, Funnels and Tenants...');
    await prisma.knowledgeBundle.deleteMany();
    await prisma.funnel.deleteMany();
    await prisma.tenant.deleteMany();
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
//# sourceMappingURL=clean.js.map