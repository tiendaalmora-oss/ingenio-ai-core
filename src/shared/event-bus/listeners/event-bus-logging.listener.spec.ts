import { EventBusLoggingListener } from './event-bus-logging.listener';
import { MessageReceivedEvent } from '../domain/events/message-received.event';
import { MessageRoutedEvent } from '../domain/events/message-routed.event';
import { ConversationCreatedEvent } from '../domain/events/conversation-created.event';
import { ConversationClosedEvent } from '../domain/events/conversation-closed.event';
import { GoalAchievedEvent } from '../domain/events/goal-achieved.event';

describe('EventBusLoggingListener', () => {
  let listener: EventBusLoggingListener;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    listener = new EventBusLoggingListener();
    // Access the private logger via any-cast — acceptable in unit tests
    const logger = (listener as any).logger;
    logSpy = jest.spyOn(logger, 'log').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── onMessageReceived ────────────────────────────────────────────────────────

  describe('onMessageReceived()', () => {
    it('should log the event without errors', async () => {
      const event = new MessageReceivedEvent('corr-1', 'tenant-1', {
        messageId: 'msg-1',
        channelId: 'whatsapp',
        contactExternalId: '521234567890@c.us',
        messageType: 'text',
        contentPreview: 'Hola',
        channelTimestamp: new Date().toISOString(),
      });

      await listener.onMessageReceived(event);

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should include contactExternalId in the log', async () => {
      const event = new MessageReceivedEvent('corr-1', 'tenant-1', {
        messageId: 'msg-1',
        channelId: 'whatsapp',
        contactExternalId: '521234567890@c.us',
        messageType: 'text',
        contentPreview: 'Hola',
        channelTimestamp: new Date().toISOString(),
      });

      await listener.onMessageReceived(event);

      const logLine = logSpy.mock.calls[0][0] as string;
      expect(logLine).toContain('521234567890@c.us');
      expect(logLine).toContain('corr-1');
    });

    it('should NOT log full user content (only preview)', async () => {
      const sensitiveContent = 'Mi número de tarjeta es 4111-1111-1111-1111';
      const event = new MessageReceivedEvent('corr-1', 'tenant-1', {
        messageId: 'msg-2',
        channelId: 'whatsapp',
        contactExternalId: '521234567890@c.us',
        messageType: 'text',
        contentPreview: sensitiveContent.substring(0, 20),
        channelTimestamp: new Date().toISOString(),
      });

      await listener.onMessageReceived(event);

      const logLine = logSpy.mock.calls[0][0] as string;
      // The full sensitive content should never appear in the log
      expect(logLine).not.toContain('4111-1111-1111-1111');
    });

    it('should not throw if event is malformed — should log a warning instead', async () => {
      await expect(
        listener.onMessageReceived(null as unknown as MessageReceivedEvent),
      ).resolves.not.toThrow();
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ── onMessageRouted ──────────────────────────────────────────────────────────

  describe('onMessageRouted()', () => {
    it('should log the routing decision', async () => {
      const event = new MessageRoutedEvent('corr-1', 'tenant-1', {
        messageId: 'msg-1',
        contactExternalId: '120363424203726380@g.us',
        route: 'IGNORE',
        reason: 'Group message',
        routingDurationMs: 1,
      });

      await listener.onMessageRouted(event);

      const logLine = logSpy.mock.calls[0][0] as string;
      expect(logLine).toContain('IGNORE');
      expect(logLine).toContain('Group message');
    });
  });

  // ── onConversationCreated ────────────────────────────────────────────────────

  describe('onConversationCreated()', () => {
    it('should log conversationId and contactId', async () => {
      const event = new ConversationCreatedEvent('corr-1', 'tenant-1', {
        conversationId: 'conv-uuid-1',
        contactId: 'contact-uuid-1',
        channelId: 'whatsapp',
        createdAt: new Date().toISOString(),
      });

      await listener.onConversationCreated(event);

      const logLine = logSpy.mock.calls[0][0] as string;
      expect(logLine).toContain('conv-uuid-1');
      expect(logLine).toContain('contact-uuid-1');
    });
  });

  // ── onConversationClosed ─────────────────────────────────────────────────────

  describe('onConversationClosed()', () => {
    it('should log outcome and durationSeconds', async () => {
      const event = new ConversationClosedEvent('corr-1', 'tenant-1', {
        conversationId: 'conv-uuid-2',
        contactId: 'contact-uuid-2',
        outcome: 'resolved',
        interactionCount: 5,
        openedAt: new Date(Date.now() - 30000).toISOString(),
        closedAt: new Date().toISOString(),
        durationSeconds: 30,
      });

      await listener.onConversationClosed(event);

      const logLine = logSpy.mock.calls[0][0] as string;
      expect(logLine).toContain('resolved');
      expect(logLine).toContain('30');
    });
  });

  // ── onGoalAchieved ───────────────────────────────────────────────────────────

  describe('onGoalAchieved()', () => {
    it('should log goalType', async () => {
      const event = new GoalAchievedEvent('corr-1', 'tenant-1', {
        goalId: 'goal-uuid-1',
        conversationId: 'conv-uuid-3',
        contactId: 'contact-uuid-3',
        goalType: 'CLOSE_SALE',
        durationSeconds: 240,
        achievedAt: new Date().toISOString(),
      });

      await listener.onGoalAchieved(event);

      const logLine = logSpy.mock.calls[0][0] as string;
      expect(logLine).toContain('CLOSE_SALE');
    });

    it('should handle malformed event gracefully', async () => {
      await expect(
        listener.onGoalAchieved({} as GoalAchievedEvent),
      ).resolves.not.toThrow();
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });
});
