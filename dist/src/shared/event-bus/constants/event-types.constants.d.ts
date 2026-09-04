export declare const EVENT_TYPES: {
    readonly MESSAGE_RECEIVED: "message.received";
    readonly MESSAGE_ROUTED: "message.routed";
    readonly CONVERSATION_CREATED: "conversation.created";
    readonly CONVERSATION_CLOSED: "conversation.closed";
    readonly GOAL_ACHIEVED: "goal.achieved";
};
export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
