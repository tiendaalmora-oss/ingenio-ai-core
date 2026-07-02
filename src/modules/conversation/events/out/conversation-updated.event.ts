import { DomainEvent } from '../../../../shared/event-bus/domain-event';

export class ConversationUpdatedEvent extends DomainEvent {
  constructor(
    tenantId: string,
    public readonly conversationId: string,
    public readonly status: string,
  ) {
    super(tenantId, 'conversation.updated', {
      conversationId,
      status,
    });
  }
}
