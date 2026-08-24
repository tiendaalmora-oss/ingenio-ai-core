import { EVENT_TYPES } from './constants/event-types.constants';
import { IEvent, EventMetadata } from './interfaces/event.interface';

/**
 * BaseEvent — Abstract class that implements IEvent.
 *
 * Every concrete event in the system extends this class.
 * It handles the boilerplate (eventId, timestamp) automatically,
 * so concrete events only need to define their type and payload.
 *
 * This replaces the existing DomainEvent class in shared/event-bus/domain-event.ts.
 * DomainEvent is preserved for backward compatibility with existing code.
 * New events created under the EventBus module MUST extend BaseEvent.
 *
 * Why abstract? Because a BaseEvent with no type/payload has no meaning.
 * Every event must be a concrete, named event.
 */
import * as os from 'os';

export abstract class BaseEvent<T = unknown> implements IEvent<T> {
  public readonly eventId: string;
  public readonly timestamp: string;
  public readonly eventVersion: number;
  public readonly metadata: EventMetadata;

  constructor(
    public readonly type: IEvent<T>['type'],
    public readonly correlationId: string,
    public readonly tenantId: string,
    public readonly payload: T,
    metadataOverrides?: Partial<EventMetadata>,
  ) {
    this.eventId = crypto.randomUUID();
    this.timestamp = new Date().toISOString();
    this.eventVersion = 1;

    this.metadata = {
      source: metadataOverrides?.source || 'ingenio-ai-core',
      version: metadataOverrides?.version || '1.0.0',
      environment: metadataOverrides?.environment || process.env.NODE_ENV || 'development',
      hostname: metadataOverrides?.hostname || os.hostname(),
      service: metadataOverrides?.service || 'core-service',
      ...metadataOverrides,
    };
  }
}

// Re-export EVENT_TYPES for convenience in event files
export { EVENT_TYPES };
