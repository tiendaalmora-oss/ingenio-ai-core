import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_TYPES } from '../constants/event-types.constants';
import { MessageReceivedEvent } from '../domain/events/message-received.event';
import { MessageRoutedEvent } from '../domain/events/message-routed.event';
import { ConversationCreatedEvent } from '../domain/events/conversation-created.event';
import { ConversationClosedEvent } from '../domain/events/conversation-closed.event';
import { GoalAchievedEvent } from '../domain/events/goal-achieved.event';

/**
 * EventBusLoggingListener — Observability listener for all Event Bus events.
 */
@Injectable()
export class EventBusLoggingListener {
  private readonly logger = new Logger(EventBusLoggingListener.name);

  @OnEvent(EVENT_TYPES.MESSAGE_RECEIVED, { async: true })
  async onMessageReceived(event: MessageReceivedEvent): Promise<void> {
    try {
      this.validateBaseFields(event);
      this.logger.log(
        `[${event.type}] eventId=${event.eventId} correlationId=${event.correlationId} tenantId=${event.tenantId} v=${event.eventVersion} ` +
          `contactExternalId=${event.payload.contactExternalId} ` +
          `messageType=${event.payload.messageType} ` +
          `channel=${event.payload.channelId} ` +
          `preview="${event.payload.contentPreview}"`,
      );
    } catch (err) {
      this.logger.warn(`[${EVENT_TYPES.MESSAGE_RECEIVED}] Listener error: ${(err as Error).message}`);
    }
  }

  @OnEvent(EVENT_TYPES.MESSAGE_ROUTED, { async: true })
  async onMessageRouted(event: MessageRoutedEvent): Promise<void> {
    try {
      this.validateBaseFields(event);
      this.logger.log(
        `[${event.type}] eventId=${event.eventId} correlationId=${event.correlationId} tenantId=${event.tenantId} v=${event.eventVersion} ` +
          `messageId=${event.payload.messageId} ` +
          `route=${event.payload.route} ` +
          `reason="${event.payload.reason}" ` +
          `routingDurationMs=${event.payload.routingDurationMs}`,
      );
    } catch (err) {
      this.logger.warn(`[${EVENT_TYPES.MESSAGE_ROUTED}] Listener error: ${(err as Error).message}`);
    }
  }

  @OnEvent(EVENT_TYPES.CONVERSATION_CREATED, { async: true })
  async onConversationCreated(event: ConversationCreatedEvent): Promise<void> {
    try {
      this.validateBaseFields(event);
      this.logger.log(
        `[${event.type}] eventId=${event.eventId} correlationId=${event.correlationId} tenantId=${event.tenantId} v=${event.eventVersion} ` +
          `conversationId=${event.payload.conversationId} ` +
          `contactId=${event.payload.contactId} ` +
          `channel=${event.payload.channelId}`,
      );
    } catch (err) {
      this.logger.warn(`[${EVENT_TYPES.CONVERSATION_CREATED}] Listener error: ${(err as Error).message}`);
    }
  }

  @OnEvent(EVENT_TYPES.CONVERSATION_CLOSED, { async: true })
  async onConversationClosed(event: ConversationClosedEvent): Promise<void> {
    try {
      this.validateBaseFields(event);
      this.logger.log(
        `[${event.type}] eventId=${event.eventId} correlationId=${event.correlationId} tenantId=${event.tenantId} v=${event.eventVersion} ` +
          `conversationId=${event.payload.conversationId} ` +
          `contactId=${event.payload.contactId} ` +
          `outcome=${event.payload.outcome} ` +
          `interactions=${event.payload.interactionCount} ` +
          `durationSeconds=${event.payload.durationSeconds}`,
      );
    } catch (err) {
      this.logger.warn(`[${EVENT_TYPES.CONVERSATION_CLOSED}] Listener error: ${(err as Error).message}`);
    }
  }

  @OnEvent(EVENT_TYPES.GOAL_ACHIEVED, { async: true })
  async onGoalAchieved(event: GoalAchievedEvent): Promise<void> {
    try {
      this.validateBaseFields(event);
      this.logger.log(
        `[${event.type}] eventId=${event.eventId} correlationId=${event.correlationId} tenantId=${event.tenantId} v=${event.eventVersion} ` +
          `goalId=${event.payload.goalId} ` +
          `goalType=${event.payload.goalType} ` +
          `conversationId=${event.payload.conversationId} ` +
          `contactId=${event.payload.contactId} ` +
          `durationSeconds=${event.payload.durationSeconds}`,
      );
    } catch (err) {
      this.logger.warn(`[${EVENT_TYPES.GOAL_ACHIEVED}] Listener error: ${(err as Error).message}`);
    }
  }

  // ── Private Helpers ──────────────────────────────────────────────────────────

  private validateBaseFields(event: unknown): void {
    if (!event || typeof event !== 'object') {
      throw new Error('Event is null or not an object');
    }
    const e = event as Record<string, unknown>;
    if (!e['eventId']) throw new Error('Missing required field: eventId');
    if (!e['correlationId']) throw new Error('Missing required field: correlationId');
    if (!e['tenantId']) throw new Error('Missing required field: tenantId');
    if (!e['timestamp']) throw new Error('Missing required field: timestamp');
    if (!e['type']) throw new Error('Missing required field: type');
    if (!e['metadata']) throw new Error('Missing required field: metadata');
    if (!e['payload']) throw new Error('Missing required field: payload');
  }
}
