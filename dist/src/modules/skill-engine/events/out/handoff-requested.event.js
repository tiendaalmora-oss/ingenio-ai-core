"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandoffRequestedEvent = void 0;
const domain_event_1 = require("../../../../shared/event-bus/domain-event");
class HandoffRequestedEvent extends domain_event_1.DomainEvent {
    conversationId;
    reason;
    constructor(tenantId, conversationId, reason) {
        super(tenantId, 'handoff.requested', { conversationId, reason });
        this.conversationId = conversationId;
        this.reason = reason;
    }
}
exports.HandoffRequestedEvent = HandoffRequestedEvent;
//# sourceMappingURL=handoff-requested.event.js.map