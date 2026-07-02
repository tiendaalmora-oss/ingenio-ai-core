import { DomainEvent } from '../../../../shared/event-bus/domain-event';
export declare class ConversationUpdatedEvent extends DomainEvent {
    readonly conversationId: string;
    readonly status: string;
    constructor(tenantId: string, conversationId: string, status: string);
}
