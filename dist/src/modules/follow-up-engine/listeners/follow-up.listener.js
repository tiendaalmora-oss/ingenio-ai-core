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
var FollowUpListenerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowUpListenerService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../../shared/database/prisma.service");
const context_builder_service_1 = require("../../llm-orchestrator/services/context-builder.service");
const hermes_client_service_1 = require("../../llm-orchestrator/services/hermes-client.service");
const response_sanitizer_1 = require("../../llm-orchestrator/utils/response-sanitizer");
let FollowUpListenerService = FollowUpListenerService_1 = class FollowUpListenerService {
    contextBuilder;
    hermesClient;
    prisma;
    logger = new common_1.Logger(FollowUpListenerService_1.name);
    constructor(contextBuilder, hermesClient, prisma) {
        this.contextBuilder = contextBuilder;
        this.hermesClient = hermesClient;
        this.prisma = prisma;
    }
    async handleFollowUpPending(payload) {
        this.logger.log(`Procesando FOLLOW_UP_PENDING para conversación ${payload.conversationId}`);
        try {
            let finalMessage = '';
            const rule = payload.ruleApplied || {};
            if (rule.mensaje && rule.usarIA === false) {
                const contact = await this.prisma.contact.findUnique({
                    where: { id: payload.contactId }
                });
                finalMessage = rule.mensaje.replace(/\{nombre\}/gi, contact?.name || 'hola');
            }
            else {
                const messages = await this.contextBuilder.buildFollowUpContext(payload.tenantId, payload.contactId, payload.conversationId, payload.ruleApplied);
                const response = await this.hermesClient.generateResponse(messages, false);
                if (response.content) {
                    finalMessage = (0, response_sanitizer_1.sanitizeUserFacingResponse)(response.content);
                    finalMessage = finalMessage.replace(/(?:https?:\/\/)?(?:docs\.google\.com|drive\.google\.com|mega\.nz|dropbox\.com)\/[^\s]+/gi, '').replace(/docs\.google\.com/gi, '').trim();
                }
            }
            if (!finalMessage || finalMessage.trim() === '') {
                const ruleText = typeof rule === 'string' ? rule : (rule.mensaje || rule.instruccion || rule.condicion || '');
                if (ruleText && !ruleText.toLowerCase().includes('rule-')) {
                    finalMessage = ruleText.replace(/^\d+[\.\-\)]\s*/, '').trim();
                }
                else {
                    finalMessage = '¡Hola, profe! 👋 ¿Pudiste revisar la información del material? Cuéntame si tienes alguna duda para orientarte.';
                }
                this.logger.log(`Usando texto de seguimiento fallback: "${finalMessage.substring(0, 50)}..."`);
            }
            await this.prisma.pendingOutboundMessage.create({
                data: {
                    tenantId: payload.tenantId,
                    conversationId: payload.conversationId,
                    contactId: payload.contactId,
                    message: finalMessage,
                    followUpId: payload.followUpId,
                    status: 'PENDING'
                }
            });
            this.logger.log(`✅ Mensaje de seguimiento generado y encolado (Regla: ${payload.followUpId})`);
        }
        catch (e) {
            this.logger.error(`Error procesando FOLLOW_UP_PENDING: ${e.message}`, e.stack);
        }
    }
};
exports.FollowUpListenerService = FollowUpListenerService;
__decorate([
    (0, event_emitter_1.OnEvent)('FOLLOW_UP_PENDING'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FollowUpListenerService.prototype, "handleFollowUpPending", null);
exports.FollowUpListenerService = FollowUpListenerService = FollowUpListenerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [context_builder_service_1.ContextBuilderService,
        hermes_client_service_1.HermesClientService,
        prisma_service_1.PrismaService])
], FollowUpListenerService);
//# sourceMappingURL=follow-up.listener.js.map