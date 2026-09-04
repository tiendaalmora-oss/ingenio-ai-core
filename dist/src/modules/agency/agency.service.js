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
exports.AgencyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
let AgencyService = class AgencyService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createAgency(data) {
        const existing = await this.prisma.agency.findUnique({
            where: { ownerEmail: data.ownerEmail },
        });
        if (existing)
            throw new common_1.ConflictException('Ya existe una agencia con ese email.');
        return this.prisma.agency.create({
            data: {
                name: data.name,
                ownerEmail: data.ownerEmail,
                plan: data.plan ?? 'free',
            },
        });
    }
    async findAllAgencies() {
        return this.prisma.agency.findMany({
            include: { _count: { select: { subaccounts: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findAgencyById(id) {
        const agency = await this.prisma.agency.findUnique({
            where: { id },
            include: {
                subaccounts: {
                    select: { id: true, name: true, status: true, plan: true, createdAt: true },
                    orderBy: { createdAt: 'desc' },
                },
                users: true,
                _count: { select: { subaccounts: true } },
            },
        });
        if (!agency)
            throw new common_1.NotFoundException('Agencia no encontrada.');
        return agency;
    }
    async createSubaccount(agencyId, data) {
        const agency = await this.prisma.agency.findUnique({ where: { id: agencyId } });
        if (!agency)
            throw new common_1.NotFoundException('Agencia no encontrada.');
        const tenant = await this.prisma.tenant.create({
            data: {
                name: data.name,
                agencyId,
                plan: data.plan ?? 'starter',
                status: 'active',
            },
        });
        await this.prisma.knowledgeBundle.create({
            data: {
                tenantId: tenant.id,
                systemPrompt: {
                    business: { name: data.name, description: '', industry: '' },
                    products: [],
                    services: [],
                    faqs: [],
                    objections: [],
                    followUpSequences: [],
                },
                version: 1,
            },
        });
        return tenant;
    }
    async findSubaccountsByAgency(agencyId) {
        return this.prisma.tenant.findMany({
            where: { agencyId },
            include: {
                _count: { select: { contacts: true } },
                knowledgeBundle: { select: { version: true, updatedAt: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async updateSubaccountStatus(tenantId, status) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Subcuenta no encontrada.');
        return this.prisma.tenant.update({
            where: { id: tenantId },
            data: { status },
        });
    }
    async deleteSubaccount(tenantId) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Subcuenta no encontrada.');
        return this.prisma.tenant.update({
            where: { id: tenantId },
            data: { status: 'suspended' },
        });
    }
    async getAgencyStats(agencyId) {
        const [totalSubaccounts, activeSubaccounts, totalContacts] = await Promise.all([
            this.prisma.tenant.count({ where: { agencyId } }),
            this.prisma.tenant.count({ where: { agencyId, status: 'active' } }),
            this.prisma.contact.count({
                where: { tenant: { agencyId } },
            }),
        ]);
        return { totalSubaccounts, activeSubaccounts, totalContacts };
    }
    async getOverview() {
        const [agencies, unassignedTenants] = await Promise.all([
            this.prisma.agency.findMany({
                include: {
                    subaccounts: {
                        select: { id: true, name: true, status: true, plan: true, createdAt: true },
                        orderBy: { createdAt: 'desc' },
                    },
                    _count: { select: { subaccounts: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.tenant.findMany({
                where: { agencyId: null },
                select: { id: true, name: true, status: true, plan: true, createdAt: true },
                orderBy: { createdAt: 'asc' },
            }),
        ]);
        return { agencies, unassignedTenants };
    }
};
exports.AgencyService = AgencyService;
exports.AgencyService = AgencyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AgencyService);
//# sourceMappingURL=agency.service.js.map