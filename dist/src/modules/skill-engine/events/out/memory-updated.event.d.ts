import { DomainEvent } from '../../../../shared/event-bus/domain-event';
export declare class MemoryUpdatedEvent extends DomainEvent {
    readonly contactId: string;
    readonly updates: any;
    constructor(tenantId: string, contactId: string, updates: any);
}
