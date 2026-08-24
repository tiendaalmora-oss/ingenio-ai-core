import { MockEventBus } from './mock-event-bus';
import { MessageReceivedEvent } from '../domain/events/message-received.event';
import { ConversationCreatedEvent } from '../domain/events/conversation-created.event';
import { EVENT_TYPES } from '../constants/event-types.constants';

describe('MockEventBus', () => {
  let mockBus: MockEventBus;

  beforeEach(() => {
    mockBus = new MockEventBus();
  });

  it('should capture published events', () => {
    const event = new MessageReceivedEvent('corr-1', 'tenant-1', {
      messageId: 'msg-1',
      channelId: 'whatsapp',
      contactExternalId: '521234567890@c.us',
      messageType: 'text',
      contentPreview: 'Hola',
      channelTimestamp: new Date().toISOString(),
    });

    mockBus.publish(event);

    expect(mockBus.count).toBe(1);
    expect(mockBus.getAll()).toHaveLength(1);
    expect(mockBus.getPublished(EVENT_TYPES.MESSAGE_RECEIVED)).toHaveLength(1);
  });

  it('should capture async published events', async () => {
    const event = new ConversationCreatedEvent('corr-2', 'tenant-1', {
      conversationId: 'conv-1',
      contactId: 'contact-1',
      channelId: 'whatsapp',
      createdAt: new Date().toISOString(),
    });

    await mockBus.publishAsync(event);

    expect(mockBus.count).toBe(1);
    expect(mockBus.getPublished(EVENT_TYPES.CONVERSATION_CREATED)).toHaveLength(1);
  });

  it('should filter events by type correctly', () => {
    mockBus.publish(
      new MessageReceivedEvent('corr-3', 'tenant-1', {
        messageId: 'msg-1',
        channelId: 'whatsapp',
        contactExternalId: '521@c.us',
        messageType: 'text',
        contentPreview: 'A',
        channelTimestamp: new Date().toISOString(),
      }),
    );
    mockBus.publish(
      new ConversationCreatedEvent('corr-4', 'tenant-1', {
        conversationId: 'conv-1',
        contactId: 'contact-1',
        channelId: 'whatsapp',
        createdAt: new Date().toISOString(),
      }),
    );

    expect(mockBus.getPublished(EVENT_TYPES.MESSAGE_RECEIVED)).toHaveLength(1);
    expect(mockBus.getPublished(EVENT_TYPES.CONVERSATION_CREATED)).toHaveLength(1);
    expect(mockBus.count).toBe(2);
  });

  it('getLastPublished should return the most recent event', () => {
    const e1 = new MessageReceivedEvent('corr-5', 'tenant-1', {
      messageId: 'msg-1',
      channelId: 'whatsapp',
      contactExternalId: '521@c.us',
      messageType: 'text',
      contentPreview: 'A',
      channelTimestamp: new Date().toISOString(),
    });
    const e2 = new ConversationCreatedEvent('corr-6', 'tenant-1', {
      conversationId: 'conv-1',
      contactId: 'contact-1',
      channelId: 'whatsapp',
      createdAt: new Date().toISOString(),
    });

    mockBus.publish(e1);
    mockBus.publish(e2);

    expect(mockBus.getLastPublished()?.type).toBe(EVENT_TYPES.CONVERSATION_CREATED);
  });

  it('clear() should remove all captured events', () => {
    mockBus.publish(
      new MessageReceivedEvent('corr-7', 'tenant-1', {
        messageId: 'msg-1',
        channelId: 'whatsapp',
        contactExternalId: '521@c.us',
        messageType: 'text',
        contentPreview: 'A',
        channelTimestamp: new Date().toISOString(),
      }),
    );

    expect(mockBus.count).toBe(1);
    mockBus.clear();
    expect(mockBus.count).toBe(0);
  });
});
