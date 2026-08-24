import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IEvent } from './interfaces/event.interface';
import { IEventBus } from './interfaces/event-bus.interface';

/**
 * EventBusService — Concrete implementation of IEventBus using NestJS EventEmitter2.
 *
 * This is the Phase 1 implementation. It wraps the in-process EventEmitter2 instance
 * provided by @nestjs/event-emitter, which is already configured in AppModule with:
 *   { wildcard: true, delimiter: '.' }
 *
 * MIGRATION PATH TO PHASE 2:
 * When the system needs distributed event delivery (BullMQ, RabbitMQ, Kafka),
 * create a new class (e.g., BullMQEventBusService) that implements IEventBus.
 * Register it as the provider for EVENT_BUS_TOKEN in EventBusModule.
 * Zero changes to producers or listeners.
 *
 * LOGGING POLICY:
 * - Always log: eventId, type, tenantId, timestamp.
 * - NEVER log: payload.content, payload.rawPayload, or any user-supplied text.
 * - Use payload fields explicitly allowed for logging (e.g., contentPreview).
 */
@Injectable()
export class EventBusService implements IEventBus {
  private readonly logger = new Logger(EventBusService.name);

  constructor(private readonly emitter: EventEmitter2) {}

  /**
   * Publishes an event synchronously.
   * All registered @OnEvent listeners receive the event before this returns.
   */
  publish<T>(event: IEvent<T>): void {
    this.logPublished(event);
    this.emitter.emit(event.type, event);
  }

  /**
   * Publishes an event asynchronously.
   * Returns a promise that resolves when all async listeners have completed.
   */
  async publishAsync<T>(event: IEvent<T>): Promise<void> {
    this.logPublished(event);
    await this.emitter.emitAsync(event.type, event);
  }

  // ── Private Helpers ──────────────────────────────────────────────────────────

  private logPublished<T>(event: IEvent<T>): void {
    this.logger.debug(
      `[PUBLISH] type=${event.type} eventId=${event.eventId} tenantId=${event.tenantId} timestamp=${event.timestamp}`,
    );
  }
}
