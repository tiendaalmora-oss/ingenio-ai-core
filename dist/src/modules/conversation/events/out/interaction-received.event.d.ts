import { DomainEvent } from '../../../../shared/event-bus/domain-event';
export declare class InteractionReceivedEvent extends DomainEvent {
    readonly conversationId: string;
    readonly interactionId: string;
    readonly contactId: string;
    readonly content: string;
    constructor(tenantId: string, conversationId: string, interactionId: string, contactId: string, content: string);
}
