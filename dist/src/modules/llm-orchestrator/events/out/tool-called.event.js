"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolCalledEvent = void 0;
const domain_event_1 = require("../../../../shared/event-bus/domain-event");
class ToolCalledEvent extends domain_event_1.DomainEvent {
    conversationId;
    contactId;
    toolName;
    toolArguments;
    constructor(tenantId, conversationId, contactId, toolName, toolArguments) {
        super(tenantId, 'tool.called', {
            conversationId,
            contactId,
            toolName,
            toolArguments,
        });
        this.conversationId = conversationId;
        this.contactId = contactId;
        this.toolName = toolName;
        this.toolArguments = toolArguments;
    }
}
exports.ToolCalledEvent = ToolCalledEvent;
//# sourceMappingURL=tool-called.event.js.map