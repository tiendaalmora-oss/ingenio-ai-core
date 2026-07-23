"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationModule = void 0;
const common_1 = require("@nestjs/common");
const meta_webhook_controller_1 = require("./services/meta-webhook.controller");
const conversation_hub_controller_1 = require("./conversation-hub.controller");
const receive_message_service_1 = require("./services/receive-message.service");
const prisma_conversation_repository_1 = require("./services/prisma-conversation.repository");
const prisma_interaction_repository_1 = require("./services/prisma-interaction.repository");
const prisma_service_1 = require("../../shared/database/prisma.service");
const conversation_repository_interface_1 = require("./ports/out/conversation-repository.interface");
const interaction_repository_interface_1 = require("./ports/out/interaction-repository.interface");
let ConversationModule = class ConversationModule {
};
exports.ConversationModule = ConversationModule;
exports.ConversationModule = ConversationModule = __decorate([
    (0, common_1.Module)({
        imports: [],
        controllers: [meta_webhook_controller_1.MetaWebhookController, conversation_hub_controller_1.ConversationHubController],
        providers: [
            prisma_service_1.PrismaService,
            receive_message_service_1.ReceiveMessageService,
            {
                provide: conversation_repository_interface_1.CONVERSATION_REPOSITORY,
                useClass: prisma_conversation_repository_1.PrismaConversationRepository,
            },
            {
                provide: interaction_repository_interface_1.INTERACTION_REPOSITORY,
                useClass: prisma_interaction_repository_1.PrismaInteractionRepository,
            },
        ],
        exports: [],
    })
], ConversationModule);
//# sourceMappingURL=conversation.module.js.map