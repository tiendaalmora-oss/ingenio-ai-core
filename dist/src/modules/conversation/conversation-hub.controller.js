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
var ConversationHubController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationHubController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const waha_adapter_service_1 = require("../outbound-engine/services/waha-adapter.service");
const admin_api_key_guard_1 = require("../../shared/guards/admin-api-key.guard");
const tenant_guard_1 = require("../../shared/guards/tenant.guard");
const tenant_id_decorator_1 = require("../../shared/decorators/tenant-id.decorator");
let ConversationHubController = ConversationHubController_1 = class ConversationHubController {
    prisma;
    wahaAdapter;
    logger = new common_1.Logger(ConversationHubController_1.name);
    constructor(prisma, wahaAdapter) {
        this.prisma = prisma;
        this.wahaAdapter = wahaAdapter;
    }
    async listConversations(tenantId, page = '1', limit = '50', search, status) {
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId is required');
        await this.consolidateDuplicateConversations(tenantId);
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);
        const where = {};
        if (status)
            where.status = status;
        if (search && search.trim()) {
            const searchRaw = search.trim();
            const searchDigits = searchRaw.replace(/\D/g, '');
            const searchWithoutZero = searchDigits.startsWith('0') ? searchDigits.replace(/^0+/, '') : searchDigits;
            const searchWith58 = searchDigits.startsWith('58') ? searchDigits : (searchWithoutZero ? `58${searchWithoutZero}` : '');
            const searchOrClauses = [
                { contact: { name: { contains: searchRaw, mode: 'insensitive' } } },
                { contact: { phone: { contains: searchRaw, mode: 'insensitive' } } },
                { contact: { phoneNormalized: { contains: searchRaw, mode: 'insensitive' } } },
                { contact: { externalId: { contains: searchRaw, mode: 'insensitive' } } },
                { interactions: { some: { content: { contains: searchRaw, mode: 'insensitive' } } } },
            ];
            if (searchDigits.length >= 3) {
                searchOrClauses.push({ contact: { phone: { contains: searchDigits, mode: 'insensitive' } } }, { contact: { phoneNormalized: { contains: searchDigits, mode: 'insensitive' } } }, { contact: { externalId: { contains: searchDigits, mode: 'insensitive' } } });
            }
            if (searchWithoutZero && searchWithoutZero.length >= 4) {
                searchOrClauses.push({ contact: { phone: { contains: searchWithoutZero, mode: 'insensitive' } } }, { contact: { phoneNormalized: { contains: searchWithoutZero, mode: 'insensitive' } } }, { contact: { externalId: { contains: searchWithoutZero, mode: 'insensitive' } } });
            }
            if (searchWith58 && searchWith58.length >= 5) {
                searchOrClauses.push({ contact: { phone: { contains: searchWith58, mode: 'insensitive' } } }, { contact: { phoneNormalized: { contains: searchWith58, mode: 'insensitive' } } }, { contact: { externalId: { contains: searchWith58, mode: 'insensitive' } } });
            }
            where.AND = [
                { contact: { tenantId } },
                { OR: searchOrClauses },
            ];
        }
        else {
            where.contact = { tenantId };
        }
        const [total, rawConversations] = await Promise.all([
            this.prisma.conversation.count({ where }),
            this.prisma.conversation.findMany({
                where,
                include: {
                    contact: {
                        include: { memory: true },
                    },
                    interactions: {
                        orderBy: { timestamp: 'desc' },
                        take: 1,
                    },
                    _count: { select: { interactions: true } },
                },
            }),
        ]);
        const sortedConvs = rawConversations.sort((a, b) => {
            const timeA = a.interactions[0]?.timestamp ? new Date(a.interactions[0].timestamp).getTime() : 0;
            const timeB = b.interactions[0]?.timestamp ? new Date(b.interactions[0].timestamp).getTime() : 0;
            return timeB - timeA;
        });
        const paginatedConvs = sortedConvs.slice(skip, skip + take);
        const responseData = {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            data: paginatedConvs.map((c) => ({
                id: c.id,
                status: c.status,
                contactId: c.contactId,
                contactName: c.contact.name,
                contactPhone: c.contact.phone || c.contact.externalId,
                leadStatus: c.contact.memory?.leadStatus ?? null,
                tags: c.contact.memory?.tags ?? [],
                messageCount: c._count.interactions,
                lastMessage: c.interactions[0]
                    ? {
                        content: c.interactions[0].content,
                        direction: c.interactions[0].direction,
                        role: c.interactions[0].role,
                        timestamp: c.interactions[0].timestamp,
                    }
                    : null,
            })),
        };
        return responseData;
    }
    async consolidateDuplicateConversations(tenantId) {
        try {
            const contactsWithMultipleConvs = await this.prisma.contact.findMany({
                where: { tenantId },
                select: {
                    id: true,
                    conversations: {
                        select: { id: true, status: true },
                        orderBy: { id: 'desc' },
                    },
                },
            });
            for (const contact of contactsWithMultipleConvs) {
                if (contact.conversations && contact.conversations.length > 1) {
                    const masterConv = contact.conversations[0];
                    const duplicateConvs = contact.conversations.slice(1);
                    const duplicateIds = duplicateConvs.map((c) => c.id);
                    await this.prisma.interaction.updateMany({
                        where: { conversationId: { in: duplicateIds } },
                        data: { conversationId: masterConv.id },
                    });
                    await this.prisma.pendingOutboundMessage.updateMany({
                        where: { conversationId: { in: duplicateIds } },
                        data: { conversationId: masterConv.id },
                    });
                    await this.prisma.conversation.deleteMany({
                        where: { id: { in: duplicateIds } },
                    });
                    this.logger.log(`[Consolidation] Contacto ${contact.id} consolidó ${duplicateIds.length} conversaciones duplicadas en la conversación maestra ${masterConv.id}`);
                }
            }
        }
        catch (err) {
            this.logger.warn(`[Consolidation] Error consolidando conversaciones: ${err.message}`);
        }
    }
    async getConversation(id, tenantId) {
        const conv = await this.prisma.conversation.findFirst({
            where: { id, contact: { tenantId } },
            include: {
                contact: { include: { memory: true } },
                activeFunnel: true,
                _count: { select: { interactions: true } },
            },
        });
        if (!conv)
            throw new common_1.BadRequestException('Conversación no encontrada');
        return {
            id: conv.id,
            status: conv.status,
            contact: {
                id: conv.contact.id,
                name: conv.contact.name,
                phone: conv.contact.phone || conv.contact.externalId,
                leadStatus: conv.contact.memory?.leadStatus,
                company: conv.contact.memory?.company,
                interests: conv.contact.memory?.interests ?? [],
                objections: conv.contact.memory?.objections ?? [],
                tags: conv.contact.memory?.tags ?? [],
                lastInteraction: conv.contact.memory?.lastInteraction,
            },
            activeFunnel: conv.activeFunnel
                ? { funnelId: conv.activeFunnel.funnelId, step: conv.activeFunnel.currentStepId }
                : null,
            messageCount: conv._count.interactions,
        };
    }
    async getMessages(id, tenantId, page = '1', limit = '100') {
        const conv = await this.prisma.conversation.findFirst({
            where: { id, contact: { tenantId } },
        });
        if (!conv)
            throw new common_1.BadRequestException('Conversación no encontrada');
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);
        const [total, messages] = await Promise.all([
            this.prisma.interaction.count({
                where: { conversationId: id, type: { notIn: ['TOOL_RESULT'] } },
            }),
            this.prisma.interaction.findMany({
                where: { conversationId: id, type: { notIn: ['TOOL_RESULT'] } },
                orderBy: { timestamp: 'asc' },
                skip,
                take,
            }),
        ]);
        return {
            total,
            page: parseInt(page),
            data: messages.map((m) => ({
                id: m.id,
                direction: m.direction,
                type: m.type,
                content: m.content,
                role: m.role,
                timestamp: m.timestamp,
                toolCalls: m.toolCalls,
            })),
        };
    }
    async sendManualMessage(id, tenantId, body) {
        if (!body.content || !body.content.trim()) {
            throw new common_1.BadRequestException('El contenido del mensaje es requerido');
        }
        const conv = await this.prisma.conversation.findFirst({
            where: { id, contact: { tenantId } },
            include: { contact: true },
        });
        if (!conv)
            throw new common_1.BadRequestException('Conversación no encontrada');
        const targetContactId = conv.contact.externalId || conv.contact.phone || '';
        if (!targetContactId) {
            throw new common_1.BadRequestException('El contacto no tiene un identificador de WhatsApp válido');
        }
        const interaction = await this.prisma.interaction.create({
            data: {
                conversationId: conv.id,
                direction: 'OUTBOUND',
                type: 'TEXT',
                content: body.content,
                role: 'human',
            },
        });
        await this.prisma.conversation.update({
            where: { id: conv.id },
            data: { status: 'HANDOFF' },
        });
        try {
            await this.wahaAdapter.sendMessage(tenantId, targetContactId, body.content);
        }
        catch (err) {
            this.logger.error(`Error enviando mensaje manual a WAHA: ${err.message}`);
        }
        return {
            success: true,
            messageId: interaction.id,
            content: interaction.content,
            timestamp: interaction.timestamp,
        };
    }
    async deleteMessage(id, messageId, tenantId) {
        const conv = await this.prisma.conversation.findFirst({
            where: { id, contact: { tenantId } },
        });
        if (!conv)
            throw new common_1.BadRequestException('Conversación no encontrada');
        const interaction = await this.prisma.interaction.findFirst({
            where: { id: messageId, conversationId: id },
        });
        if (!interaction)
            throw new common_1.BadRequestException('Mensaje no encontrado');
        await this.prisma.interaction.delete({
            where: { id: messageId },
        });
        this.logger.log(`[ConversationHub] Mensaje ${messageId} eliminado por el operador en conversación ${id}`);
        return {
            success: true,
            message: 'Mensaje eliminado correctamente del historial',
        };
    }
    async updateStatus(id, tenantId, body) {
        if (!body.status)
            throw new common_1.BadRequestException('status is required');
        const updated = await this.prisma.conversation.updateMany({
            where: { id, contact: { tenantId } },
            data: { status: body.status },
        });
        if (['HANDOFF', 'PAUSED', 'LOST', 'RESOLVED'].includes(body.status.toUpperCase())) {
            await this.prisma.pendingOutboundMessage.deleteMany({
                where: { conversationId: id, status: 'PENDING' },
            });
            this.logger.log(`Cancelados seguimientos pendientes por cambio de estado a "${body.status}" en conversación ${id}`);
        }
        return { success: true, count: updated.count };
    }
    async resetHistory(id, tenantId) {
        const conv = await this.prisma.conversation.findFirst({
            where: { id, contact: { tenantId } },
            include: { contact: true },
        });
        if (!conv) {
            throw new common_1.BadRequestException(`Conversación "${id}" no encontrada.`);
        }
        await this.prisma.interaction.deleteMany({
            where: { conversationId: conv.id },
        });
        if (conv.contactId) {
            await this.prisma.businessMemory.deleteMany({
                where: { contactId: conv.contactId },
            });
            await this.prisma.memoryAuditLog.deleteMany({
                where: { contactId: conv.contactId },
            });
            await this.prisma.task.deleteMany({
                where: { contactId: conv.contactId },
            });
            await this.prisma.pendingOutboundMessage.deleteMany({
                where: { contactId: conv.contactId },
            });
        }
        await this.prisma.conversation.update({
            where: { id: conv.id },
            data: { status: 'NEW' },
        });
        this.logger.log(`🧹 Historial, memoria y seguimientos reiniciados para la conversación ${id} (Contacto: ${conv.contact.name || conv.contact.externalId})`);
        return { success: true, conversationId: conv.id, message: 'Historial y memoria reiniciados correctamente' };
    }
    async purgeContact(id, tenantId) {
        const conv = await this.prisma.conversation.findFirst({
            where: { id, contact: { tenantId } },
            include: { contact: true },
        });
        if (!conv) {
            throw new common_1.BadRequestException(`Conversación "${id}" no encontrada.`);
        }
        const contactId = conv.contactId;
        if (contactId) {
            const allConvs = await this.prisma.conversation.findMany({ where: { contactId } });
            const convIds = allConvs.map(c => c.id);
            if (convIds.length > 0) {
                await this.prisma.interaction.deleteMany({ where: { conversationId: { in: convIds } } });
                await this.prisma.activeFunnel.deleteMany({ where: { conversationId: { in: convIds } } });
                await this.prisma.conversation.deleteMany({ where: { id: { in: convIds } } });
            }
            await this.prisma.task.deleteMany({ where: { contactId } });
            await this.prisma.memoryAuditLog.deleteMany({ where: { contactId } });
            await this.prisma.businessMemory.deleteMany({ where: { contactId } });
            await this.prisma.pendingOutboundMessage.deleteMany({ where: { contactId } });
            await this.prisma.contact.delete({ where: { id: contactId } });
        }
        this.logger.log(`🧨 Contacto ${contactId} (${conv.contact.name || conv.contact.phone}) y toda su data eliminados por completo.`);
        return { success: true, contactId, message: 'Contacto y toda su información eliminados por completo' };
    }
};
exports.ConversationHubController = ConversationHubController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, tenant_id_decorator_1.TenantId)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('search')),
    __param(4, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], ConversationHubController.prototype, "listConversations", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ConversationHubController.prototype, "getConversation", null);
__decorate([
    (0, common_1.Get)(':id/messages'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_id_decorator_1.TenantId)()),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ConversationHubController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Post)(':id/messages'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_id_decorator_1.TenantId)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ConversationHubController.prototype, "sendManualMessage", null);
__decorate([
    (0, common_1.Delete)(':id/messages/:messageId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('messageId')),
    __param(2, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ConversationHubController.prototype, "deleteMessage", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_id_decorator_1.TenantId)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ConversationHubController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Delete)(':id/history'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ConversationHubController.prototype, "resetHistory", null);
__decorate([
    (0, common_1.Delete)(':id/purge-contact'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ConversationHubController.prototype, "purgeContact", null);
exports.ConversationHubController = ConversationHubController = ConversationHubController_1 = __decorate([
    (0, common_1.Controller)('conversations'),
    (0, common_1.UseGuards)(admin_api_key_guard_1.AdminApiKeyGuard, tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        waha_adapter_service_1.WahaAdapterService])
], ConversationHubController);
//# sourceMappingURL=conversation-hub.controller.js.map