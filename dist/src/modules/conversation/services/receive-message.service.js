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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ReceiveMessageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiveMessageService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const crypto_1 = require("crypto");
const conversation_repository_interface_1 = require("../ports/out/conversation-repository.interface");
const interaction_repository_interface_1 = require("../ports/out/interaction-repository.interface");
const conversation_entity_1 = require("../entities/conversation.entity");
const interaction_entity_1 = require("../entities/interaction.entity");
const interaction_received_event_1 = require("../events/out/interaction-received.event");
const conversation_updated_event_1 = require("../events/out/conversation-updated.event");
let ReceiveMessageService = ReceiveMessageService_1 = class ReceiveMessageService {
    conversationRepo;
    interactionRepo;
    eventEmitter;
    logger = new common_1.Logger(ReceiveMessageService_1.name);
    recentMessages = new Map();
    constructor(conversationRepo, interactionRepo, eventEmitter) {
        this.conversationRepo = conversationRepo;
        this.interactionRepo = interactionRepo;
        this.eventEmitter = eventEmitter;
    }
    async execute(tenantId, externalId, content, pushName) {
        const dedupeKey = `${tenantId}:${externalId}:${content.trim()}`;
        const now = Date.now();
        const lastSeen = this.recentMessages.get(dedupeKey);
        if (lastSeen && (now - lastSeen) < 4000) {
            this.logger.warn(`Ignorando mensaje duplicado recibido en <4s para ${externalId}: "${content.substring(0, 30)}..."`);
            return;
        }
        this.recentMessages.set(dedupeKey, now);
        if (this.recentMessages.size > 500) {
            for (const [k, ts] of this.recentMessages.entries()) {
                if (now - ts > 30000)
                    this.recentMessages.delete(k);
            }
        }
        this.logger.debug(`ReceiveMessageService executing for tenant=${tenantId} externalId=${externalId}`);
        const contactUuid = await this.conversationRepo.ensureContactExists(tenantId, externalId, pushName);
        this.logger.debug(`Contact resolved: uuid=${contactUuid} externalId=${externalId}`);
        let conversation = await this.conversationRepo.findActiveByContact(contactUuid);
        let conversationCreated = false;
        if (!conversation) {
            conversation = new conversation_entity_1.Conversation((0, crypto_1.randomUUID)(), contactUuid, 'NEW');
            conversationCreated = true;
        }
        await this.conversationRepo.save(conversation);
        this.logger.debug(`Conversation ${conversationCreated ? 'created' : 'found'}: ${conversation.id}`);
        if (conversationCreated) {
            this.eventEmitter.emit('conversation.updated', new conversation_updated_event_1.ConversationUpdatedEvent(tenantId, conversation.id, conversation.status));
        }
        const interaction = new interaction_entity_1.Interaction((0, crypto_1.randomUUID)(), conversation.id, 'INBOUND', 'TEXT', content, new Date());
        await this.interactionRepo.save(interaction);
        this.logger.debug(`Interaction ${interaction.id} persisted`);
        this.eventEmitter.emit('interaction.received', new interaction_received_event_1.InteractionReceivedEvent(tenantId, conversation.id, interaction.id, contactUuid, content));
        this.logger.log(`Interaction ${interaction.id} received and broadcasted.`);
        this.logger.debug(`Conversation Hub updated: interactionId=${interaction.id}`);
    }
};
exports.ReceiveMessageService = ReceiveMessageService;
exports.ReceiveMessageService = ReceiveMessageService = ReceiveMessageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(conversation_repository_interface_1.CONVERSATION_REPOSITORY)),
    __param(1, (0, common_1.Inject)(interaction_repository_interface_1.INTERACTION_REPOSITORY)),
    __metadata("design:paramtypes", [Object, Object, event_emitter_1.EventEmitter2])
], ReceiveMessageService);
//# sourceMappingURL=receive-message.service.js.map