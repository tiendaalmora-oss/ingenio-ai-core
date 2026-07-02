import { DomainEvent } from '../../../../shared/event-bus/domain-event';

export class TaskCreatedEvent extends DomainEvent {
  constructor(
    tenantId: string,
    public readonly contactId: string,
    public readonly taskDetails: any,
  ) {
    super(tenantId, 'task.created', { contactId, taskDetails });
  }
}
