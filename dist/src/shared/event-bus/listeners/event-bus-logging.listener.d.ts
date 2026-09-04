import { MessageReceivedEvent } from '../domain/events/message-received.event';
import { MessageRoutedEvent } from '../domain/events/message-routed.event';
import { ConversationCreatedEvent } from '../domain/events/conversation-created.event';
import { ConversationClosedEvent } from '../domain/events/conversation-closed.event';
import { GoalAchievedEvent } from '../domain/events/goal-achieved.event';
export declare class EventBusLoggingListener {
    private readonly logger;
    onMessageReceived(event: MessageReceivedEvent): Promise<void>;
    onMessageRouted(event: MessageRoutedEvent): Promise<void>;
    onConversationCreated(event: ConversationCreatedEvent): Promise<void>;
    onConversationClosed(event: ConversationClosedEvent): Promise<void>;
    onGoalAchieved(event: GoalAchievedEvent): Promise<void>;
    private validateBaseFields;
}
