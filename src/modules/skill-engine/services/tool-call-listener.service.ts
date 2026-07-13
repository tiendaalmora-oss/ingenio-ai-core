import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { ToolCalledEvent } from '../../llm-orchestrator';
import { MemoryUpdatedEvent } from '../events/out/memory-updated.event';
import { TaskCreatedEvent } from '../events/out/task-created.event';
import { HandoffRequestedEvent } from '../events/out/handoff-requested.event';
import { PrismaService } from '../../../shared/database/prisma.service';
import { InteractionReceivedEvent } from '../../conversation/events/out/interaction-received.event';

@Injectable()
export class ToolCallListenerService {
  private readonly logger = new Logger(ToolCallListenerService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent('tool.called', { async: true })
  async handleToolCall(payload: ToolCalledEvent) {
    this.logger.log(`Skill Engine ejecutando Tool: ${payload.toolName}`);
    let toolResultStr = '';

    try {
      switch (payload.toolName) {
        case 'update_business_memory':
          this.logger.log(`Actualizando memoria de ${payload.contactId} con: ${JSON.stringify(payload.toolArguments)}`);
          this.eventEmitter.emit(
            'memory.updated',
            new MemoryUpdatedEvent(payload.tenantId, payload.contactId, payload.toolArguments)
          );
          toolResultStr = JSON.stringify({ status: 'success', message: 'Business Memory actualizada en CRM.' });
          break;

        case 'create_task':
          this.logger.log(`Creando tarea para contacto ${payload.contactId}: ${JSON.stringify(payload.toolArguments)}`);
          this.eventEmitter.emit(
            'task.created',
            new TaskCreatedEvent(payload.tenantId, payload.contactId, payload.toolArguments)
          );
          toolResultStr = JSON.stringify({ status: 'success', message: 'Tarea creada en CRM.' });
          break;

        case 'handoff_to_human':
          this.logger.log(`Solicitando handoff para conversación ${payload.conversationId}. Razón: ${payload.toolArguments.reason}`);
          this.eventEmitter.emit(
            'handoff.requested',
            new HandoffRequestedEvent(payload.tenantId, payload.conversationId, payload.toolArguments.reason || 'Escalamiento manual')
          );
          toolResultStr = JSON.stringify({ status: 'success', message: 'Agente humano notificado. Handoff iniciado.' });
          break;

        default:
          this.logger.warn(`Tool Desconocida solicitada: ${payload.toolName}`);
          toolResultStr = JSON.stringify({ status: 'error', message: `Unknown tool: ${payload.toolName}` });
      }

      // Guardar el resultado de la tool en la base de datos (role: 'tool')
      await this.prisma.interaction.create({
        data: {
          conversationId: payload.conversationId,
          direction: 'INBOUND', // Es interno, pero entra al LLM
          type: 'TOOL_RESULT',
          content: toolResultStr,
          role: 'tool',
          toolCallId: payload.toolName // MVP: Usamos el nombre como ID si la API no provee tool_call_id
        }
      });

      // ¡EL EXECUTIVE LOOP!
      // Re-emitimos interaction.received para que el LLM Orchestrator lea el historial actualizado y responda al usuario
      this.logger.log(`Tool ejecutada. Re-activando Executive Loop para conversación ${payload.conversationId}`);
      this.eventEmitter.emit(
        'interaction.received',
        new InteractionReceivedEvent(payload.tenantId, payload.conversationId, 'tool-execution', payload.contactId, '')
      );

    } catch (error: any) {
      this.logger.error(`Error ejecutando tool ${payload.toolName}: ${error.message}`);
      
      // En caso de error, también informamos al LLM
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

      this.eventEmitter.emit(
        'interaction.received',
        new InteractionReceivedEvent(payload.tenantId, payload.conversationId, 'tool-error', payload.contactId, '')
      );
    }
  }
}
