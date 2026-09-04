import { EventType } from '../constants/event-types.constants';
export interface EventMetadata {
    readonly source: string;
    readonly version: string;
    readonly environment: string;
    readonly hostname: string;
    readonly service: string;
    readonly requestId?: string;
    readonly ip?: string;
    readonly [key: string]: unknown;
}
export interface IEvent<T = unknown> {
    readonly eventId: string;
    readonly correlationId: string;
    readonly tenantId: string;
    readonly timestamp: string;
    readonly type: EventType;
    readonly eventVersion: number;
    readonly metadata: EventMetadata;
    readonly payload: T;
}
