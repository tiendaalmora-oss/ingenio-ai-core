import { DomainEvent } from '../../../../shared/event-bus/domain-event';
export declare class ResponseGeneratedEvent extends DomainEvent {
    readonly conversationId: string;
    readonly generatedContent: string;
    constructor(tenantId: string, conversationId: string, generatedContent: string);
}
