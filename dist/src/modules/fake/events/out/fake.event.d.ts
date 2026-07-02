import { DomainEvent } from '../../../../shared/event-bus/domain-event';
export declare class FakeEventTriggered extends DomainEvent {
    readonly message: string;
    readonly timestamp: number;
    constructor(tenantId: string, message: string, timestamp: number);
}
