"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageRoutedEvent = void 0;
const base_event_1 = require("../../base-event");
class MessageRoutedEvent extends base_event_1.BaseEvent {
    constructor(correlationId, tenantId, payload, metadataOverrides) {
        super(base_event_1.EVENT_TYPES.MESSAGE_ROUTED, correlationId, tenantId, payload, metadataOverrides);
    }
}
exports.MessageRoutedEvent = MessageRoutedEvent;
//# sourceMappingURL=message-routed.event.js.map