"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactCreatedEvent = void 0;
const domain_event_1 = require("../../../../shared/event-bus/domain-event");
class ContactCreatedEvent extends domain_event_1.DomainEvent {
    contactId;
    name;
    constructor(tenantId, contactId, name) {
        super(tenantId, 'crm.contact.created', { contactId, name });
        this.contactId = contactId;
        this.name = name;
    }
}
exports.ContactCreatedEvent = ContactCreatedEvent;
//# sourceMappingURL=contact-created.event.js.map