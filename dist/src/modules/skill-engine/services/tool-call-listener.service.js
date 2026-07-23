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
var ToolCallListenerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolCallListenerService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const llm_orchestrator_1 = require("../../llm-orchestrator");
const memory_updated_event_1 = require("../events/out/memory-updated.event");
const task_created_event_1 = require("../events/out/task-created.event");
const handoff_requested_event_1 = require("../events/out/handoff-requested.event");
const prisma_service_1 = require("../../../shared/database/prisma.service");
const interaction_received_event_1 = require("../../conversation/events/out/interaction-received.event");
let ToolCallListenerService = ToolCallListenerService_1 = class ToolCallListenerService {
    eventEmitter;
    prisma;
    logger = new common_1.Logger(ToolCallListenerService_1.name);
    constructor(eventEmitter, prisma) {
        this.eventEmitter = eventEmitter;
        this.prisma = prisma;
    }
    async handleToolCall(payload) {
        this.logger.log(`Skill Engine ejecutando Tool: ${payload.toolName}`);
        let toolResultStr = '';
        try {
            switch (payload.toolName) {
                case 'update_business_memory':
                    this.logger.log(`Actualizando memoria de ${payload.contactId} con: ${JSON.stringify(payload.toolArguments)}`);
                    console.log('[6] Evento memory.updated emitido');
                    this.eventEmitter.emit('memory.updated', new memory_updated_event_1.MemoryUpdatedEvent(payload.tenantId, payload.contactId, payload.toolArguments));
                    toolResultStr = JSON.stringify({ status: 'success', message: 'Business Memory actualizada en CRM.' });
                    break;
                case 'create_task':
                    this.logger.log(`Creando tarea para contacto ${payload.contactId}: ${JSON.stringify(payload.toolArguments)}`);
                    this.eventEmitter.emit('task.created', new task_created_event_1.TaskCreatedEvent(payload.tenantId, payload.contactId, payload.toolArguments));
                    toolResultStr = JSON.stringify({ status: 'success', message: 'Tarea creada en CRM.' });
                    break;
                case 'handoff_to_human':
                    this.logger.log(`Solicitando handoff para conversación ${payload.conversationId}. Razón: ${payload.toolArguments.reason}`);
                    this.eventEmitter.emit('handoff.requested', new handoff_requested_event_1.HandoffRequestedEvent(payload.tenantId, payload.conversationId, payload.toolArguments.reason || 'Escalamiento manual'));
                    toolResultStr = JSON.stringify({ status: 'success', message: 'Agente humano notificado. Handoff iniciado.' });
                    break;
                default:
                    this.logger.warn(`Tool Desconocida solicitada: ${payload.toolName}`);
                    toolResultStr = JSON.stringify({ status: 'error', message: `Unknown tool: ${payload.toolName}` });
            }
            await this.prisma.interaction.create({
                data: {
                    conversationId: payload.conversationId,
                    direction: 'INBOUND',
                    type: 'TOOL_RESULT',
                    content: toolResultStr,
                    role: 'tool',
                    toolCallId: payload.toolCallId,
                }
            });
            this.logger.log(`Tool ejecutada. Re-activando Executive Loop para conversación ${payload.conversationId}`);
            this.eventEmitter.emit('interaction.received', new interaction_received_event_1.InteractionReceivedEvent(payload.tenantId, payload.conversationId, 'tool-execution', payload.contactId, ''));
        }
        catch (error) {
            this.logger.error(`Error ejecutando tool ${payload.toolName}: ${error.message}`);
            await this.prisma.interaction.create({
                data: {
                    conversationId: payload.conversationId,
                    direction: 'INBOUND',
                    type: 'TOOL_RESULT',
                    content: JSON.stringify({ status: 'error', message: error.message }),
                    role: 'tool',
                    toolCallId: payload.toolName
                }
            });
            this.eventEmitter.emit('interaction.received', new interaction_received_event_1.InteractionReceivedEvent(payload.tenantId, payload.conversationId, 'tool-error', payload.contactId, ''));
        }
    }
};
exports.ToolCallListenerService = ToolCallListenerService;
__decorate([
    (0, event_emitter_1.OnEvent)('tool.called', { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [llm_orchestrator_1.ToolCalledEvent]),
    __metadata("design:returntype", Promise)
], ToolCallListenerService.prototype, "handleToolCall", null);
exports.ToolCallListenerService = ToolCallListenerService = ToolCallListenerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2,
        prisma_service_1.PrismaService])
], ToolCallListenerService);
//# sourceMappingURL=tool-call-listener.service.js.map