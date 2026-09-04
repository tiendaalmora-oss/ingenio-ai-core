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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrmController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const admin_api_key_guard_1 = require("../../shared/guards/admin-api-key.guard");
const tenant_guard_1 = require("../../shared/guards/tenant.guard");
const tenant_id_decorator_1 = require("../../shared/decorators/tenant-id.decorator");
const KANBAN_STAGES = ['Nuevo', 'Contactado', 'Interesado', 'Demo', 'Oferta', 'Venta', 'Cliente'];
function computeScore(memory, convCount, interactionCount) {
    let score = 30;
    if (memory?.interests?.length > 0)
        score += 15;
    if (memory?.company)
        score += 10;
    if (memory?.leadStatus === 'HOT')
        score += 25;
    if (memory?.leadStatus === 'WARM')
        score += 15;
    if (memory?.objections?.length === 0)
        score += 10;
    if (convCount > 1)
        score += 5;
    if (interactionCount > 10)
        score += 10;
    if (memory?.lastInteraction) {
        const daysSince = (Date.now() - new Date(memory.lastInteraction).getTime()) / 86400000;
        if (daysSince > 7)
            score -= 10;
        if (daysSince > 30)
            score -= 20;
    }
    return Math.max(0, Math.min(100, score));
}
let CrmController = class CrmController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getLeads(tenantId, search, stage, page = '1', limit = '100') {
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId is required');
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);
        const where = { tenantId };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { memory: { company: { contains: search, mode: 'insensitive' } } },
            ];
        }
        const contacts = await this.prisma.contact.findMany({
            where,
            skip,
            take,
            orderBy: { id: 'desc' },
            include: {
                memory: true,
                conversations: {
                    include: {
                        _count: { select: { interactions: true } },
                        activeFunnel: true,
                        interactions: {
                            orderBy: { timestamp: 'desc' },
                            take: 1,
                        },
                    },
                },
                tasks: { where: { status: 'PENDING' }, take: 3 },
            },
        });
        const total = await this.prisma.contact.count({ where });
        const leads = contacts.map((c) => {
            const totalInteractions = c.conversations.reduce((sum, conv) => sum + conv._count.interactions, 0);
            const lastMsg = c.conversations
                .flatMap((cv) => cv.interactions)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
            const score = computeScore(c.memory, c.conversations.length, totalInteractions);
            const activeFunnel = c.conversations.find((cv) => cv.activeFunnel)?.activeFunnel;
            let hoursSinceLastContact = null;
            if (c.memory?.lastInteraction) {
                hoursSinceLastContact = Math.floor((Date.now() - new Date(c.memory.lastInteraction).getTime()) / 3600000);
            }
            const statusToStage = {
                NEW: 'Nuevo',
                COLD: 'Nuevo',
                CONTACTED: 'Contactado',
                WARM: 'Interesado',
                HOT: 'Oferta',
                DEMO: 'Demo',
                OFFER: 'Oferta',
                SALE: 'Venta',
                CLOSED: 'Venta',
                CLIENT: 'Cliente',
                PAGADO: 'Venta',
            };
            const kanbanStage = statusToStage[c.memory?.leadStatus ?? ''] ??
                (c.conversations.length > 0 ? 'Contactado' : 'Nuevo');
            return {
                id: c.id,
                name: c.name,
                phone: c.phone,
                company: c.memory?.company ?? null,
                leadStatus: c.memory?.leadStatus ?? 'NEW',
                kanbanStage,
                score,
                interests: c.memory?.interests ?? [],
                objections: c.memory?.objections ?? [],
                tags: c.memory?.tags ?? [],
                lastInteraction: c.memory?.lastInteraction ?? null,
                hoursSinceLastContact,
                conversationCount: c.conversations.length,
                interactionCount: totalInteractions,
                activeFunnelId: activeFunnel?.funnelId ?? null,
                activeFunnelStep: activeFunnel?.currentStepId ?? null,
                pendingTasks: c.tasks.length,
                lastMessageContent: lastMsg?.content ?? null,
                lastMessageDirection: lastMsg?.direction ?? null,
            };
        });
        const filtered = stage ? leads.filter((l) => l.kanbanStage === stage) : leads;
        const kanban = {};
        KANBAN_STAGES.forEach((s) => (kanban[s] = []));
        filtered.forEach((l) => {
            if (kanban[l.kanbanStage])
                kanban[l.kanbanStage].push(l);
            else
                kanban['Nuevo'].push(l);
        });
        return { total, page: parseInt(page), kanban, leads };
    }
    async createLead(tenantId, body) {
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId is required');
        if (!body.name || !body.phone)
            throw new common_1.BadRequestException('name and phone are required');
        const phoneNormalized = body.phone.replace(/[^0-9]/g, '');
        const contact = await this.prisma.contact.upsert({
            where: {
                tenantId_phoneNormalized: { tenantId, phoneNormalized },
            },
            update: {
                name: body.name,
                phone: body.phone,
            },
            create: {
                tenantId,
                name: body.name,
                phone: body.phone,
                phoneNormalized,
                externalId: `${phoneNormalized}@c.us`,
            },
        });
        await this.prisma.businessMemory.upsert({
            where: { contactId: contact.id },
            update: {
                name: body.name,
                company: body.company || null,
                interests: body.interests || [],
                tags: body.tags || [],
                leadStatus: body.leadStatus || 'COLD',
            },
            create: {
                contactId: contact.id,
                name: body.name,
                company: body.company || null,
                interests: body.interests || [],
                tags: body.tags || [],
                leadStatus: body.leadStatus || 'COLD',
            },
        });
        return { success: true, leadId: contact.id };
    }
    async getLead(id, tenantId) {
        const contact = await this.prisma.contact.findFirst({
            where: { id, tenantId },
            include: {
                memory: true,
                conversations: {
                    include: {
                        interactions: {
                            orderBy: { timestamp: 'asc' },
                            take: 100,
                        },
                        activeFunnel: true,
                        _count: { select: { interactions: true } },
                    },
                    orderBy: { id: 'desc' },
                },
                tasks: { orderBy: { createdAt: 'desc' } },
            },
        });
        if (!contact)
            return { error: 'Lead not found' };
        const totalInteractions = contact.conversations.reduce((sum, c) => sum + c._count.interactions, 0);
        const score = computeScore(contact.memory, contact.conversations.length, totalInteractions);
        return {
            id: contact.id,
            name: contact.name,
            phone: contact.phone,
            company: contact.memory?.company ?? null,
            leadStatus: contact.memory?.leadStatus ?? 'NEW',
            score,
            interests: contact.memory?.interests ?? [],
            objections: contact.memory?.objections ?? [],
            tags: contact.memory?.tags ?? [],
            lastInteraction: contact.memory?.lastInteraction ?? null,
            conversations: contact.conversations.map((c) => ({
                id: c.id,
                status: c.status,
                messageCount: c._count.interactions,
                activeFunnel: c.activeFunnel
                    ? { funnelId: c.activeFunnel.funnelId, step: c.activeFunnel.currentStepId }
                    : null,
                messages: c.interactions.map((m) => ({
                    id: m.id,
                    direction: m.direction,
                    content: m.content,
                    role: m.role,
                    timestamp: m.timestamp,
                })),
            })),
            tasks: contact.tasks,
        };
    }
    async patchStage(id, body, tenantId) {
        const contact = await this.prisma.contact.findFirst({ where: { id, tenantId } });
        if (!contact)
            throw new common_1.NotFoundException('Lead not found');
        const stageToStatus = {
            Nuevo: 'COLD',
            Contactado: 'COLD',
            Interesado: 'WARM',
            Demo: 'WARM',
            Oferta: 'HOT',
            Venta: 'CLOSED',
            Cliente: 'CLOSED',
        };
        const leadStatus = stageToStatus[body.stage] ?? 'COLD';
        await this.prisma.businessMemory.upsert({
            where: { contactId: id },
            update: { leadStatus },
            create: { contactId: id, leadStatus },
        });
        return { id, kanbanStage: body.stage, leadStatus };
    }
    async patchMemory(id, body, tenantId) {
        const contact = await this.prisma.contact.findFirst({ where: { id, tenantId } });
        if (!contact)
            throw new common_1.NotFoundException('Lead not found');
        if (body.name) {
            await this.prisma.contact.update({
                where: { id },
                data: { name: body.name },
            });
        }
        const memory = await this.prisma.businessMemory.upsert({
            where: { contactId: id },
            update: {
                name: body.name,
                company: body.company,
                interests: body.interests,
                tags: body.tags,
                leadStatus: body.leadStatus,
                objections: body.objections,
            },
            create: {
                contactId: id,
                name: body.name,
                company: body.company,
                interests: body.interests || [],
                tags: body.tags || [],
                leadStatus: body.leadStatus || 'COLD',
                objections: body.objections || [],
            },
        });
        return { id, memory };
    }
    async getAlerts(tenantId) {
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId is required');
        const [handoffConvs, closedLeads, hotLeads] = await Promise.all([
            this.prisma.conversation.findMany({
                where: {
                    contact: { tenantId },
                    status: 'HANDOFF',
                },
                include: {
                    contact: { include: { memory: true } },
                    interactions: { orderBy: { timestamp: 'desc' }, take: 1 },
                },
                orderBy: { id: 'desc' },
                take: 20,
            }),
            this.prisma.contact.findMany({
                where: {
                    tenantId,
                    memory: {
                        OR: [
                            { leadStatus: 'CLOSED' },
                            { tags: { has: 'PAGO_CONFIRMADO' } },
                        ],
                    },
                },
                include: {
                    memory: true,
                    conversations: {
                        include: {
                            interactions: { orderBy: { timestamp: 'desc' }, take: 1 },
                        },
                        take: 1,
                    },
                },
                orderBy: { id: 'desc' },
                take: 20,
            }),
            this.prisma.contact.findMany({
                where: {
                    tenantId,
                    memory: { leadStatus: 'HOT' },
                },
                include: {
                    memory: true,
                    conversations: {
                        include: {
                            interactions: { orderBy: { timestamp: 'desc' }, take: 1 },
                        },
                        take: 1,
                    },
                },
                orderBy: { id: 'desc' },
                take: 10,
            }),
        ]);
        const alerts = [];
        for (const contact of closedLeads) {
            const conv = contact.conversations[0];
            const lastMsg = conv?.interactions[0];
            alerts.push({
                id: `pay-${contact.id}`,
                type: 'PAYMENT',
                priority: 'CRITICAL',
                tagLabel: '📸 COMPROBANTE ENVIADO',
                title: '💰 Pago Confirmado / Comprobante Enviado',
                description: `${contact.name || contact.phone || 'Cliente'} envió comprobante de pago. Verifica los datos bancarios y confirma la entrega del kit.`,
                actionLabel: 'Ver Comprobante y Chat',
                contactId: contact.id,
                contactName: contact.name || 'Cliente',
                contactPhone: contact.phone || contact.externalId,
                conversationId: conv?.id || null,
                timestamp: lastMsg?.timestamp || contact.memory?.updatedAt || new Date(),
            });
        }
        for (const conv of handoffConvs) {
            const lastMsg = conv.interactions[0];
            const tags = conv.contact.memory?.tags || [];
            const isExplicitHumanRequest = tags.includes('HANDOFF_HUMANO') || tags.includes('ASESOR_SOLICITADO');
            const isWaitingHumanReply = lastMsg?.direction === 'INBOUND';
            const priority = isWaitingHumanReply ? 'HIGH' : 'LOW';
            alerts.push({
                id: `handoff-${conv.id}`,
                type: 'HANDOFF',
                priority,
                tagLabel: isExplicitHumanRequest ? '🚨 ASESOR SOLICITADO' : '⏸️ ATENCIÓN MANUAL',
                title: isExplicitHumanRequest ? '👤 ¡Solicitud de Asesor Humano!' : '⏸️ Bot en Pausa (Atención Manual)',
                description: isExplicitHumanRequest
                    ? `${conv.contact.name || conv.contact.phone || 'Prospecto'} pidió hablar con una persona real: "${lastMsg?.content?.substring(0, 80) || 'Esperando respuesta...'}"`
                    : `${conv.contact.name || conv.contact.phone || 'Prospecto'} requiere atención directa: "${lastMsg?.content?.substring(0, 80) || 'Pausado'}"`,
                actionLabel: 'Atender Chat Ahora',
                contactId: conv.contact.id,
                contactName: conv.contact.name || 'Prospecto',
                contactPhone: conv.contact.phone || conv.contact.externalId,
                conversationId: conv.id,
                isWaitingReply: isWaitingHumanReply,
                timestamp: lastMsg?.timestamp || new Date(),
            });
        }
        for (const contact of hotLeads) {
            const conv = contact.conversations[0];
            const lastMsg = conv?.interactions[0];
            alerts.push({
                id: `hot-${contact.id}`,
                type: 'HOT_LEAD',
                priority: 'MEDIUM',
                tagLabel: '🔥 LISTO PARA CIERRE',
                title: '🔥 Lead Caliente (Alta Intención)',
                description: `${contact.name || contact.phone || 'Prospecto'} consultó precios o cuentas de pago. Listo para concretar venta.`,
                actionLabel: 'Cerrar Venta',
                contactId: contact.id,
                contactName: contact.name || 'Prospecto',
                contactPhone: contact.phone || contact.externalId,
                conversationId: conv?.id || null,
                timestamp: lastMsg?.timestamp || contact.memory?.updatedAt || new Date(),
            });
        }
        alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const urgentCount = alerts.filter((a) => a.priority === 'CRITICAL' || a.priority === 'HIGH').length;
        return {
            urgentCount,
            totalAlerts: alerts.length,
            alerts,
        };
    }
    async deleteLead(id, tenantId) {
        const contact = await this.prisma.contact.findFirst({ where: { id, tenantId } });
        if (!contact)
            throw new common_1.NotFoundException('Lead not found');
        const convos = await this.prisma.conversation.findMany({ where: { contactId: id } });
        const convoIds = convos.map((c) => c.id);
        if (convoIds.length > 0) {
            await this.prisma.interaction.deleteMany({ where: { conversationId: { in: convoIds } } });
            await this.prisma.activeFunnel.deleteMany({ where: { conversationId: { in: convoIds } } });
            await this.prisma.conversation.deleteMany({ where: { id: { in: convoIds } } });
        }
        await this.prisma.task.deleteMany({ where: { contactId: id } });
        await this.prisma.memoryAuditLog.deleteMany({ where: { contactId: id } });
        await this.prisma.businessMemory.deleteMany({ where: { contactId: id } });
        await this.prisma.pendingOutboundMessage.deleteMany({ where: { contactId: id } });
        await this.prisma.contact.delete({ where: { id } });
        return { success: true, deletedId: id };
    }
};
exports.CrmController = CrmController;
__decorate([
    (0, common_1.Get)('leads'),
    __param(0, (0, tenant_id_decorator_1.TenantId)()),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('stage')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "getLeads", null);
__decorate([
    (0, common_1.Post)('leads'),
    __param(0, (0, tenant_id_decorator_1.TenantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "createLead", null);
__decorate([
    (0, common_1.Get)('leads/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "getLead", null);
__decorate([
    (0, common_1.Patch)('leads/:id/stage'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "patchStage", null);
__decorate([
    (0, common_1.Patch)('leads/:id/memory'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "patchMemory", null);
__decorate([
    (0, common_1.Get)('alerts'),
    __param(0, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "getAlerts", null);
__decorate([
    (0, common_1.Delete)('leads/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "deleteLead", null);
exports.CrmController = CrmController = __decorate([
    (0, common_1.Controller)('crm'),
    (0, common_1.UseGuards)(admin_api_key_guard_1.AdminApiKeyGuard, tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CrmController);
//# sourceMappingURL=crm.controller.js.map