"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FakeEventTriggered = void 0;
const domain_event_1 = require("../../../../shared/event-bus/domain-event");
class FakeEventTriggered extends domain_event_1.DomainEvent {
    message;
    timestamp;
    constructor(tenantId, message, timestamp) {
        super(tenantId, 'fake.event.triggered', { message, timestamp });
        this.message = message;
        this.timestamp = timestamp;
    }
}
exports.FakeEventTriggered = FakeEventTriggered;
//# sourceMappingURL=fake.event.js.map