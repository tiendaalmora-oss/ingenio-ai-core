import { DomainEvent } from '../../../../shared/event-bus/domain-event';

export class ContactCreatedEvent extends DomainEvent {
  constructor(
    tenantId: string, 
    public readonly contactId: string, 
    public readonly name: string
  ) {
    super(tenantId, 'crm.contact.created', { contactId, name });
  }
}
