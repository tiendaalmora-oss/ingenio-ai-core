import { BaseEvent, EVENT_TYPES } from '../../base-event';
import { EventMetadata } from '../../interfaces/event.interface';

export type MessageRoute =
  | 'NEEDS_LLM'
  | 'IGNORE'
  | 'POLICY_BLOCK'
  | 'CACHE_HIT'
  | 'RULE_MATCH'
  | 'SKILL_ONLY';

export interface MessageRoutedPayload {
  readonly messageId: string;
  readonly contactExternalId: string;
  readonly route: MessageRoute;
  readonly reason: string;
  readonly routingDurationMs: number;
}

export class MessageRoutedEvent extends BaseEvent<MessageRoutedPayload> {
  constructor(
    correlationId: string,
    tenantId: string,
    payload: MessageRoutedPayload,
    metadataOverrides?: Partial<EventMetadata>,
  ) {
    super(EVENT_TYPES.MESSAGE_ROUTED, correlationId, tenantId, payload, metadataOverrides);
  }
}
