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
var FunnelEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunnelEngineService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
let FunnelEngineService = FunnelEngineService_1 = class FunnelEngineService {
    prisma;
    logger = new common_1.Logger(FunnelEngineService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async evaluateInteraction(payload) {
        const { tenantId, conversationId, content } = payload;
        const activeFunnel = await this.prisma.activeFunnel.findUnique({
            where: { conversationId },
        });
        if (activeFunnel) {
            this.logger.log(`Funnel activo detectado para conv ${conversationId}`);
            return this.processActiveFunnel(activeFunnel, content);
        }
        const funnels = await this.prisma.funnel.findMany({
            where: { tenantId, isActive: true }
        });
        for (const funnel of funnels) {
            if (funnel.trigger && content.toLowerCase().includes(funnel.trigger.toLowerCase())) {
                this.logger.log(`Nuevo Funnel disparado: ${funnel.name}`);
                const steps = funnel.steps;
                if (steps && steps.length > 0) {
                    const firstStep = steps[0];
                    await this.prisma.activeFunnel.create({
                        data: {
                            conversationId,
                            funnelId: funnel.id,
                            currentStepId: firstStep.id || 'step-1'
                        }
                    });
                    return `[INSTRUCCIÓN DE FUNNEL - ALTA PRIORIDAD]: Acabas de entrar al funnel "${funnel.name}". Debes ejecutar el siguiente paso: ${firstStep.instruction || firstStep.name}.`;
                }
            }
        }
        return null;
    }
    async processActiveFunnel(activeFunnel, content) {
        return `[INSTRUCCIÓN DE FUNNEL - ALTA PRIORIDAD]: Estás en un proceso guiado (Funnel ID: ${activeFunnel.funnelId}, Paso actual: ${activeFunnel.currentStepId}). Sigue las reglas del embudo y no te desvíes hasta completarlo.`;
    }
};
exports.FunnelEngineService = FunnelEngineService;
exports.FunnelEngineService = FunnelEngineService = FunnelEngineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FunnelEngineService);
//# sourceMappingURL=funnel-engine.service.js.map