import { DomainEvent } from '../../../../shared/event-bus/domain-event';

export class ResponseGeneratedEvent extends DomainEvent {
  constructor(
    tenantId: string,
    public readonly conversationId: string,
    public readonly generatedContent: string,
  ) {
    super(tenantId, 'response.generated', {
      conversationId,
      generatedContent,
    });
  }
}
