export declare abstract class DomainEvent {
    readonly tenantId: string;
    readonly eventName: string;
    readonly payload: any;
    readonly eventId: string;
    readonly occurredOn: Date;
    constructor(tenantId: string, eventName: string, payload: any);
}
