"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolCalledEvent = void 0;
const domain_event_1 = require("../../../../shared/event-bus/domain-event");
class ToolCalledEvent extends domain_event_1.DomainEvent {
    conversationId;
    contactId;
    toolCallId;
    toolName;
    toolArguments;
    constructor(tenantId, conversationId, contactId, toolCallId, toolName, toolArguments) {
        super(tenantId, 'tool.called', {
            conversationId,
            contactId,
            toolCallId,
            toolName,
            toolArguments,
        });
        this.conversationId = conversationId;
        this.contactId = contactId;
        this.toolCallId = toolCallId;
        this.toolName = toolName;
        this.toolArguments = toolArguments;
    }
}
exports.ToolCalledEvent = ToolCalledEvent;
//# sourceMappingURL=tool-called.event.js.map