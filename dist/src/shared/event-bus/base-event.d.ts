import { EVENT_TYPES } from './constants/event-types.constants';
import { IEvent, EventMetadata } from './interfaces/event.interface';
export declare abstract class BaseEvent<T = unknown> implements IEvent<T> {
    readonly type: IEvent<T>['type'];
    readonly correlationId: string;
    readonly tenantId: string;
    readonly payload: T;
    readonly eventId: string;
    readonly timestamp: string;
    readonly eventVersion: number;
    readonly metadata: EventMetadata;
    constructor(type: IEvent<T>['type'], correlationId: string, tenantId: string, payload: T, metadataOverrides?: Partial<EventMetadata>);
}
export { EVENT_TYPES };
