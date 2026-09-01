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
        select: {
          contactId: true,
          contact: { select: { tenantId: true, phone: true, externalId: true } },
        },
      });

      if (!conversation) {
        throw new Error(`Conversación ${payload.conversationId} no encontrada.`);
      }

      const channel = 'WAHA'; // Hardcodeado a WAHA por orden del RFC-0005

      // 2. Obtener el destinatario WhatsApp (externalId o phone)
      const targetChatId =
        conversation.contact.externalId ||
        conversation.contact.phone ||
        conversation.contactId;

      // 3. Obtener configuración de Reglas del Bot (Tiempo de Respuesta y Simulación de Escritura)
      const bundle = await this.prisma.knowledgeBundle.findUnique({
        where: { tenantId: conversation.contact.tenantId }
      });
      const rawPrompt: any = bundle?.systemPrompt || {};
      const rawData = rawPrompt['_raw'] || rawPrompt;
      const reglasBot = rawData.reglasBot || {};

      const enableDelay = reglasBot.enableResponseDelay !== false;
      const minSec = Math.max(1, Number(reglasBot.minDelaySeconds) || 4);
      const maxSec = Math.max(minSec, Number(reglasBot.maxDelaySeconds) || 10);
      const simulateTyping = reglasBot.simulateTyping !== false;

      if (enableDelay) {
        const delaySec = Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec;
        const delayMs = delaySec * 1000;
        this.logger.log(`[Human Typing Delay] Simulando tiempo de respuesta humano (${delaySec}s) para ${targetChatId}...`);

        if (simulateTyping) {
          await this.wahaAdapter.startTyping(conversation.contact.tenantId, targetChatId);
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));

        if (simulateTyping) {
          await this.wahaAdapter.stopTyping(conversation.contact.tenantId, targetChatId);
        }
      }

      // 4. Enviar usando el adaptador
      const messageId = await this.wahaAdapter.sendMessage(
        conversation.contact.tenantId,
        targetChatId,
        payload.generatedContent
      );

      // 5. Emitir mensaje enviado
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
