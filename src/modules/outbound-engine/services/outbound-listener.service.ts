import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { WahaAdapterService } from './waha-adapter.service';
import { ResponseGeneratedEvent } from '../../llm-orchestrator';
import { MessageSentEvent } from '../events/out/message-sent.event';
import { MessageFailedEvent } from '../events/out/message-failed.event';
import { PrismaService } from '../../../shared/database/prisma.service';

@Injectable()
export class OutboundListenerService {
  private readonly logger = new Logger(OutboundListenerService.name);

  constructor(
    private readonly wahaAdapter: WahaAdapterService,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService, // Para buscar el contacto de la conversación
  ) {}

  @OnEvent('response.generated', { async: true })
  async handleResponseGenerated(payload: ResponseGeneratedEvent) {
    this.logger.log(`Outbound Engine procesando response.generated (Conv: ${payload.conversationId})`);

    try {
      // 1. Obtener el Contacto asociado a la Conversación
      // En un flujo más limpio, esto usaría un repositorio o puerto si el engine fuera estrictamente aislado.
      // Por practicidad técnica, leemos directamente el contactId.
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: payload.conversationId },
        select: { contactId: true, contact: { select: { tenantId: true } } },
      });

      if (!conversation) {
        throw new Error(`Conversacin ${payload.conversationId} no encontrada.`);
      }

      const channel = 'WAHA'; // Hardcodeado a WAHA por orden del RFC-0005

      // 2. Enviar usando el adaptador
      const messageId = await this.wahaAdapter.sendMessage(
        conversation.contact.tenantId,
        conversation.contactId,
        payload.generatedContent
      );

      // 3. Emitir mensaje enviado
      this.eventEmitter.emit(
        'message.sent',
        new MessageSentEvent(payload.tenantId, payload.conversationId, messageId, channel)
      );
      
    } catch (error: any) {
      this.logger.error(`Error enviando mensaje:`, error);
      this.eventEmitter.emit(
        'message.failed',
        new MessageFailedEvent(payload.tenantId, payload.conversationId, error.message, 'WAHA')
      );
    }
  }
}
