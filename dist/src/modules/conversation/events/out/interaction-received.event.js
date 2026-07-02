"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InteractionReceivedEvent = void 0;
const domain_event_1 = require("../../../../shared/event-bus/domain-event");
class InteractionReceivedEvent extends domain_event_1.DomainEvent {
    conversationId;
    interactionId;
    contactId;
    content;
    constructor(tenantId, conversationId, interactionId, contactId, content) {
        super(tenantId, 'interaction.received', {
            conversationId,
            interactionId,
            contactId,
            content,
        });
        this.conversationId = conversationId;
        this.interactionId = interactionId;
        this.contactId = contactId;
        this.content = content;
    }
}
exports.InteractionReceivedEvent = InteractionReceivedEvent;
//# sourceMappingURL=interaction-received.event.js.map