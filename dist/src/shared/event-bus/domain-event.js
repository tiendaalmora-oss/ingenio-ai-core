"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainEvent = void 0;
class DomainEvent {
    tenantId;
    eventName;
    payload;
    eventId = crypto.randomUUID();
    occurredOn = new Date();
    constructor(tenantId, eventName, payload) {
        this.tenantId = tenantId;
        this.eventName = eventName;
        this.payload = payload;
    }
}
exports.DomainEvent = DomainEvent;
//# sourceMappingURL=domain-event.js.map