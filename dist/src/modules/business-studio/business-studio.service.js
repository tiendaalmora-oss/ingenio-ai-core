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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessStudioService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
let BusinessStudioService = class BusinessStudioService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getBundle(tenantId) {
        const bundle = await this.prisma.knowledgeBundle.findUnique({
            where: { tenantId }
        });
        if (!bundle) {
            return {
                empresa: {}, productos: [], servicios: [], faqs: [],
                objeciones: [], promociones: [], personalidad: {}, documentos: [],
                canales: [], skills: []
            };
        }
        return bundle.systemPrompt || {};
    }
    async updateSection(tenantId, section, data) {
        const bundle = await this.prisma.knowledgeBundle.findUnique({
            where: { tenantId }
        });
        let currentPrompt = bundle?.systemPrompt || {};
        currentPrompt[section] = data;
        const updated = await this.prisma.knowledgeBundle.upsert({
            where: { tenantId },
            update: {
                systemPrompt: currentPrompt,
                version: { increment: 1 }
            },
            create: {
                tenantId,
                systemPrompt: currentPrompt,
                version: 1
            }
        });
        return updated.systemPrompt;
    }
};
exports.BusinessStudioService = BusinessStudioService;
exports.BusinessStudioService = BusinessStudioService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BusinessStudioService);
//# sourceMappingURL=business-studio.service.js.map