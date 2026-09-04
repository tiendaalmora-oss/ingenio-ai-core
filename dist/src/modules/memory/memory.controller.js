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
exports.MemoryController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const admin_api_key_guard_1 = require("../../shared/guards/admin-api-key.guard");
const tenant_id_decorator_1 = require("../../shared/decorators/tenant-id.decorator");
let MemoryController = class MemoryController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getTimeline(tenantId, search, field, source, page = '1', limit = '50') {
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = { tenantId };
        if (field)
            where.field = field;
        if (source)
            where.source = source;
        if (search) {
            where.OR = [
                { newValue: { contains: search, mode: 'insensitive' } },
                { previousValue: { contains: search, mode: 'insensitive' } },
                { contactId: { contains: search, mode: 'insensitive' } },
                { skill: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [total, logs] = await Promise.all([
            this.prisma.memoryAuditLog.count({ where }),
            this.prisma.memoryAuditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit),
                include: {
                    memory: {
                        select: {
                            name: true,
                            company: true,
                            contact: { select: { name: true, phone: true, tenantId: true } },
                        },
                    },
                },
            }),
        ]);
        return {
            total,
            page: parseInt(page),
            data: logs.map(log => ({
                id: log.id,
                contactId: log.contactId,
                contactName: log.memory?.name ?? log.memory?.contact?.name ?? log.contactId,
                company: log.memory?.company ?? null,
                tenantId: log.memory?.contact?.tenantId ?? log.tenantId,
                field: log.field,
                previousValue: this._parse(log.previousValue),
                newValue: this._parse(log.newValue),
                source: log.source,
                skill: log.skill,
                confidence: log.confidence,
                conversationId: log.conversationId,
                createdAt: log.createdAt,
            })),
        };
    }
    async getContactMemory(contactId, tenantId) {
        const contactExists = await this.prisma.contact.findFirst({
            where: { id: contactId, tenantId },
        });
        if (!contactExists) {
            throw new common_1.NotFoundException(`Contact ${contactId} not found`);
        }
        const [memory, logs] = await Promise.all([
            this.prisma.businessMemory.findUnique({
                where: { contactId },
                include: {
                    contact: { select: { name: true, phone: true, tenantId: true } },
                },
            }),
            this.prisma.memoryAuditLog.findMany({
                where: { contactId },
                orderBy: { createdAt: 'desc' },
                take: 100,
            }),
        ]);
        if (!memory)
            return { contactId, memory: null, timeline: [] };
        const timeline = logs.map(l => ({
            id: l.id,
            field: l.field,
            previousValue: this._parse(l.previousValue),
            newValue: this._parse(l.newValue),
            source: l.source,
            skill: l.skill,
            confidence: l.confidence,
            conversationId: l.conversationId,
            createdAt: l.createdAt,
        }));
        return {
            contactId,
            contactName: memory.name ?? memory.contact.name,
            phone: memory.contact.phone,
            tenantId: memory.contact.tenantId,
            memory: {
                id: memory.id,
                name: memory.name,
                company: memory.company,
                interests: memory.interests,
                objections: memory.objections,
                leadStatus: memory.leadStatus,
                tags: memory.tags,
                lastInteraction: memory.lastInteraction,
                updatedAt: memory.updatedAt,
            },
            timeline,
        };
    }
    async getByCompany(tenantId) {
        const memories = await this.prisma.businessMemory.findMany({
            where: { company: { not: null }, contact: { tenantId } },
            include: {
                contact: { select: { tenantId: true } },
                auditLogs: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
        });
        const filtered = memories;
        const grouped = {};
        for (const m of filtered) {
            const co = m.company;
            if (!grouped[co]) {
                grouped[co] = { company: co, leads: [], totalInteractions: 0, lastActivity: null };
            }
            grouped[co].leads.push({
                contactId: m.contactId,
                name: m.name,
                interests: m.interests,
                leadStatus: m.leadStatus,
                updatedAt: m.updatedAt,
            });
            if (!grouped[co].lastActivity || m.updatedAt > grouped[co].lastActivity) {
                grouped[co].lastActivity = m.updatedAt;
            }
        }
        return { companies: Object.values(grouped) };
    }
    async getStats(tenantId) {
        const [totalMemories, totalLogs, recentLogs] = await Promise.all([
            this.prisma.businessMemory.count({
                where: { contact: { tenantId } }
            }),
            this.prisma.memoryAuditLog.count({
                where: { tenantId }
            }),
            this.prisma.memoryAuditLog.findMany({
                where: { tenantId },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: {
                    memory: { select: { name: true, company: true } },
                },
            }),
        ]);
        const fieldCounts = await this.prisma.memoryAuditLog.groupBy({
            by: ['field'],
            where: { tenantId },
            _count: { field: true },
        });
        return {
            totalLeadsWithMemory: totalMemories,
            totalLearningEvents: totalLogs,
            fieldBreakdown: fieldCounts.map(f => ({ field: f.field, count: f._count.field })),
            recentActivity: recentLogs.map(l => ({
                id: l.id,
                contactName: l.memory?.name ?? l.contactId,
                company: l.memory?.company,
                field: l.field,
                source: l.source,
                skill: l.skill,
                createdAt: l.createdAt,
            })),
        };
    }
    _parse(val) {
        if (val === null || val === undefined)
            return null;
        try {
            return JSON.parse(val);
        }
        catch {
            return val;
        }
    }
};
exports.MemoryController = MemoryController;
__decorate([
    (0, common_1.Get)('timeline'),
    __param(0, (0, tenant_id_decorator_1.TenantId)()),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('field')),
    __param(3, (0, common_1.Query)('source')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], MemoryController.prototype, "getTimeline", null);
__decorate([
    (0, common_1.Get)('contact/:contactId'),
    __param(0, (0, common_1.Param)('contactId')),
    __param(1, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MemoryController.prototype, "getContactMemory", null);
__decorate([
    (0, common_1.Get)('company'),
    __param(0, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MemoryController.prototype, "getByCompany", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MemoryController.prototype, "getStats", null);
exports.MemoryController = MemoryController = __decorate([
    (0, common_1.Controller)('memory'),
    (0, common_1.UseGuards)(admin_api_key_guard_1.AdminApiKeyGuard),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MemoryController);
//# sourceMappingURL=memory.controller.js.map