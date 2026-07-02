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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaConversationRepository = void 0;
const common_1 = require("@nestjs/common");
const conversation_entity_1 = require("../entities/conversation.entity");
const prisma_service_1 = require("../../../shared/database/prisma.service");
let PrismaConversationRepository = class PrismaConversationRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findById(id) {
        const raw = await this.prisma.conversation.findUnique({ where: { id } });
        if (!raw)
            return null;
        return new conversation_entity_1.Conversation(raw.id, raw.contactId, raw.status);
    }
    async findActiveByContact(contactId) {
        const raw = await this.prisma.conversation.findFirst({
            where: {
                contactId,
                status: { in: ['NEW', 'ACTIVE'] },
            },
        });
        if (!raw)
            return null;
        return new conversation_entity_1.Conversation(raw.id, raw.contactId, raw.status);
    }
    async ensureContactExists(tenantId, contactId) {
        await this.prisma.contact.upsert({
            where: { id: contactId },
            update: {},
            create: {
                id: contactId,
                name: contactId,
                tenant: {
                    connectOrCreate: {
                        where: { id: tenantId },
                        create: { id: tenantId, name: 'Default Tenant' },
                    },
                },
            },
        });
    }
    async save(conversation) {
        await this.prisma.conversation.upsert({
            where: { id: conversation.id },
            update: {
                status: conversation.status,
            },
            create: {
                id: conversation.id,
                contactId: conversation.contactId,
                status: conversation.status,
            },
        });
    }
};
exports.PrismaConversationRepository = PrismaConversationRepository;
exports.PrismaConversationRepository = PrismaConversationRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaConversationRepository);
//# sourceMappingURL=prisma-conversation.repository.js.map