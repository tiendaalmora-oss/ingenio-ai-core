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
var KosLoaderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KosLoaderService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../shared/database/prisma.service");
const event_emitter_1 = require("@nestjs/event-emitter");
let KosLoaderService = KosLoaderService_1 = class KosLoaderService {
    prisma;
    logger = new common_1.Logger(KosLoaderService_1.name);
    cache = new Map();
    constructor(prisma) {
        this.prisma = prisma;
    }
    async load(tenantId) {
        this.cleanExpiredCache();
        const now = Date.now();
        const cached = this.cache.get(tenantId);
        if (cached) {
            this.logger.log(`Knowledge Bundle cache hit para tenant ${tenantId}`);
            return cached.bundle;
        }
        this.logger.log(`Knowledge Bundle cache miss para tenant ${tenantId}`);
        try {
            const bundle = await this.prisma.knowledgeBundle.findUnique({
                where: { tenantId }
            });
            if (!bundle || !bundle.systemPrompt) {
                this.logger.warn(`No se encontró Knowledge Bundle para el tenant ${tenantId}`);
                return this.getFallbackBundle();
            }
            this.logger.log(`Knowledge Bundle cargado para tenant ${tenantId} (v${bundle.version})`);
            const kosData = bundle.systemPrompt;
            let finalBundle = kosData;
            if (kosData && typeof kosData === 'object') {
                const rawObj = kosData._raw || {};
                const { _raw, ...rest } = kosData;
                finalBundle = {
                    ...rest,
                    ...rawObj,
                };
            }
            const ttlMs = parseInt(process.env.KOS_CACHE_TTL_MS || '300000', 10);
            this.cache.set(tenantId, {
                bundle: finalBundle,
                expiresAt: now + ttlMs,
            });
            return finalBundle;
        }
        catch (error) {
            this.logger.error(`Error cargando Knowledge Bundle para tenant ${tenantId}:`, error);
            return this.getFallbackBundle();
        }
    }
    cleanExpiredCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (value.expiresAt <= now) {
                this.cache.delete(key);
            }
        }
    }
    getFallbackBundle() {
        return {
            instrucciones: "Tenant sin configuración. No existe un Knowledge Bundle activo para este tenant."
        };
    }
    handleKnowledgeBaseUpdated(payload) {
        this.cache.delete(payload.tenantId);
        this.logger.log(`Knowledge Bundle cache invalidado para tenant ${payload.tenantId} debido a actualización desde BackOffice.`);
    }
};
exports.KosLoaderService = KosLoaderService;
__decorate([
    (0, event_emitter_1.OnEvent)('knowledge-base.updated', { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], KosLoaderService.prototype, "handleKnowledgeBaseUpdated", null);
exports.KosLoaderService = KosLoaderService = KosLoaderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], KosLoaderService);
//# sourceMappingURL=kos-loader.service.js.map