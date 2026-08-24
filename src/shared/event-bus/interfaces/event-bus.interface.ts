import { IEvent } from './event.interface';

/**
 * IEventBus — Public API contract for the Event Bus service.
 *
 * Any component that publishes or listens to events depends on THIS interface,
 * never on a concrete implementation. This decoupling is the key design decision
 * that allows migrating from EventEmitter2 (Phase 1) to BullMQ/RabbitMQ (Phase 2)
 * without touching a single producer or listener.
 *
 * Injection token: EVENT_BUS_TOKEN
 */
export interface IEventBus {
  /**
   * Publishes an event synchronously to all registered listeners.
   * All listeners in the current process receive the event before this call returns.
   *
   * Use for: events where you need the result of listeners before continuing.
   */
  publish<T>(event: IEvent<T>): void;

  /**
   * Publishes an event asynchronously. Returns a promise that resolves when
   * all async listeners have completed.
   *
   * Use for: events that trigger I/O (logging, analytics) without blocking the main flow.
   */
  publishAsync<T>(event: IEvent<T>): Promise<void>;
}

/** Injection token for the IEventBus provider. */
export const EVENT_BUS_TOKEN = Symbol('IEventBus');
