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
var OutboundListenerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboundListenerService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const waha_adapter_service_1 = require("./waha-adapter.service");
const llm_orchestrator_1 = require("../../llm-orchestrator");
const message_sent_event_1 = require("../events/out/message-sent.event");
const message_failed_event_1 = require("../events/out/message-failed.event");
const prisma_service_1 = require("../../../shared/database/prisma.service");
let OutboundListenerService = OutboundListenerService_1 = class OutboundListenerService {
    wahaAdapter;
    eventEmitter;
    prisma;
    logger = new common_1.Logger(OutboundListenerService_1.name);
    constructor(wahaAdapter, eventEmitter, prisma) {
        this.wahaAdapter = wahaAdapter;
        this.eventEmitter = eventEmitter;
        this.prisma = prisma;
    }
    async handleResponseGenerated(payload) {
        this.logger.log(`Outbound Engine procesando response.generated (Conv: ${payload.conversationId})`);
        try {
            const conversation = await this.prisma.conversation.findUnique({
                where: { id: payload.conversationId },
                select: { contactId: true },
            });
            if (!conversation) {
                throw new Error(`Conversación ${payload.conversationId} no encontrada.`);
            }
            const channel = 'WAHA';
            const messageId = await this.wahaAdapter.sendMessage(conversation.contactId, payload.generatedContent);
            this.eventEmitter.emit('message.sent', new message_sent_event_1.MessageSentEvent(payload.tenantId, payload.conversationId, messageId, channel));
        }
        catch (error) {
            this.logger.error(`Error enviando mensaje:`, error);
            this.eventEmitter.emit('message.failed', new message_failed_event_1.MessageFailedEvent(payload.tenantId, payload.conversationId, error.message, 'WAHA'));
        }
    }
};
exports.OutboundListenerService = OutboundListenerService;
__decorate([
    (0, event_emitter_1.OnEvent)('response.generated', { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [llm_orchestrator_1.ResponseGeneratedEvent]),
    __metadata("design:returntype", Promise)
], OutboundListenerService.prototype, "handleResponseGenerated", null);
exports.OutboundListenerService = OutboundListenerService = OutboundListenerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [waha_adapter_service_1.WahaAdapterService,
        event_emitter_1.EventEmitter2,
        prisma_service_1.PrismaService])
], OutboundListenerService);
//# sourceMappingURL=outbound-listener.service.js.map