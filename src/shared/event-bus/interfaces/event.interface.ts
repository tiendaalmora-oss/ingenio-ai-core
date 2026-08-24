import { EventType } from '../constants/event-types.constants';

/**
 * IEvent — Base contract for all domain events in Ingenio AI Core.
 *
 * Every event published through the EventBusService MUST implement this interface.
 * This guarantees structural consistency and enables generic listeners and middleware.
 *
 * Design decisions:
 * - `eventId` is a UUID auto-generated at construction time. No two events share the same ID.
 * - `timestamp` is the wall-clock time of the event occurrence, not the processing time.
 * - `tenantId` is MANDATORY. The Event Bus is tenant-aware by design (multi-tenant principle).
 * - `type` uses the EventType union — only known event types are valid.
 * - `payload` is typed via generic T, enforced at the concrete event class level.
 */
export interface EventMetadata {
  /** The source component or service that generated the event. */
  readonly source: string;
  /** The version of the service/component (e.g., '1.0.0'). */
  readonly version: string;
  /** Environment the event was generated in (e.g., 'production', 'staging'). */
  readonly environment: string;
  /** Hostname or pod name where the event originated. */
  readonly hostname: string;
  /** The service name. */
  readonly service: string;
  /** Request identifier from the HTTP context, if applicable. */
  readonly requestId?: string;
  /** IP address of the original request, if applicable. */
  readonly ip?: string;
  /** Any additional dynamic metadata. */
  readonly [key: string]: unknown;
}

export interface IEvent<T = unknown> {
  /** Globally unique identifier for this event instance. Format: UUID v4. */
  readonly eventId: string;

  /** Correlation ID to track the full execution flow initiated by a message. */
  readonly correlationId: string;

  /** The tenant this event belongs to. Never null — all events are tenant-scoped. */
  readonly tenantId: string;

  /** ISO-8601 wall-clock timestamp of when the event occurred. */
  readonly timestamp: string;

  /** The discriminated event type. Must be a value from EVENT_TYPES constants. */
  readonly type: EventType;

  /** Schema version of this event type. */
  readonly eventVersion: number;

  /** Metadata for tracing, observability, and distributed context. */
  readonly metadata: EventMetadata;

  /** Typed payload. Defined by each concrete event class. */
  readonly payload: T;
}
