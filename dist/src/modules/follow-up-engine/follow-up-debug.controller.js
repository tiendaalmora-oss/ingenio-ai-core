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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var FollowUpDebugController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowUpDebugController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const follow_up_engine_service_1 = require("./services/follow-up-engine.service");
const waha_adapter_service_1 = require("../outbound-engine/services/waha-adapter.service");
let FollowUpDebugController = FollowUpDebugController_1 = class FollowUpDebugController {
    prisma;
    followUpEngine;
    wahaAdapter;
    logger = new common_1.Logger(FollowUpDebugController_1.name);
    constructor(prisma, followUpEngine, wahaAdapter) {
        this.prisma = prisma;
        this.followUpEngine = followUpEngine;
        this.wahaAdapter = wahaAdapter;
    }
    async runAudit() {
        const wahaSessions = await this.wahaAdapter.getWahaSessions();
        const tenants = await this.prisma.tenant.findMany({
            include: {
                knowledgeBundle: true,
            },
        });
        const tenantAudits = [];
        for (const t of tenants) {
            const bundle = t.knowledgeBundle;
            const systemPrompt = bundle?.systemPrompt || {};
            const rawData = typeof systemPrompt === 'string' ? JSON.parse(systemPrompt) : (systemPrompt['_raw'] || systemPrompt);
            const rawSeguimientos = rawData['seguimientos'] || rawData['followups'] || systemPrompt['followups'] || systemPrompt['seguimientos'] || rawData['scriptsComerciales'];
            tenantAudits.push({
                tenantId: t.id,
                wahaSessionStored: t.wahaSession,
                hasBundle: !!bundle,
                rawSeguimientosFound: !!rawSeguimientos,
                rawSeguimientosContent: rawSeguimientos || 'No configurado',
            });
        }
        const activeConversations = await this.prisma.conversation.findMany({
            where: {
                status: { in: ['NEW', 'ACTIVE'] },
            },
            include: {
                contact: {
                    include: { memory: true },
                },
                interactions: {
                    orderBy: { timestamp: 'desc' },
                    take: 2,
                },
            },
        });
        const conversationAudits = activeConversations.map(c => {
            const lastMsg = c.interactions[0];
            const elapsedMs = lastMsg ? Date.now() - lastMsg.timestamp.getTime() : null;
            const elapsedMinutes = elapsedMs ? Math.round(elapsedMs / 60000) : null;
            return {
                conversationId: c.id,
                status: c.status,
                contact: {
                    id: c.contact.id,
                    phone: c.contact.phone,
                    name: c.contact.name,
                    leadStatus: c.contact.memory?.leadStatus || 'UNKNOWN',
                },
                lastInteraction: lastMsg ? {
                    direction: lastMsg.direction,
                    content: lastMsg.content?.substring(0, 60),
                    timestamp: lastMsg.timestamp,
                    elapsedMinutes: `${elapsedMinutes} min atrás`,
                } : 'Sin interacciones',
            };
        });
        const recentOutbound = await this.prisma.pendingOutboundMessage.findMany({
            orderBy: { createdAt: 'desc' },
            take: 15,
        });
        return {
            serverTime: new Date().toISOString(),
            waha: {
                apiUrl: process.env.WAHA_API_URL || 'No configurado',
                configuredSessionEnv: process.env.WAHA_SESSION || 'None (usando tenant o default)',
                activeSessions: wahaSessions,
            },
            tenants: tenantAudits,
            activeConversationsCount: activeConversations.length,
            conversations: conversationAudits,
            recentOutboundMessages: recentOutbound.map(m => ({
                id: m.id,
                contactId: m.contactId,
                followUpId: m.followUpId,
                status: m.status,
                retries: m.retries,
                createdAt: m.createdAt,
                sentAt: m.sentAt,
                messageSnippet: m.message?.substring(0, 60),
                providerResponse: m.providerResponse,
            })),
        };
    }
    async triggerEvaluation() {
        this.logger.log('Disparando evaluación manual del Follow-Up Engine...');
        const result = await this.followUpEngine.evaluateFollowUps();
        return {
            message: 'Evaluación manual completada',
            report: result,
        };
    }
    async sendTestMessage(body) {
        if (!body.phone) {
            return { error: 'El campo phone es obligatorio (ej: "584121234567")' };
        }
        const testContent = body.message || `🧪 Mensaje de prueba de Ingenio AI enviado a las ${new Date().toLocaleTimeString()} ✅`;
        const tenants = await this.prisma.tenant.findMany({ take: 1 });
        const tenantId = tenants[0]?.id || 'tenant-default';
        try {
            const result = await this.wahaAdapter.sendMessage(tenantId, body.phone, testContent);
            return {
                status: 'SUCCESS',
                phone: body.phone,
                message: testContent,
                wahaMessageId: result,
            };
        }
        catch (e) {
            return {
                status: 'ERROR',
                phone: body.phone,
                error: e.message,
            };
        }
    }
};
exports.FollowUpDebugController = FollowUpDebugController;
__decorate([
    (0, common_1.Get)('audit'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FollowUpDebugController.prototype, "runAudit", null);
__decorate([
    (0, common_1.Post)('trigger'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FollowUpDebugController.prototype, "triggerEvaluation", null);
__decorate([
    (0, common_1.Post)('send-test'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FollowUpDebugController.prototype, "sendTestMessage", null);
exports.FollowUpDebugController = FollowUpDebugController = FollowUpDebugController_1 = __decorate([
    (0, common_1.Controller)('debug/follow-up'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        follow_up_engine_service_1.FollowUpEngineService,
        waha_adapter_service_1.WahaAdapterService])
], FollowUpDebugController);
//# sourceMappingURL=follow-up-debug.controller.js.map