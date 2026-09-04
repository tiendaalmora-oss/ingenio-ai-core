import { BaseEvent } from '../../base-event';
import { EventMetadata } from '../../interfaces/event.interface';
export interface ConversationCreatedPayload {
    readonly conversationId: string;
    readonly contactId: string;
    readonly channelId: string;
    readonly createdAt: string;
}
export declare class ConversationCreatedEvent extends BaseEvent<ConversationCreatedPayload> {
    constructor(correlationId: string, tenantId: string, payload: ConversationCreatedPayload, metadataOverrides?: Partial<EventMetadata>);
}
