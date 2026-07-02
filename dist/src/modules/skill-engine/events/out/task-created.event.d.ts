import { DomainEvent } from '../../../../shared/event-bus/domain-event';
export declare class TaskCreatedEvent extends DomainEvent {
    readonly contactId: string;
    readonly taskDetails: any;
    constructor(tenantId: string, contactId: string, taskDetails: any);
}
