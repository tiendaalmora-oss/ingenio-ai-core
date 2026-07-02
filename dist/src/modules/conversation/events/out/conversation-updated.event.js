"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationUpdatedEvent = void 0;
const domain_event_1 = require("../../../../shared/event-bus/domain-event");
class ConversationUpdatedEvent extends domain_event_1.DomainEvent {
    conversationId;
    status;
    constructor(tenantId, conversationId, status) {
        super(tenantId, 'conversation.updated', {
            conversationId,
            status,
        });
        this.conversationId = conversationId;
        this.status = status;
    }
}
exports.ConversationUpdatedEvent = ConversationUpdatedEvent;
//# sourceMappingURL=conversation-updated.event.js.map