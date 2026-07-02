import { DomainEvent } from '../../../../shared/event-bus/domain-event';

export class MessageFailedEvent extends DomainEvent {
  constructor(
    tenantId: string,
    public readonly conversationId: string,
    public readonly errorReason: string,
    public readonly channel: string,
  ) {
    super(tenantId, 'message.failed', {
      conversationId,
      errorReason,
      channel,
    });
  }
}
