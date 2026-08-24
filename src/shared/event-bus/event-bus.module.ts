import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventBusService } from './event-bus.service';
import { EventBusLoggingListener } from './listeners/event-bus-logging.listener';
import { EVENT_BUS_TOKEN } from './interfaces/event-bus.interface';

/**
 * EventBusModule — The central infrastructure module for domain events.
 *
 * DESIGN DECISIONS:
 *
 * 1. GLOBAL MODULE: This module is marked as @Global() so that any module in
 *    the application can inject IEventBus via EVENT_BUS_TOKEN without explicitly
 *    importing EventBusModule. This is the correct pattern for shared infrastructure.
 *
 * 2. EventEmitterModule.forRoot() is NOT imported here because it is already
 *    initialized in AppModule. Importing it twice would create two separate
 *    emitter instances, breaking listener registration. This module only
 *    provides the service wrapper and listeners.
 *
 * 3. PROVIDER PATTERN: EventBusService is provided under the EVENT_BUS_TOKEN
 *    symbol so that consumers depend on the IEventBus interface, not the
 *    concrete class. This enables seamless replacement with BullMQ/RabbitMQ
 *    in Phase 2.
 *
 * 4. LISTENERS: EventBusLoggingListener is registered as a provider here.
 *    NestJS + @nestjs/event-emitter automatically discovers @OnEvent decorators
 *    on any injectable provider.
 *
 * EXPORTS:
 * - EVENT_BUS_TOKEN: so any module can inject IEventBus.
 * - EventBusService: exported as the concrete class for cases where the
 *   implementation is needed directly (rare — prefer the interface token).
 */
import { Global } from '@nestjs/common';

@Global()
@Module({
  imports: [],
  providers: [
    EventBusLoggingListener,
    {
      provide: EVENT_BUS_TOKEN,
      useClass: EventBusService,
    },
    // Also provide the concrete class directly so NestJS can inject EventEmitter2
    EventBusService,
  ],
  exports: [EVENT_BUS_TOKEN, EventBusService],
})
export class EventBusModule {}
