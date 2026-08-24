import { BaseEvent, EVENT_TYPES } from '../../base-event';
import { EventMetadata } from '../../interfaces/event.interface';

export interface ConversationCreatedPayload {
  readonly conversationId: string;
  readonly contactId: string;
  readonly channelId: string;
  readonly createdAt: string;
}

export class ConversationCreatedEvent extends BaseEvent<ConversationCreatedPayload> {
  constructor(
    correlationId: string,
    tenantId: string,
    payload: ConversationCreatedPayload,
    metadataOverrides?: Partial<EventMetadata>,
  ) {
    super(EVENT_TYPES.CONVERSATION_CREATED, correlationId, tenantId, payload, metadataOverrides);
  }
}
