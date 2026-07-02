import { DomainEvent } from '../../../../shared/event-bus/domain-event';
export declare class MessageFailedEvent extends DomainEvent {
    readonly conversationId: string;
    readonly errorReason: string;
    readonly channel: string;
    constructor(tenantId: string, conversationId: string, errorReason: string, channel: string);
}
