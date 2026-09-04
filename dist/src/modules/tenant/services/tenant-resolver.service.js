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
let TenantResolverService = TenantResolverService_1 = class TenantResolverService {
    prisma;
    logger = new common_1.Logger(TenantResolverService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async resolveFromWahaSession(sessionName) {
        if (!sessionName) {
            throw new common_1.NotFoundException('WAHA session name is required to resolve tenant');
        }
        const tenant = await this.prisma.tenant.findUnique({
            where: { wahaSession: sessionName },
        });
        if (tenant) {
            return tenant.id;
        }
        const allTenants = await this.prisma.tenant.findMany({ take: 2 });
        if (allTenants.length === 1) {
            this.logger.warn(`No tenant found for wahaSession="${sessionName}". ` +
                `Falling back to single tenant "${allTenants[0].id}" (wahaSession="${allTenants[0].wahaSession}").`);
            return allTenants[0].id;
        }
        throw new common_1.NotFoundException(`No tenant found for WAHA session: ${sessionName}`);
    }
};
exports.TenantResolverService = TenantResolverService;
exports.TenantResolverService = TenantResolverService = TenantResolverService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TenantResolverService);
//# sourceMappingURL=tenant-resolver.service.js.map