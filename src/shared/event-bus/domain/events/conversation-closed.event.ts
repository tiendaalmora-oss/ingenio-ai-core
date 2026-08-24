import { BaseEvent, EVENT_TYPES } from '../../base-event';
import { EventMetadata } from '../../interfaces/event.interface';

export type ConversationOutcome = 'resolved' | 'escalated' | 'abandoned' | 'timeout';

export interface ConversationClosedPayload {
  readonly conversationId: string;
  readonly contactId: string;
  readonly outcome: ConversationOutcome;
  readonly interactionCount: number;
  readonly openedAt: string;
  readonly closedAt: string;
  readonly durationSeconds: number;
}

export class ConversationClosedEvent extends BaseEvent<ConversationClosedPayload> {
  constructor(
    correlationId: string,
    tenantId: string,
    payload: ConversationClosedPayload,
    metadataOverrides?: Partial<EventMetadata>,
  ) {
    super(EVENT_TYPES.CONVERSATION_CLOSED, correlationId, tenantId, payload, metadataOverrides);
  }
}
