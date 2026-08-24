/**
 * EVENT BUS — Constants
 *
 * Single source of truth for all event type names.
 * Using dot-notation because EventEmitter2 is configured with wildcard + delimiter='.'.
 * This allows listeners to subscribe with 'message.*' or 'conversation.*' patterns.
 *
 * IMPORTANT: Never use raw strings for event names elsewhere in the codebase.
 * Always reference these constants to prevent typos and enable refactoring.
 */
export const EVENT_TYPES = {
  // ── Message Lifecycle ────────────────────────────────────────────────────────
  /** Fired by Channels Layer when a normalized inbound message is received. */
  MESSAGE_RECEIVED: 'message.received',

  /** Fired by Decision Engine (Phase 1) after routing classification. */
  MESSAGE_ROUTED: 'message.routed',

  // ── Conversation Lifecycle ───────────────────────────────────────────────────
  /** Fired by Conversation Engine when a new Conversation is created. */
  CONVERSATION_CREATED: 'conversation.created',

  /** Fired by Conversation Engine when a Conversation is resolved/closed. */
  CONVERSATION_CLOSED: 'conversation.closed',

  // ── Goal Lifecycle (Phase 1 — Goal Engine) ──────────────────────────────────
  /** Fired by Goal Engine when a ConversationGoal is marked as achieved. */
  GOAL_ACHIEVED: 'goal.achieved',
} as const;

/** Union type of all valid event type strings. */
export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
