"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageFailedEvent = void 0;
const domain_event_1 = require("../../../../shared/event-bus/domain-event");
class MessageFailedEvent extends domain_event_1.DomainEvent {
    conversationId;
    errorReason;
    channel;
    constructor(tenantId, conversationId, errorReason, channel) {
        super(tenantId, 'message.failed', {
            conversationId,
            errorReason,
            channel,
        });
        this.conversationId = conversationId;
        this.errorReason = errorReason;
        this.channel = channel;
    }
}
exports.MessageFailedEvent = MessageFailedEvent;
//# sourceMappingURL=message-failed.event.js.map