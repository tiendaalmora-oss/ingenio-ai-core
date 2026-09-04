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
exports.BootstrapService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const business_studio_service_1 = require("./business-studio.service");
let BootstrapService = class BootstrapService {
    prisma;
    studioService;
    constructor(prisma, studioService) {
        this.prisma = prisma;
        this.studioService = studioService;
    }
    async getBootstrap(tenantId) {
        const bundle = await this.prisma.knowledgeBundle.findUnique({
            where: { tenantId }
        });
        const tenantRecord = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { id: true, name: true, plan: true, status: true },
        });
        const menu = this.studioService.getMenu();
        const knowledgeSchema = this.studioService.getSchema();
        const [dashboard, status, stats, knowledgeBundle] = await Promise.all([
            this.studioService.getDashboard(tenantId, bundle),
            this.studioService.getStatus(tenantId, bundle),
            this.studioService.getStats(tenantId, bundle),
            this.studioService.getKnowledgeBase(tenantId, bundle),
        ]);
        const health = await this.studioService.getHealth(tenantId, status);
        return {
            menu,
            dashboard,
            status,
            health,
            stats,
            knowledgeSchema,
            knowledgeBundle,
            tenant: tenantId,
            tenantName: tenantRecord?.name ?? tenantId,
            tenantPlan: tenantRecord?.plan ?? 'starter',
            version: bundle?.version || 0,
            cacheStatus: bundle ? 'HIT' : 'MISSING',
            timestamp: new Date()
        };
    }
};
exports.BootstrapService = BootstrapService;
exports.BootstrapService = BootstrapService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        business_studio_service_1.BusinessStudioService])
], BootstrapService);
//# sourceMappingURL=bootstrap.service.js.map