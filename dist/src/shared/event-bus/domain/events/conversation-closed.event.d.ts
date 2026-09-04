import { BaseEvent } from '../../base-event';
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
export declare class ConversationClosedEvent extends BaseEvent<ConversationClosedPayload> {
    constructor(correlationId: string, tenantId: string, payload: ConversationClosedPayload, metadataOverrides?: Partial<EventMetadata>);
}
