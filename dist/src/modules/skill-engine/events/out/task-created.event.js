"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskCreatedEvent = void 0;
const domain_event_1 = require("../../../../shared/event-bus/domain-event");
class TaskCreatedEvent extends domain_event_1.DomainEvent {
    contactId;
    taskDetails;
    constructor(tenantId, contactId, taskDetails) {
        super(tenantId, 'task.created', { contactId, taskDetails });
        this.contactId = contactId;
        this.taskDetails = taskDetails;
    }
}
exports.TaskCreatedEvent = TaskCreatedEvent;
//# sourceMappingURL=task-created.event.js.map