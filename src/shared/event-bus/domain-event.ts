export abstract class DomainEvent {
  public readonly eventId: string = crypto.randomUUID();
  public readonly occurredOn: Date = new Date();
  
  constructor(
    public readonly tenantId: string,
    public readonly eventName: string,
    public readonly payload: any
  ) {}
}
