import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { CONVERSATION_REPOSITORY } from '../ports/out/conversation-repository.interface';
import type { IConversationRepository } from '../ports/out/conversation-repository.interface';
import { INTERACTION_REPOSITORY } from '../ports/out/interaction-repository.interface';
import type { IInteractionRepository } from '../ports/out/interaction-repository.interface';
import { Conversation } from '../entities/conversation.entity';
import { Interaction } from '../entities/interaction.entity';
import { InteractionReceivedEvent } from '../events/out/interaction-received.event';
import { ConversationUpdatedEvent } from '../events/out/conversation-updated.event';

interface PendingBurst {
  tenantId: string;
  conversationId: string;
  lastInteractionId: string;
  contactUuid: string;
  messages: string[];
  timer: NodeJS.Timeout;
}

@Injectable()
export class ReceiveMessageService {
  private readonly logger = new Logger(ReceiveMessageService.name);
  private readonly recentMessages = new Map<string, number>();
  private readonly pendingBursts = new Map<string, PendingBurst>();

  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepo: IConversationRepository,
    @Inject(INTERACTION_REPOSITORY)
    private readonly interactionRepo: IInteractionRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(tenantId: string, externalId: string, content: string, pushName?: string): Promise<void> {
    const dedupeKey = `${tenantId}:${externalId}:${content.trim()}`;
    const now = Date.now();
    const lastSeen = this.recentMessages.get(dedupeKey);

    // Evitar procesar eventos webhook duplicados que lleguen en menos de 4 segundos
    if (lastSeen && (now - lastSeen) < 4000) {
      this.logger.warn(`Ignorando mensaje duplicado recibido en <4s para ${externalId}: "${content.substring(0, 30)}..."`);
      return;
    }
    this.recentMessages.set(dedupeKey, now);

    // Limpieza de memoria si el caché crece
    if (this.recentMessages.size > 500) {
      for (const [k, ts] of this.recentMessages.entries()) {
        if (now - ts > 30000) this.recentMessages.delete(k);
      }
    }

    this.logger.debug(`ReceiveMessageService executing for tenant=${tenantId} externalId=${externalId}`);
    // 0. Ensure Contact exists for (tenantId, phoneNormalized) → get internal UUID
    const contactUuid = await this.conversationRepo.ensureContactExists(tenantId, externalId, pushName);
    this.logger.debug(`Contact resolved: uuid=${contactUuid} externalId=${externalId}`);

    // 1. Find or create the Conversation using the internal UUID
    let conversation = await this.conversationRepo.findActiveByContact(contactUuid);
    let conversationCreated = false;

    if (!conversation) {
      conversation = new Conversation(randomUUID(), contactUuid, 'NEW');
      conversationCreated = true;
    }

    await this.conversationRepo.save(conversation);
    this.logger.debug(`Conversation ${conversationCreated ? 'created' : 'found'}: ${conversation.id}`);

    // 2. Emit conversation event if new
    if (conversationCreated) {
      this.eventEmitter.emit(
        'conversation.updated',
        new ConversationUpdatedEvent(tenantId, conversation.id, conversation.status)
      );
    }

    // 3. Create and save the Interaction immediately (for instant CRM visibility)
    const interaction = new Interaction(
      randomUUID(),
      conversation.id,
      'INBOUND',
      'TEXT',
      content,
      new Date()
    );

    await this.interactionRepo.save(interaction);
    this.logger.debug(`Interaction ${interaction.id} persisted`);

    // 4. Smart Burst Debouncer: agrupar ráfagas de mensajes consecutivos del mismo cliente (ej: "Hola" + "Quiero info")
    const defaultDebounce = process.env.NODE_ENV === 'test' ? 0 : 2500;
    const debounceMs = process.env.INBOUND_DEBOUNCE_MS !== undefined
      ? Number(process.env.INBOUND_DEBOUNCE_MS)
      : defaultDebounce;

    const trimmed = content.trim();
    const isImmediateBypass =
      debounceMs <= 0 ||
      trimmed.startsWith('#') ||
      trimmed.includes('[Comprobante de Pago Detectado]');

    if (isImmediateBypass) {
      // Si había mensajes previos en el buffer de esta conversación, fusionarlos y emitir de inmediato
      const existing = this.pendingBursts.get(conversation.id);
      if (existing) {
        clearTimeout(existing.timer);
        this.pendingBursts.delete(conversation.id);
        const combinedContent = [...existing.messages, trimmed].join('\n');
        this.eventEmitter.emit(
          'interaction.received',
          new InteractionReceivedEvent(tenantId, conversation.id, interaction.id, contactUuid, combinedContent)
        );
      } else {
        this.eventEmitter.emit(
          'interaction.received',
          new InteractionReceivedEvent(tenantId, conversation.id, interaction.id, contactUuid, content)
        );
      }
      this.logger.log(`Interaction ${interaction.id} received and broadcasted immediately.`);
      return;
    }

    const existingBurst = this.pendingBursts.get(conversation.id);
    if (existingBurst) {
      clearTimeout(existingBurst.timer);
      existingBurst.messages.push(trimmed);
      existingBurst.lastInteractionId = interaction.id;
      existingBurst.timer = setTimeout(() => this.flushBurst(conversation.id), debounceMs);
      this.logger.log(`[Burst Debouncer] Mensaje agrupado en ráfaga activa (${existingBurst.messages.length} msgs) para conv ${conversation.id}. Esperando ${debounceMs}ms...`);
    } else {
      const timer = setTimeout(() => this.flushBurst(conversation.id), debounceMs);
      this.pendingBursts.set(conversation.id, {
        tenantId,
        conversationId: conversation.id,
        lastInteractionId: interaction.id,
        contactUuid,
        messages: [trimmed],
        timer,
      });
      this.logger.debug(`[Burst Debouncer] Iniciada ventana de ${debounceMs}ms para conv ${conversation.id}.`);
    }
  }

  private flushBurst(conversationId: string): void {
    const burst = this.pendingBursts.get(conversationId);
    if (!burst) return;
    this.pendingBursts.delete(conversationId);

    const combinedContent = burst.messages.join('\n');
    this.logger.log(`[Burst Debouncer] Despachando turno consolidado (${burst.messages.length} msg(s)) para conv ${conversationId}: "${combinedContent.substring(0, 80)}..."`);

    this.eventEmitter.emit(
      'interaction.received',
      new InteractionReceivedEvent(
        burst.tenantId,
        burst.conversationId,
        burst.lastInteractionId,
        burst.contactUuid,
        combinedContent,
      ),
    );
  }
}
