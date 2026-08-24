import { BaseEvent, EVENT_TYPES } from '../../base-event';
import { EventMetadata } from '../../interfaces/event.interface';

export interface MessageReceivedPayload {
  readonly messageId: string;
  readonly channelId: string;
  readonly contactExternalId: string;
  readonly messageType: 'text' | 'audio' | 'image' | 'document' | 'unknown';
  readonly contentPreview: string;
  readonly channelTimestamp: string;
}

export class MessageReceivedEvent extends BaseEvent<MessageReceivedPayload> {
  constructor(
    correlationId: string,
    tenantId: string,
    payload: MessageReceivedPayload,
    metadataOverrides?: Partial<EventMetadata>,
  ) {
    super(EVENT_TYPES.MESSAGE_RECEIVED, correlationId, tenantId, payload, metadataOverrides);
  }
}
