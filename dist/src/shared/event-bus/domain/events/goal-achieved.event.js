"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalAchievedEvent = void 0;
const base_event_1 = require("../../base-event");
class GoalAchievedEvent extends base_event_1.BaseEvent {
    constructor(correlationId, tenantId, payload, metadataOverrides) {
        super(base_event_1.EVENT_TYPES.GOAL_ACHIEVED, correlationId, tenantId, payload, metadataOverrides);
    }
}
exports.GoalAchievedEvent = GoalAchievedEvent;
//# sourceMappingURL=goal-achieved.event.js.map