import { DomainEvent } from '../../../../shared/event-bus/domain-event';
export declare class ContactCreatedEvent extends DomainEvent {
    readonly contactId: string;
    readonly name: string;
    constructor(tenantId: string, contactId: string, name: string);
}
