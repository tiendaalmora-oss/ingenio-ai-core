"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageReceivedEvent = void 0;
const base_event_1 = require("../../base-event");
class MessageReceivedEvent extends base_event_1.BaseEvent {
    constructor(correlationId, tenantId, payload, metadataOverrides) {
        super(base_event_1.EVENT_TYPES.MESSAGE_RECEIVED, correlationId, tenantId, payload, metadataOverrides);
    }
}
exports.MessageReceivedEvent = MessageReceivedEvent;
//# sourceMappingURL=message-received.event.js.map