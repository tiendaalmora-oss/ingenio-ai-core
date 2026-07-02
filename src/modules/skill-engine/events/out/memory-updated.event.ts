import { DomainEvent } from '../../../../shared/event-bus/domain-event';

export class MemoryUpdatedEvent extends DomainEvent {
  constructor(
    tenantId: string,
    public readonly contactId: string,
    public readonly updates: any,
  ) {
    super(tenantId, 'memory.updated', { contactId, updates });
  }
}
