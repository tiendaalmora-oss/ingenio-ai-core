"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Interaction = void 0;
class Interaction {
    id;
    conversationId;
    direction;
    type;
    content;
    timestamp;
    constructor(id, conversationId, direction, type, content, timestamp) {
        this.id = id;
        this.conversationId = conversationId;
        this.direction = direction;
        this.type = type;
        this.content = content;
        this.timestamp = timestamp;
    }
}
exports.Interaction = Interaction;
//# sourceMappingURL=interaction.entity.js.map