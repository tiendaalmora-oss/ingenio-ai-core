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
let ContextBuilderService = ContextBuilderService_1 = class ContextBuilderService {
    prisma;
    logger = new common_1.Logger(ContextBuilderService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async buildContext(tenantId, contactId, content) {
        const mockKOS = `[SYSTEM KOS]: Sos Hermes. Actuás como el Chief of Staff. Analizas el contexto y respondes ejecutivamente.`;
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
        const masterPrompt = `${mockKOS}\n\n${memoryContext}\n\n[USER INBOX]: "${content}"\n\nGenera una respuesta ejecutiva alineada a los objetivos.`;
        return masterPrompt;
    }
};
exports.ContextBuilderService = ContextBuilderService;
exports.ContextBuilderService = ContextBuilderService = ContextBuilderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ContextBuilderService);
//# sourceMappingURL=context-builder.service.js.map