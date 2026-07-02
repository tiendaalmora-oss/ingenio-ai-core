import { DomainEvent } from '../../../../shared/event-bus/domain-event';

export class InteractionReceivedEvent extends DomainEvent {
  constructor(
    tenantId: string,
    public readonly conversationId: string,
    public readonly interactionId: string,
    public readonly contactId: string,
    public readonly content: string,
  ) {
    super(tenantId, 'interaction.received', {
      conversationId,
      interactionId,
      contactId,
      content,
    });
  }
}
