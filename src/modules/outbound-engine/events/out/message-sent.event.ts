import { DomainEvent } from '../../../../shared/event-bus/domain-event';

export class MessageSentEvent extends DomainEvent {
  constructor(
    tenantId: string,
    public readonly conversationId: string,
    public readonly messageId: string,
    public readonly channel: string,
  ) {
    super(tenantId, 'message.sent', {
      conversationId,
      messageId,
      channel,
    });
  }
}
