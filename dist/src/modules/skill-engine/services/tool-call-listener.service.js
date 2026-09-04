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
                    this.logger.debug(`Emitting memory.updated for contactId=${payload.contactId}`);
                    this.eventEmitter.emit('memory.updated', new memory_updated_event_1.MemoryUpdatedEvent(payload.tenantId, payload.contactId, payload.toolArguments));
                    toolResultStr = JSON.stringify({ status: 'success', message: 'Business Memory actualizada en CRM.' });
                    break;
                case 'create_task':
                    this.logger.log(`Creando tarea para contacto ${payload.contactId}: ${JSON.stringify(payload.toolArguments)}`);
                    this.eventEmitter.emit('task.created', new task_created_event_1.TaskCreatedEvent(payload.tenantId, payload.contactId, payload.toolArguments));
                    toolResultStr = JSON.stringify({ status: 'success', message: 'Tarea creada en CRM.' });
                    break;
                case 'handoff_to_human':
                case 'pause_bot_and_handoff':
                    this.logger.log(`Solicitando handoff / pausa de bot para conversación ${payload.conversationId}. Razón: ${payload.toolArguments.reason}`);
                    const isNotInterested = payload.toolArguments.reason === 'NOT_INTERESTED' || payload.toolArguments.leadStatus === 'LOST';
                    const newStatus = isNotInterested ? 'LOST' : 'HANDOFF';
                    await this.prisma.conversation.update({
                        where: { id: payload.conversationId },
                        data: { status: newStatus },
                    });
                    await this.prisma.businessMemory.upsert({
                        where: { contactId: payload.contactId },
                        create: {
                            contactId: payload.contactId,
                            leadStatus: newStatus,
                            tags: [isNotInterested ? 'NO_INTERESADO' : 'HANDOFF_HUMANO'],
                        },
                        update: {
                            leadStatus: newStatus,
                            tags: {
                                push: isNotInterested ? 'NO_INTERESADO' : 'HANDOFF_HUMANO',
                            },
                        },
                    });
                    const deletedFollowUps = await this.prisma.pendingOutboundMessage.deleteMany({
                        where: {
                            conversationId: payload.conversationId,
                            status: 'PENDING',
                        },
                    });
                    this.logger.log(`Cancelados ${deletedFollowUps.count} seguimientos pendientes para conversación ${payload.conversationId}`);
                    this.eventEmitter.emit('handoff.requested', new handoff_requested_event_1.HandoffRequestedEvent(payload.tenantId, payload.conversationId, payload.toolArguments.reason || 'Escalamiento a humano / Pausa'));
                    toolResultStr = JSON.stringify({
                        status: 'success',
                        message: `Bot pausado con éxito (Estado: ${newStatus}). Todos los seguimientos automáticos han sido cancelados. Redacta el mensaje de confirmación/despedida al usuario.`,
                    });
                    break;
                case 'schedule_meeting':
                    this.logger.log(`Agendando reunión para contacto ${payload.contactId}. Detalles: ${JSON.stringify(payload.toolArguments)}`);
                    this.eventEmitter.emit('task.created', new task_created_event_1.TaskCreatedEvent(payload.tenantId, payload.contactId, {
                        title: `Reunión Comercial: ${payload.toolArguments.date} a las ${payload.toolArguments.time}. Notas: ${payload.toolArguments.notes || ''}`
                    }));
                    toolResultStr = JSON.stringify({ status: 'success', message: 'Reunión agendada con éxito. Confirma la fecha y hora con el usuario en lenguaje natural.' });
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
            this.logger.log(`Tool ${payload.toolName} ejecutada y registrada para conversación ${payload.conversationId}`);
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