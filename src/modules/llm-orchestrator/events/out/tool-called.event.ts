import { DomainEvent } from '../../../../shared/event-bus/domain-event';

export class ToolCalledEvent extends DomainEvent {
  constructor(
    tenantId: string,
    public readonly conversationId: string,
    public readonly contactId: string,
    public readonly toolName: string,
    public readonly toolArguments: any,
  ) {
    super(tenantId, 'tool.called', {
      conversationId,
      contactId,
      toolName,
      toolArguments,
    });
  }
}
