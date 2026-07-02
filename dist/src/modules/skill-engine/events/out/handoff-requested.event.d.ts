import { DomainEvent } from '../../../../shared/event-bus/domain-event';
export declare class HandoffRequestedEvent extends DomainEvent {
    readonly conversationId: string;
    readonly reason: string;
    constructor(tenantId: string, conversationId: string, reason: string);
}
