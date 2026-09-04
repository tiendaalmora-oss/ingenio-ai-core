"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EventBusLoggingListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBusLoggingListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const event_types_constants_1 = require("../constants/event-types.constants");
const message_received_event_1 = require("../domain/events/message-received.event");
const message_routed_event_1 = require("../domain/events/message-routed.event");
const conversation_created_event_1 = require("../domain/events/conversation-created.event");
const conversation_closed_event_1 = require("../domain/events/conversation-closed.event");
const goal_achieved_event_1 = require("../domain/events/goal-achieved.event");
let EventBusLoggingListener = EventBusLoggingListener_1 = class EventBusLoggingListener {
    logger = new common_1.Logger(EventBusLoggingListener_1.name);
    async onMessageReceived(event) {
        try {
            this.validateBaseFields(event);
            this.logger.log(`[${event.type}] eventId=${event.eventId} correlationId=${event.correlationId} tenantId=${event.tenantId} v=${event.eventVersion} ` +
                `contactExternalId=${event.payload.contactExternalId} ` +
                `messageType=${event.payload.messageType} ` +
                `channel=${event.payload.channelId} ` +
                `preview="${event.payload.contentPreview}"`);
        }
        catch (err) {
            this.logger.warn(`[${event_types_constants_1.EVENT_TYPES.MESSAGE_RECEIVED}] Listener error: ${err.message}`);
        }
    }
    async onMessageRouted(event) {
        try {
            this.validateBaseFields(event);
            this.logger.log(`[${event.type}] eventId=${event.eventId} correlationId=${event.correlationId} tenantId=${event.tenantId} v=${event.eventVersion} ` +
                `messageId=${event.payload.messageId} ` +
                `route=${event.payload.route} ` +
                `reason="${event.payload.reason}" ` +
                `routingDurationMs=${event.payload.routingDurationMs}`);
        }
        catch (err) {
            this.logger.warn(`[${event_types_constants_1.EVENT_TYPES.MESSAGE_ROUTED}] Listener error: ${err.message}`);
        }
    }
    async onConversationCreated(event) {
        try {
            this.validateBaseFields(event);
            this.logger.log(`[${event.type}] eventId=${event.eventId} correlationId=${event.correlationId} tenantId=${event.tenantId} v=${event.eventVersion} ` +
                `conversationId=${event.payload.conversationId} ` +
                `contactId=${event.payload.contactId} ` +
                `channel=${event.payload.channelId}`);
        }
        catch (err) {
            this.logger.warn(`[${event_types_constants_1.EVENT_TYPES.CONVERSATION_CREATED}] Listener error: ${err.message}`);
        }
    }
    async onConversationClosed(event) {
        try {
            this.validateBaseFields(event);
            this.logger.log(`[${event.type}] eventId=${event.eventId} correlationId=${event.correlationId} tenantId=${event.tenantId} v=${event.eventVersion} ` +
                `conversationId=${event.payload.conversationId} ` +
                `contactId=${event.payload.contactId} ` +
                `outcome=${event.payload.outcome} ` +
                `interactions=${event.payload.interactionCount} ` +
                `durationSeconds=${event.payload.durationSeconds}`);
        }
        catch (err) {
            this.logger.warn(`[${event_types_constants_1.EVENT_TYPES.CONVERSATION_CLOSED}] Listener error: ${err.message}`);
        }
    }
    async onGoalAchieved(event) {
        try {
            this.validateBaseFields(event);
            this.logger.log(`[${event.type}] eventId=${event.eventId} correlationId=${event.correlationId} tenantId=${event.tenantId} v=${event.eventVersion} ` +
                `goalId=${event.payload.goalId} ` +
                `goalType=${event.payload.goalType} ` +
                `conversationId=${event.payload.conversationId} ` +
                `contactId=${event.payload.contactId} ` +
                `durationSeconds=${event.payload.durationSeconds}`);
        }
        catch (err) {
            this.logger.warn(`[${event_types_constants_1.EVENT_TYPES.GOAL_ACHIEVED}] Listener error: ${err.message}`);
        }
    }
    validateBaseFields(event) {
        if (!event || typeof event !== 'object') {
            throw new Error('Event is null or not an object');
        }
        const e = event;
        if (!e['eventId'])
            throw new Error('Missing required field: eventId');
        if (!e['correlationId'])
            throw new Error('Missing required field: correlationId');
        if (!e['tenantId'])
            throw new Error('Missing required field: tenantId');
        if (!e['timestamp'])
            throw new Error('Missing required field: timestamp');
        if (!e['type'])
            throw new Error('Missing required field: type');
        if (!e['metadata'])
            throw new Error('Missing required field: metadata');
        if (!e['payload'])
            throw new Error('Missing required field: payload');
    }
};
exports.EventBusLoggingListener = EventBusLoggingListener;
__decorate([
    (0, event_emitter_1.OnEvent)(event_types_constants_1.EVENT_TYPES.MESSAGE_RECEIVED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [message_received_event_1.MessageReceivedEvent]),
    __metadata("design:returntype", Promise)
], EventBusLoggingListener.prototype, "onMessageReceived", null);
__decorate([
    (0, event_emitter_1.OnEvent)(event_types_constants_1.EVENT_TYPES.MESSAGE_ROUTED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [message_routed_event_1.MessageRoutedEvent]),
    __metadata("design:returntype", Promise)
], EventBusLoggingListener.prototype, "onMessageRouted", null);
__decorate([
    (0, event_emitter_1.OnEvent)(event_types_constants_1.EVENT_TYPES.CONVERSATION_CREATED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [conversation_created_event_1.ConversationCreatedEvent]),
    __metadata("design:returntype", Promise)
], EventBusLoggingListener.prototype, "onConversationCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)(event_types_constants_1.EVENT_TYPES.CONVERSATION_CLOSED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [conversation_closed_event_1.ConversationClosedEvent]),
    __metadata("design:returntype", Promise)
], EventBusLoggingListener.prototype, "onConversationClosed", null);
__decorate([
    (0, event_emitter_1.OnEvent)(event_types_constants_1.EVENT_TYPES.GOAL_ACHIEVED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [goal_achieved_event_1.GoalAchievedEvent]),
    __metadata("design:returntype", Promise)
], EventBusLoggingListener.prototype, "onGoalAchieved", null);
exports.EventBusLoggingListener = EventBusLoggingListener = EventBusLoggingListener_1 = __decorate([
    (0, common_1.Injectable)()
], EventBusLoggingListener);
//# sourceMappingURL=event-bus-logging.listener.js.map