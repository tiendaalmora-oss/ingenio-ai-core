import { DomainEvent } from '../../../../shared/event-bus/domain-event';
export declare class ToolCalledEvent extends DomainEvent {
    readonly conversationId: string;
    readonly contactId: string;
    readonly toolName: string;
    readonly toolArguments: any;
    constructor(tenantId: string, conversationId: string, contactId: string, toolName: string, toolArguments: any);
}
