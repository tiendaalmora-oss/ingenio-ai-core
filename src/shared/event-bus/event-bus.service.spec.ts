import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBusService } from './event-bus.service';
import { MessageReceivedEvent } from './domain/events/message-received.event';
import { MessageRoutedEvent } from './domain/events/message-routed.event';
import { ConversationCreatedEvent } from './domain/events/conversation-created.event';
import { ConversationClosedEvent } from './domain/events/conversation-closed.event';
import { GoalAchievedEvent } from './domain/events/goal-achieved.event';
import { EVENT_TYPES } from './constants/event-types.constants';
import { IEvent } from './interfaces/event.interface';

describe('EventBusService', () => {
  let service: EventBusService;
  let emitter: EventEmitter2;
  let emitSpy: jest.SpyInstance;
  let emitAsyncSpy: jest.SpyInstance;

  beforeEach(() => {
    emitter = new EventEmitter2({ wildcard: true, delimiter: '.' });
    service = new EventBusService(emitter);
    emitSpy = jest.spyOn(emitter, 'emit');
    emitAsyncSpy = jest.spyOn(emitter, 'emitAsync').mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── publish() ───────────────────────────────────────────────────────────────

  describe('publish()', () => {
    it('should call emitter.emit with the correct event type', () => {
      const event = new MessageReceivedEvent('corr-1', 'tenant-1', {
        messageId: 'msg-1',
        channelId: 'whatsapp',
        contactExternalId: '521234567890@c.us',
        messageType: 'text',
        contentPreview: 'Hola, ¿tienen el producto X?',
        channelTimestamp: new Date().toISOString(),
      });

      service.publish(event);

      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy).toHaveBeenCalledWith(EVENT_TYPES.MESSAGE_RECEIVED, event);
    });

    it('should pass the complete event object to the emitter', () => {
      const event = new ConversationCreatedEvent('corr-2', 'tenant-2', {
        conversationId: 'conv-uuid-1',
        contactId: 'contact-uuid-1',
        channelId: 'whatsapp',
        createdAt: new Date().toISOString(),
      });

      service.publish(event);

      const [, emittedEvent] = emitSpy.mock.calls[0] as [string, IEvent];
      expect(emittedEvent.tenantId).toBe('tenant-2');
      expect(emittedEvent.correlationId).toBe('corr-2');
      expect(emittedEvent.payload).toEqual(event.payload);
    });
  });

  // ── publishAsync() ──────────────────────────────────────────────────────────

  describe('publishAsync()', () => {
    it('should call emitter.emitAsync with the correct event type', async () => {
      const event = new ConversationClosedEvent('corr-3', 'tenant-3', {
        conversationId: 'conv-uuid-2',
        contactId: 'contact-uuid-2',
        outcome: 'resolved',
        interactionCount: 8,
        openedAt: new Date(Date.now() - 60000).toISOString(),
        closedAt: new Date().toISOString(),
        durationSeconds: 60,
      });

      await service.publishAsync(event);

      expect(emitAsyncSpy).toHaveBeenCalledTimes(1);
      expect(emitAsyncSpy).toHaveBeenCalledWith(EVENT_TYPES.CONVERSATION_CLOSED, event);
    });

    it('should return a promise', async () => {
      const event = new GoalAchievedEvent('corr-4', 'tenant-4', {
        goalId: 'goal-uuid-1',
        conversationId: 'conv-uuid-3',
        contactId: 'contact-uuid-3',
        goalType: 'QUALIFY_LEAD',
        durationSeconds: 180,
        achievedAt: new Date().toISOString(),
      });

      const result = service.publishAsync(event);
      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toBeUndefined();
    });
  });

  // ── Event Structure Validation ───────────────────────────────────────────────

  describe('Event contracts', () => {
    it('MessageReceivedEvent should have all required IEvent fields', () => {
      const event = new MessageReceivedEvent('corr-test', 'tenant-test', {
        messageId: 'msg-x',
        channelId: 'whatsapp',
        contactExternalId: '521111111111@c.us',
        messageType: 'text',
        contentPreview: 'Test message',
        channelTimestamp: new Date().toISOString(),
      });

      expect(event.eventId).toBeDefined();
      expect(typeof event.eventId).toBe('string');
      expect(event.correlationId).toBe('corr-test');
      expect(event.eventId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(event.tenantId).toBe('tenant-test');
      expect(event.type).toBe(EVENT_TYPES.MESSAGE_RECEIVED);
      expect(event.timestamp).toBeDefined();
      expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp);
      expect(event.payload).toBeDefined();
      expect(event.eventVersion).toBe(1);
      expect(event.metadata).toBeDefined();
      expect(event.metadata.source).toBe('ingenio-ai-core');
    });

    it('two MessageReceivedEvents should have different eventIds', () => {
      const makeEvent = () =>
        new MessageReceivedEvent('corr-test', 'tenant-test', {
          messageId: 'msg-x',
          channelId: 'whatsapp',
          contactExternalId: '521111111111@c.us',
          messageType: 'text',
          contentPreview: 'Test',
          channelTimestamp: new Date().toISOString(),
        });

      const e1 = makeEvent();
      const e2 = makeEvent();
      expect(e1.eventId).not.toBe(e2.eventId);
    });

    it('MessageRoutedEvent should carry correct route and reason', () => {
      const event = new MessageRoutedEvent('corr-test', 'tenant-test', {
        messageId: 'msg-y',
        contactExternalId: '120363424203726380@g.us',
        route: 'IGNORE',
        reason: 'Group message — @g.us suffix',
        routingDurationMs: 2,
      });

      expect(event.type).toBe(EVENT_TYPES.MESSAGE_ROUTED);
      expect(event.payload.route).toBe('IGNORE');
      expect(event.payload.reason).toBe('Group message — @g.us suffix');
    });

    it('ConversationCreatedEvent should carry conversationId and contactId', () => {
      const event = new ConversationCreatedEvent('corr-test', 'tenant-test', {
        conversationId: 'conv-1',
        contactId: 'contact-1',
        channelId: 'whatsapp',
        createdAt: new Date().toISOString(),
      });

      expect(event.type).toBe(EVENT_TYPES.CONVERSATION_CREATED);
      expect(event.payload.conversationId).toBe('conv-1');
      expect(event.payload.contactId).toBe('contact-1');
    });

    it('ConversationClosedEvent should carry outcome and duration', () => {
      const event = new ConversationClosedEvent('corr-test', 'tenant-test', {
        conversationId: 'conv-2',
        contactId: 'contact-2',
        outcome: 'escalated',
        interactionCount: 3,
        openedAt: new Date(Date.now() - 120000).toISOString(),
        closedAt: new Date().toISOString(),
        durationSeconds: 120,
      });

      expect(event.type).toBe(EVENT_TYPES.CONVERSATION_CLOSED);
      expect(event.payload.outcome).toBe('escalated');
      expect(event.payload.durationSeconds).toBe(120);
      expect(event.payload.interactionCount).toBe(3);
    });

    it('GoalAchievedEvent should carry goalType and durationSeconds', () => {
      const event = new GoalAchievedEvent('corr-test', 'tenant-test', {
        goalId: 'goal-1',
        conversationId: 'conv-3',
        contactId: 'contact-3',
        goalType: 'CLOSE_SALE',
        durationSeconds: 300,
        achievedAt: new Date().toISOString(),
      });

      expect(event.type).toBe(EVENT_TYPES.GOAL_ACHIEVED);
      expect(event.payload.goalType).toBe('CLOSE_SALE');
      expect(event.payload.durationSeconds).toBe(300);
    });
  });

  // ── tenantId Isolation ───────────────────────────────────────────────────────

  describe('Tenant isolation', () => {
    it('should preserve tenantId on the emitted event', () => {
      const TENANT = 'tenant-isolated-abc';
      const event = new MessageReceivedEvent('corr-test', TENANT, {
        messageId: 'msg-z',
        channelId: 'whatsapp',
        contactExternalId: '521234567890@c.us',
        messageType: 'text',
        contentPreview: 'Test',
        channelTimestamp: new Date().toISOString(),
      });

      service.publish(event);

      const [, emittedEvent] = emitSpy.mock.calls[0] as [string, IEvent];
      expect(emittedEvent.tenantId).toBe(TENANT);
    });
  });
});
