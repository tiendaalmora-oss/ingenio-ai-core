"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryUpdatedEvent = void 0;
const domain_event_1 = require("../../../../shared/event-bus/domain-event");
class MemoryUpdatedEvent extends domain_event_1.DomainEvent {
    contactId;
    updates;
    constructor(tenantId, contactId, updates) {
        super(tenantId, 'memory.updated', { contactId, updates });
        this.contactId = contactId;
        this.updates = updates;
    }
}
exports.MemoryUpdatedEvent = MemoryUpdatedEvent;
//# sourceMappingURL=memory-updated.event.js.map