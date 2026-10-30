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
          const toolArgs = { ...(payload.toolArguments || {}) };

          // ── GUARDRAIL DE PAGOS: Solo permitir 'SALE' / 'CLOSED' / 'PAGADO' o 'PAGO_CONFIRMADO' si existe un comprobante real ──
          const requestedStatus = (toolArgs.leadStatus || '').toUpperCase();
          const requestedTags = Array.isArray(toolArgs.tags) ? [...toolArgs.tags] : [];
          const hasPaymentTag = requestedTags.some(t => {
            const up = String(t).toUpperCase();
            return up === 'PAGO_CONFIRMADO' || up === 'COMPROBANTE_RECIBIDO' || up === 'PAGADO';
          });

          if (requestedStatus === 'SALE' || requestedStatus === 'CLOSED' || requestedStatus === 'PAGADO' || hasPaymentTag) {
            const hasVerifiedVoucher = typeof this.prisma?.interaction?.findFirst === 'function'
              ? await this.prisma.interaction.findFirst({
                  where: {
                    conversationId: payload.conversationId,
                    OR: [
                      { content: { contains: 'Comprobante de Pago Detectado' } },
                      { content: { contains: 'El usuario envió una imagen' } },
                      { content: { contains: 'El usuario adjuntó una imagen' } },
                      { content: { contains: 'Venta manual confirmada' } },
                    ],
                  },
                })
              : null;

            if (!hasVerifiedVoucher) {
              this.logger.warn(`[Guardrail Shield] Interceptado intento de LLM de asignar estado de venta sin comprobante bancario para contacto ${payload.contactId}. Degradando a HOT / ESPERA_DE_PAGO.`);
              toolArgs.leadStatus = 'HOT';
              toolArgs.tags = requestedTags.filter(t => {
                const up = String(t).toUpperCase();
                return up !== 'PAGO_CONFIRMADO' && up !== 'COMPROBANTE_RECIBIDO' && up !== 'PAGADO';
              });
              if (!toolArgs.tags.includes('ESPERA_DE_PAGO')) {
                toolArgs.tags.push('ESPERA_DE_PAGO');
              }
            }
          }

          this.logger.log(`Actualizando memoria de ${payload.contactId} con: ${JSON.stringify(toolArgs)}`);
          this.logger.debug(`Emitting memory.updated for contactId=${payload.contactId}`);
          const memoryEvent = new MemoryUpdatedEvent(payload.tenantId, payload.contactId, toolArgs);
          if (typeof (this.eventEmitter as any).emitAsync === 'function') {
            await (this.eventEmitter as any).emitAsync('memory.updated', memoryEvent);
          } else {
            this.eventEmitter.emit('memory.updated', memoryEvent);
          }
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
          this.logger.log(`Herramienta de handoff deprecada invocada para conversación ${payload.conversationId}. Manteniendo bot activo.`);
          toolResultStr = JSON.stringify({
            status: 'success',
            message: 'El bot permanece activo para responder y asistir al usuario continuamente.',
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
