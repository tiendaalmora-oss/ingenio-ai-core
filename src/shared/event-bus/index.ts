/**
 * Public API barrel for the EventBus module.
 *
 * Other modules should import from this barrel, never from deep internal paths.
 * This allows internal refactoring without breaking importers.
 *
 * Usage:
 *   import { EVENT_BUS_TOKEN, IEventBus, MessageReceivedEvent } from '@shared/event-bus';
 */

// Module
export { EventBusModule } from './event-bus.module';

// Service
export { EventBusService } from './event-bus.service';

// Interfaces
export type { IEvent } from './interfaces/event.interface';
export type { IEventBus } from './interfaces/event-bus.interface';
export { EVENT_BUS_TOKEN } from './interfaces/event-bus.interface';

// Constants
export { EVENT_TYPES } from './constants/event-types.constants';
export type { EventType } from './constants/event-types.constants';

// Base class
export { BaseEvent } from './base-event';

// Events
export { MessageReceivedEvent } from './domain/events/message-received.event';
export type { MessageReceivedPayload } from './domain/events/message-received.event';

export { MessageRoutedEvent } from './domain/events/message-routed.event';
export type { MessageRoutedPayload, MessageRoute } from './domain/events/message-routed.event';

export { ConversationCreatedEvent } from './domain/events/conversation-created.event';
export type { ConversationCreatedPayload } from './domain/events/conversation-created.event';

export { ConversationClosedEvent } from './domain/events/conversation-closed.event';
export type { ConversationClosedPayload, ConversationOutcome } from './domain/events/conversation-closed.event';

export { GoalAchievedEvent } from './domain/events/goal-achieved.event';
export type { GoalAchievedPayload, GoalType } from './domain/events/goal-achieved.event';

// Listeners
export { EventBusLoggingListener } from './listeners/event-bus-logging.listener';
