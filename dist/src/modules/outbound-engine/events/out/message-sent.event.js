"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageSentEvent = void 0;
const domain_event_1 = require("../../../../shared/event-bus/domain-event");
class MessageSentEvent extends domain_event_1.DomainEvent {
    conversationId;
    messageId;
    channel;
    constructor(tenantId, conversationId, messageId, channel) {
        super(tenantId, 'message.sent', {
            conversationId,
            messageId,
            channel,
        });
        this.conversationId = conversationId;
        this.messageId = messageId;
        this.channel = channel;
    }
}
exports.MessageSentEvent = MessageSentEvent;
//# sourceMappingURL=message-sent.event.js.map