"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationCreatedEvent = void 0;
const base_event_1 = require("../../base-event");
class ConversationCreatedEvent extends base_event_1.BaseEvent {
    constructor(correlationId, tenantId, payload, metadataOverrides) {
        super(base_event_1.EVENT_TYPES.CONVERSATION_CREATED, correlationId, tenantId, payload, metadataOverrides);
    }
}
exports.ConversationCreatedEvent = ConversationCreatedEvent;
//# sourceMappingURL=conversation-created.event.js.map