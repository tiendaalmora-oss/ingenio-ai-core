import { DomainEvent } from '../../../../shared/event-bus/domain-event';
export declare class MessageSentEvent extends DomainEvent {
    readonly conversationId: string;
    readonly messageId: string;
    readonly channel: string;
    constructor(tenantId: string, conversationId: string, messageId: string, channel: string);
}
