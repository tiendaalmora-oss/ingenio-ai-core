import { DomainEvent } from '../../../../shared/event-bus/domain-event';

export class HandoffRequestedEvent extends DomainEvent {
  constructor(
    tenantId: string,
    public readonly conversationId: string,
    public readonly reason: string,
  ) {
    super(tenantId, 'handoff.requested', { conversationId, reason });
  }
}
