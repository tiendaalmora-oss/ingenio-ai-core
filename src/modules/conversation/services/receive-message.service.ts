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

@Injectable()
export class ReceiveMessageService {
  private readonly logger = new Logger(ReceiveMessageService.name);

  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepo: IConversationRepository,
    @Inject(INTERACTION_REPOSITORY)
    private readonly interactionRepo: IInteractionRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(tenantId: string, externalId: string, content: string): Promise<void> {
    this.logger.debug(`ReceiveMessageService executing for tenant=${tenantId} externalId=${externalId}`);
    // 0. Ensure Contact exists for (tenantId, phoneNormalized) → get internal UUID
    const contactUuid = await this.conversationRepo.ensureContactExists(tenantId, externalId);
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

    // 3. Create and save the Interaction
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

    // 4. Emit interaction event — pass contactUuid (internal), not the raw externalId
    this.eventEmitter.emit(
      'interaction.received',
      new InteractionReceivedEvent(tenantId, conversation.id, interaction.id, contactUuid, content)
    );

    this.logger.log(`Interaction ${interaction.id} received and broadcasted.`);
    this.logger.debug(`Conversation Hub updated: interactionId=${interaction.id}`);
  }
}
