"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ContextBuilderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextBuilderService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../shared/database/prisma.service");
const kos_loader_service_1 = require("./kos-loader.service");
let ContextBuilderService = ContextBuilderService_1 = class ContextBuilderService {
    prisma;
    kosLoader;
    logger = new common_1.Logger(ContextBuilderService_1.name);
    constructor(prisma, kosLoader) {
        this.prisma = prisma;
        this.kosLoader = kosLoader;
    }
    async buildContext(tenantId, contactId, conversationId, content) {
        const kosBundle = await this.kosLoader.load(tenantId);
        let systemInstructions = `[SYSTEM KOS]\n`;
        for (const [key, value] of Object.entries(kosBundle)) {
            if (typeof value === 'object') {
                systemInstructions += `- ${key.toUpperCase()}: ${JSON.stringify(value)}\n`;
            }
            else {
                systemInstructions += `- ${key.toUpperCase()}: ${value}\n`;
            }
        }
        const memory = await this.prisma.businessMemory.findUnique({
            where: { contactId },
        });
        let memoryContext = '[BUSINESS MEMORY]: Ninguna memoria previa detectada.';
        if (memory) {
            memoryContext = `[BUSINESS MEMORY]:
- Nombre: ${memory.name || 'Desconocido'}
- Empresa: ${memory.company || 'Desconocida'}
- Intereses: ${memory.interests.join(', ') || 'Ninguno'}
- Última interacción: ${memory.lastInteraction ? memory.lastInteraction.toISOString() : 'Desconocida'}
- Estado del Lead: ${memory.leadStatus || 'Desconocido'}
- Objeciones: ${memory.objections.join(', ') || 'Ninguna'}
- Tags: ${memory.tags.join(', ') || 'Ninguno'}`;
            this.logger.log(`Business Memory recuperada para el contacto ${contactId}.`);
        }
        else {
            this.logger.log(`No se encontró Business Memory para el contacto ${contactId}. Procediendo en blanco.`);
        }
        const rawHistory = await this.prisma.interaction.findMany({
            where: { conversationId },
            orderBy: { timestamp: 'desc' },
            take: 10,
        });
        const history = rawHistory.reverse();
        const messages = [
            {
                role: "system",
                content: `${systemInstructions}\n\n${memoryContext}\n\nActúa de acuerdo a las instrucciones del KOS. No inventes información que no esté en tu configuración.`
            }
        ];
        for (const msg of history) {
            if (msg.role === 'tool') {
                messages.push({ role: msg.role, content: msg.content, tool_call_id: msg.toolCallId });
            }
            else if (msg.role === 'assistant' && msg.toolCalls) {
                messages.push({ role: msg.role, content: msg.content || null, tool_calls: msg.toolCalls });
            }
            else {
                messages.push({
                    role: msg.role || (msg.direction === 'INBOUND' ? 'user' : 'assistant'),
                    content: msg.content
                });
            }
        }
        return messages;
    }
};
exports.ContextBuilderService = ContextBuilderService;
exports.ContextBuilderService = ContextBuilderService = ContextBuilderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        kos_loader_service_1.KosLoaderService])
], ContextBuilderService);
//# sourceMappingURL=context-builder.service.js.map