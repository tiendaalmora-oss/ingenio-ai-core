"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Conversation = void 0;
class Conversation {
    id;
    contactId;
    status;
    constructor(id, contactId, status) {
        this.id = id;
        this.contactId = contactId;
        this.status = status;
    }
    updateStatus(newStatus) {
        this.status = newStatus;
    }
}
exports.Conversation = Conversation;
//# sourceMappingURL=conversation.entity.js.map