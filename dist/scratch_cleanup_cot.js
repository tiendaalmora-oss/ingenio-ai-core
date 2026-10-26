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
const response_sanitizer_1 = require("./src/modules/llm-orchestrator/utils/response-sanitizer");
const connectionString = process.env.DATABASE_URL;
const pool = new pg_1.Pool({ connectionString });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('--- Buscando mensajes con fugas de razonamiento CoT / Tools en la BD ---');
    const interactions = await prisma.interaction.findMany({
        where: {
            direction: 'OUTBOUND',
            OR: [
                { content: { contains: 'According to' } },
                { content: { contains: 'update_business_memory' } },
                { content: { contains: 'leadStatus' } },
                { content: { contains: 'tool_code' } },
                { content: { contains: 'call:' } },
                { content: { contains: 'The user is' } },
                { content: { contains: 'The user has' } },
                { content: { contains: 'Therefore, I' } },
            ]
        },
        include: {
            conversation: {
                include: {
                    contact: true
                }
            }
        }
    });
    console.log(`Total de interacciones encontradas con posibles fugas: ${interactions.length}`);
    let cleanedCount = 0;
    let emptiedCount = 0;
    for (const item of interactions) {
        const original = item.content;
        const cleaned = (0, response_sanitizer_1.sanitizeUserFacingResponse)(original);
        const safe = (0, response_sanitizer_1.isSafeUserFacingResponse)(cleaned);
        console.log(`\n[ID: ${item.id}] [Tipo: ${item.type}] [Contacto: ${item.conversation?.contact?.name} (${item.conversation?.contact?.phone})]`);
        console.log(`  ORIGINAL (primeros 120 caracteres): ${original.substring(0, 120).replace(/\n/g, ' ')}...`);
        if (item.type === 'TOOL_CALL') {
            await prisma.interaction.update({
                where: { id: item.id },
                data: { content: '' }
            });
            emptiedCount++;
            console.log(`  -> Actualizado TOOL_CALL: content vaciado.`);
        }
        else if (safe && cleaned.length > 5) {
            await prisma.interaction.update({
                where: { id: item.id },
                data: { content: cleaned }
            });
            cleanedCount++;
            console.log(`  -> Actualizado TEXT a versión sanitizada segura: ${cleaned.substring(0, 80).replace(/\n/g, ' ')}...`);
        }
        else {
            await prisma.interaction.update({
                where: { id: item.id },
                data: { content: '' }
            });
            emptiedCount++;
            console.log(`  -> Actualizado TEXT a vacío (era puramente CoT en inglés).`);
        }
    }
    console.log(`\n========================================`);
    console.log(`Resumen de Limpieza en Producción:`);
    console.log(`- Interacciones sanitizadas a texto limpio en español: ${cleanedCount}`);
    console.log(`- Interacciones vaciadas (TOOL_CALL o CoT residual): ${emptiedCount}`);
    console.log(`========================================`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
});
//# sourceMappingURL=scratch_cleanup_cot.js.map