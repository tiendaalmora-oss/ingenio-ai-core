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
exports.DebugTenantController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const tenant_resolver_service_1 = require("./services/tenant-resolver.service");
let DebugTenantController = class DebugTenantController {
    prisma;
    tenantResolverService;
    constructor(prisma, tenantResolverService) {
        this.prisma = prisma;
        this.tenantResolverService = tenantResolverService;
    }
    async getTenantDebugInfo() {
        const tenants = await this.prisma.tenant.findMany({
            select: {
                id: true,
                name: true,
                wahaSession: true,
            },
        });
        const counts = [];
        for (const tenant of tenants) {
            const contacts = await this.prisma.contact.count({ where: { tenantId: tenant.id } });
            const conversations = await this.prisma.conversation.count({ where: { contact: { tenantId: tenant.id } } });
            const businessMemories = await this.prisma.businessMemory.count({ where: { contact: { tenantId: tenant.id } } });
            const knowledgeBundles = await this.prisma.knowledgeBundle.count({ where: { tenantId: tenant.id } });
            counts.push({
                tenantId: tenant.id,
                contacts,
                conversations,
                businessMemories,
                knowledgeBundles
            });
        }
        let resolveResult = null;
        let resolveError = null;
        try {
            resolveResult = await this.tenantResolverService.resolveFromWahaSession('default');
        }
        catch (err) {
            resolveError = err.message || String(err);
        }
        return {
            tenants,
            counts,
            resolutionTest: {
                session: 'default',
                success: !!resolveResult,
                result: resolveResult,
                error: resolveError,
            },
        };
    }
};
exports.DebugTenantController = DebugTenantController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DebugTenantController.prototype, "getTenantDebugInfo", null);
exports.DebugTenantController = DebugTenantController = __decorate([
    (0, common_1.Controller)('debug/tenant'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tenant_resolver_service_1.TenantResolverService])
], DebugTenantController);
//# sourceMappingURL=debug.controller.js.map