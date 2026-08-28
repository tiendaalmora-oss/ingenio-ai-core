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
          this.logger.debug(`Emitting memory.updated for contactId=${payload.contactId}`);
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
        case 'pause_bot_and_handoff':
          this.logger.log(`Solicitando handoff / pausa de bot para conversación ${payload.conversationId}. Razón: ${payload.toolArguments.reason}`);
          
          const isNotInterested = payload.toolArguments.reason === 'NOT_INTERESTED' || payload.toolArguments.leadStatus === 'LOST';
          const newStatus = isNotInterested ? 'LOST' : 'HANDOFF';
          
          // 1. Actualizar estado de la conversación en DB a HANDOFF o LOST
          await this.prisma.conversation.update({
            where: { id: payload.conversationId },
            data: { status: newStatus },
          });

          // 2. Actualizar Business Memory del lead
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

          // 3. Cancelar cualquier seguimiento pendiente para este contacto
          const deletedFollowUps = await this.prisma.pendingOutboundMessage.deleteMany({
            where: {
              conversationId: payload.conversationId,
              status: 'PENDING',
            },
          });
          this.logger.log(`Cancelados ${deletedFollowUps.count} seguimientos pendientes para conversación ${payload.conversationId}`);

          this.eventEmitter.emit(
            'handoff.requested',
            new HandoffRequestedEvent(payload.tenantId, payload.conversationId, payload.toolArguments.reason || 'Escalamiento a humano / Pausa')
          );
          
          toolResultStr = JSON.stringify({
            status: 'success',
            message: `Bot pausado con éxito (Estado: ${newStatus}). Todos los seguimientos automáticos han sido cancelados. Redacta el mensaje de confirmación/despedida al usuario.`,
          });
          break;

        case 'schedule_meeting':
          this.logger.log(`Agendando reunión para contacto ${payload.contactId}. Detalles: ${JSON.stringify(payload.toolArguments)}`);
          // Reutilizamos create_task internamente para que el equipo comercial la vea
          this.eventEmitter.emit(
            'task.created',
            new TaskCreatedEvent(payload.tenantId, payload.contactId, {
              title: `Reunión Comercial: ${payload.toolArguments.date} a las ${payload.toolArguments.time}. Notas: ${payload.toolArguments.notes || ''}`
            })
          );
          toolResultStr = JSON.stringify({ status: 'success', message: 'Reunión agendada con éxito. Confirma la fecha y hora con el usuario en lenguaje natural.' });
          break;

        default:
          this.logger.warn(`Tool Desconocida solicitada: ${payload.toolName}`);
          toolResultStr = JSON.stringify({ status: 'error', message: `Unknown tool: ${payload.toolName}` });
      }

      // Guardar el resultado de la tool en la base de datos (role: 'tool')
      await this.prisma.interaction.create({
        data: {
          conversationId: payload.conversationId,
          direction: 'INBOUND',
          type: 'TOOL_RESULT',
          content: toolResultStr,
          role: 'tool',
          toolCallId: payload.toolCallId, // Real tool_call_id from the LLM
        }
      });

      this.logger.log(`Tool ${payload.toolName} ejecutada y registrada para conversación ${payload.conversationId}`);

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
