"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationClosedEvent = void 0;
const base_event_1 = require("../../base-event");
class ConversationClosedEvent extends base_event_1.BaseEvent {
    constructor(correlationId, tenantId, payload, metadataOverrides) {
        super(base_event_1.EVENT_TYPES.CONVERSATION_CLOSED, correlationId, tenantId, payload, metadataOverrides);
    }
}
exports.ConversationClosedEvent = ConversationClosedEvent;
//# sourceMappingURL=conversation-closed.event.js.map