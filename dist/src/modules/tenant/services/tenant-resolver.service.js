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
var TenantResolverService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantResolverService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../shared/database/prisma.service");
const PROD_MAIN_TENANT_ID = 'dba1c54c-89c6-41e9-ae9d-03613377a5b3';
let TenantResolverService = TenantResolverService_1 = class TenantResolverService {
    prisma;
    logger = new common_1.Logger(TenantResolverService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async resolveFromWahaSession(sessionName) {
        const cleanSession = (sessionName || '').trim();
        if (!cleanSession || cleanSession === 'default' || cleanSession === 'ferreos') {
            const prodTenant = await this.prisma.tenant.findFirst({
                where: {
                    OR: [
                        { id: PROD_MAIN_TENANT_ID },
                        { wahaSession: 'ferreos' }
                    ]
                },
                select: { id: true }
            });
            if (prodTenant)
                return prodTenant.id;
            return PROD_MAIN_TENANT_ID;
        }
        const exactTenant = await this.prisma.tenant.findUnique({
            where: { wahaSession: cleanSession },
            select: { id: true }
        });
        if (exactTenant) {
            return exactTenant.id;
        }
        if (cleanSession.startsWith('sub_')) {
            const rawIdPrefix = cleanSession.replace(/^sub_/, '');
            const tenantByPrefix = await this.prisma.tenant.findFirst({
                where: {
                    id: { startsWith: rawIdPrefix.slice(0, 8) }
                },
                select: { id: true }
            });
            if (tenantByPrefix) {
                return tenantByPrefix.id;
            }
        }
        this.logger.warn(`[TenantResolver] No se encontró tenant exacto para wahaSession="${cleanSession}". Usando cuenta principal de producción por contingencia.`);
        const fallbackTenant = await this.prisma.tenant.findFirst({
            where: {
                OR: [
                    { id: PROD_MAIN_TENANT_ID },
                    { wahaSession: 'ferreos' }
                ]
            },
            select: { id: true }
        });
        if (fallbackTenant)
            return fallbackTenant.id;
        const anyTenant = await this.prisma.tenant.findFirst({ select: { id: true } });
        if (anyTenant)
            return anyTenant.id;
        return PROD_MAIN_TENANT_ID;
    }
};
exports.TenantResolverService = TenantResolverService;
exports.TenantResolverService = TenantResolverService = TenantResolverService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TenantResolverService);
//# sourceMappingURL=tenant-resolver.service.js.map