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
let KosLoaderService = KosLoaderService_1 = class KosLoaderService {
    prisma;
    logger = new common_1.Logger(KosLoaderService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async load(tenantId) {
        try {
            const bundle = await this.prisma.knowledgeBundle.findUnique({
                where: { tenantId }
            });
            if (!bundle || !bundle.systemPrompt) {
                this.logger.warn(`No se encontró Knowledge Bundle para el tenant ${tenantId}`);
                return this.getFallbackBundle();
            }
            this.logger.log(`Knowledge Bundle cargado para tenant ${tenantId} (v${bundle.version})`);
            return bundle.systemPrompt;
        }
        catch (error) {
            this.logger.error(`Error cargando Knowledge Bundle para tenant ${tenantId}:`, error);
            return this.getFallbackBundle();
        }
    }
    getFallbackBundle() {
        return {
            instrucciones: "El Knowledge Bundle del tenant aún no fue configurado."
        };
    }
};
exports.KosLoaderService = KosLoaderService;
exports.KosLoaderService = KosLoaderService = KosLoaderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], KosLoaderService);
//# sourceMappingURL=kos-loader.service.js.map