"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseGeneratedEvent = void 0;
const domain_event_1 = require("../../../../shared/event-bus/domain-event");
class ResponseGeneratedEvent extends domain_event_1.DomainEvent {
    conversationId;
    generatedContent;
    constructor(tenantId, conversationId, generatedContent) {
        super(tenantId, 'response.generated', {
            conversationId,
            generatedContent,
        });
        this.conversationId = conversationId;
        this.generatedContent = generatedContent;
    }
}
exports.ResponseGeneratedEvent = ResponseGeneratedEvent;
//# sourceMappingURL=response-generated.event.js.map