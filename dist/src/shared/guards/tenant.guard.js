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
var TenantGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const skip_tenant_guard_decorator_1 = require("./skip-tenant-guard.decorator");
const prisma_service_1 = require("../database/prisma.service");
let TenantGuard = TenantGuard_1 = class TenantGuard {
    reflector;
    prisma;
    logger = new common_1.Logger(TenantGuard_1.name);
    cache = new Map();
    cacheTtlMs;
    constructor(reflector, prisma) {
        this.reflector = reflector;
        this.prisma = prisma;
        this.cacheTtlMs = parseInt(process.env.TENANT_CACHE_TTL_MS ?? String(2 * 60 * 1000), 10);
    }
    async canActivate(context) {
        const skipGuard = this.reflector.getAllAndOverride(skip_tenant_guard_decorator_1.SKIP_TENANT_GUARD_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (skipGuard) {
            this.logger.debug(`[TenantGuard] Skipping for: ${context.getClass().name}.${context.getHandler().name}`);
            return true;
        }
        const request = context.switchToHttp().getRequest();
        let tenantId = request.headers?.['x-tenant-id'];
        if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '' || tenantId === 'default') {
            if (typeof this.prisma?.tenant?.findFirst === 'function') {
                const primaryTenant = await this.prisma.tenant.findFirst({ select: { id: true } });
                if (primaryTenant) {
                    tenantId = primaryTenant.id;
                    request.tenantId = tenantId;
                    return true;
                }
            }
            this.logger.warn('[TenantGuard] Missing or empty x-tenant-id header');
            throw new common_1.UnauthorizedException('Missing required header: x-tenant-id');
        }
        this.pruneExpiredEntries();
        const cached = this.cache.get(tenantId);
        if (cached && cached.expiresAt > Date.now()) {
            this.logger.debug(`[TenantGuard] Cache HIT for tenant ${tenantId}`);
            request.tenantId = tenantId;
            return true;
        }
        this.logger.debug(`[TenantGuard] Cache MISS — querying DB for tenant ${tenantId}`);
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { id: true },
        });
        if (!tenant) {
            this.logger.warn(`[TenantGuard] Tenant not found: ${tenantId}`);
            throw new common_1.UnauthorizedException(`Tenant "${tenantId}" does not exist.`);
        }
        this.cache.set(tenantId, {
            tenantId,
            expiresAt: Date.now() + this.cacheTtlMs,
        });
        this.logger.debug(`[TenantGuard] Tenant ${tenantId} validated and cached (TTL: ${this.cacheTtlMs}ms).`);
        request.tenantId = tenantId;
        return true;
    }
    pruneExpiredEntries() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (entry.expiresAt <= now) {
                this.cache.delete(key);
                this.logger.debug(`[TenantGuard] Evicted expired cache entry for tenant ${key}`);
            }
        }
    }
    clearCache() {
        this.cache.clear();
    }
    getCacheSize() {
        return this.cache.size;
    }
};
exports.TenantGuard = TenantGuard;
exports.TenantGuard = TenantGuard = TenantGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        prisma_service_1.PrismaService])
], TenantGuard);
//# sourceMappingURL=tenant.guard.js.map