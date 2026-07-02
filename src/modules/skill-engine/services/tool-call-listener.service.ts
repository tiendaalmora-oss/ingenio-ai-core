import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { ToolCalledEvent } from '../../llm-orchestrator';
import { MemoryUpdatedEvent } from '../events/out/memory-updated.event';
import { TaskCreatedEvent } from '../events/out/task-created.event';
import { HandoffRequestedEvent } from '../events/out/handoff-requested.event';

@Injectable()
export class ToolCallListenerService {
  private readonly logger = new Logger(ToolCallListenerService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  @OnEvent('tool.called', { async: true })
  handleToolCall(payload: ToolCalledEvent) {
    this.logger.log(`Skill Engine ejecutando Tool: ${payload.toolName}`);

    switch (payload.toolName) {
      case 'update_business_memory':
        this.logger.log(`Actualizando memoria de ${payload.contactId} con: ${JSON.stringify(payload.toolArguments)}`);
        this.eventEmitter.emit(
          'memory.updated',
          new MemoryUpdatedEvent(payload.tenantId, payload.contactId, payload.toolArguments)
        );
        break;

      case 'create_task':
        this.logger.log(`Creando tarea para contacto ${payload.contactId}: ${JSON.stringify(payload.toolArguments)}`);
        this.eventEmitter.emit(
          'task.created',
          new TaskCreatedEvent(payload.tenantId, payload.contactId, payload.toolArguments)
        );
        break;

      case 'handoff_to_human':
        this.logger.log(`Solicitando handoff para conversación ${payload.conversationId}. Razón: ${payload.toolArguments.reason}`);
        this.eventEmitter.emit(
          'handoff.requested',
          new HandoffRequestedEvent(payload.tenantId, payload.conversationId, payload.toolArguments.reason || 'Escalamiento manual')
        );
        break;

      default:
        this.logger.warn(`Tool Desconocida solicitada: ${payload.toolName}`);
    }
  }
}
