import { DomainEvent } from '../../../../shared/event-bus/domain-event';

export class FakeEventTriggered extends DomainEvent {
  constructor(
    tenantId: string,
    public readonly message: string,
    public readonly timestamp: number
  ) {
    super(tenantId, 'fake.event.triggered', { message, timestamp });
  }
}
