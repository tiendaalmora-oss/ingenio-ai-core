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
var LlmListenerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LlmListenerService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const event_emitter_2 = require("@nestjs/event-emitter");
const context_builder_service_1 = require("./context-builder.service");
const hermes_client_service_1 = require("./hermes-client.service");
const conversation_1 = require("../../conversation");
const response_generated_event_1 = require("../events/out/response-generated.event");
const tool_called_event_1 = require("../events/out/tool-called.event");
const prisma_service_1 = require("../../../shared/database/prisma.service");
const funnel_engine_service_1 = require("../../funnel-engine/funnel-engine.service");
let LlmListenerService = LlmListenerService_1 = class LlmListenerService {
    contextBuilder;
    hermesClient;
    eventEmitter;
    prisma;
    funnelEngine;
    logger = new common_1.Logger(LlmListenerService_1.name);
    constructor(contextBuilder, hermesClient, eventEmitter, prisma, funnelEngine) {
        this.contextBuilder = contextBuilder;
        this.hermesClient = hermesClient;
        this.eventEmitter = eventEmitter;
        this.prisma = prisma;
        this.funnelEngine = funnelEngine;
    }
    async handleInteraction(payload) {
        this.logger.log(`LLM Orchestrator atrapó interacción entrante (Conv: ${payload.conversationId})`);
        try {
            const funnelInstruction = await this.funnelEngine.evaluateInteraction(payload);
            const masterPrompt = await this.contextBuilder.buildContext(payload.tenantId, payload.contactId, payload.conversationId, payload.content, funnelInstruction);
            const response = await this.hermesClient.generateResponse(masterPrompt);
            if (response.content) {
                await this.prisma.interaction.create({
                    data: {
                        conversationId: payload.conversationId,
                        direction: 'OUTBOUND',
                        type: 'TEXT',
                        content: response.content,
                        role: 'assistant'
                    }
                });
                const outEvent = new response_generated_event_1.ResponseGeneratedEvent(payload.tenantId, payload.conversationId, response.content);
                this.eventEmitter.emit('response.generated', outEvent);
                this.logger.log(`Evento response.generated despachado al Event Bus.`);
            }
            if (response.toolCalls && response.toolCalls.length > 0) {
                await this.prisma.interaction.create({
                    data: {
                        conversationId: payload.conversationId,
                        direction: 'OUTBOUND',
                        type: 'TOOL_CALL',
                        content: '',
                        role: 'assistant',
                        toolCalls: response.toolCalls
                    }
                });
                for (const call of response.toolCalls) {
                    const toolEvent = new tool_called_event_1.ToolCalledEvent(payload.tenantId, payload.conversationId, payload.contactId, call.id, call.name, call.arguments);
                    this.eventEmitter.emit('tool.called', toolEvent);
                    this.logger.log(`Evento tool.called despachado para la tool: ${call.name}`);
                }
            }
        }
        catch (error) {
            this.logger.error(`Error orquestando LLM:`, error);
        }
    }
};
exports.LlmListenerService = LlmListenerService;
__decorate([
    (0, event_emitter_1.OnEvent)('interaction.received', { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [conversation_1.InteractionReceivedEvent]),
    __metadata("design:returntype", Promise)
], LlmListenerService.prototype, "handleInteraction", null);
exports.LlmListenerService = LlmListenerService = LlmListenerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [context_builder_service_1.ContextBuilderService,
        hermes_client_service_1.HermesClientService,
        event_emitter_2.EventEmitter2,
        prisma_service_1.PrismaService,
        funnel_engine_service_1.FunnelEngineService])
], LlmListenerService);
//# sourceMappingURL=llm-listener.service.js.map