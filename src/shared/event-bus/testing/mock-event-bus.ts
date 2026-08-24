import { IEvent } from '../interfaces/event.interface';
import { IEventBus } from '../interfaces/event-bus.interface';

/**
 * MockEventBus — Test double for IEventBus.
 *
 * Usage in unit tests:
 *
 *   const mockBus = new MockEventBus();
 *   const service = new SomeService(mockBus);
 *   service.doSomething();
 *   expect(mockBus.getPublished(EVENT_TYPES.MESSAGE_RECEIVED)).toHaveLength(1);
 *
 * Design:
 * - Captures all published events in memory (no real emission).
 * - Provides query helpers to assert on published events in tests.
 * - publishAsync behaves identically to publish (no async overhead in tests).
 */
export class MockEventBus implements IEventBus {
  private readonly publishedEvents: IEvent[] = [];

  publish<T>(event: IEvent<T>): void {
    this.publishedEvents.push(event as IEvent);
  }

  async publishAsync<T>(event: IEvent<T>): Promise<void> {
    this.publishedEvents.push(event as IEvent);
  }

  /** Returns all events published during this test. */
  getAll(): IEvent[] {
    return [...this.publishedEvents];
  }

  /** Returns events of a specific type. */
  getPublished(type: string): IEvent[] {
    return this.publishedEvents.filter((e) => e.type === type);
  }

  /** Returns the most recently published event. */
  getLastPublished(): IEvent | undefined {
    return this.publishedEvents[this.publishedEvents.length - 1];
  }

  /** Returns the total count of published events. */
  get count(): number {
    return this.publishedEvents.length;
  }

  /** Clears all captured events. Call between test cases if needed. */
  clear(): void {
    this.publishedEvents.length = 0;
  }
}
