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
exports.FunnelController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const funnel_generator_service_1 = require("./funnel-generator.service");
const automation_compiler_service_1 = require("./automation-compiler.service");
let FunnelController = class FunnelController {
    prisma;
    generator;
    compiler;
    constructor(prisma, generator, compiler) {
        this.prisma = prisma;
        this.generator = generator;
        this.compiler = compiler;
    }
    async generateFunnel(prompt) {
        const dsl = await this.generator.generateFunnel(prompt);
        const reactFlowGraph = this.compiler.compileToReactFlow(dsl);
        return reactFlowGraph;
    }
    async getFunnels(tenantId) {
        if (!tenantId)
            throw new common_1.BadRequestException('x-tenant-id header is required');
        return this.prisma.funnel.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' }
        });
    }
    async createFunnel(tenantId, body) {
        if (!tenantId)
            throw new common_1.BadRequestException('x-tenant-id header is required');
        return this.prisma.funnel.create({
            data: {
                tenantId,
                name: body.name || 'Nuevo Embudo',
                trigger: body.trigger || 'ANY',
                steps: body.steps || { nodes: [], edges: [] },
                isActive: true,
            }
        });
    }
    async updateFunnel(tenantId, id, body) {
        if (!tenantId)
            throw new common_1.BadRequestException('x-tenant-id header is required');
        return this.prisma.funnel.update({
            where: { id, tenantId },
            data: {
                name: body.name,
                trigger: body.trigger,
                steps: body.steps,
                isActive: body.isActive
            }
        });
    }
};
exports.FunnelController = FunnelController;
__decorate([
    (0, common_1.Post)('generate'),
    __param(0, (0, common_1.Body)('prompt')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FunnelController.prototype, "generateFunnel", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FunnelController.prototype, "getFunnels", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FunnelController.prototype, "createFunnel", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], FunnelController.prototype, "updateFunnel", null);
exports.FunnelController = FunnelController = __decorate([
    (0, common_1.Controller)('funnels'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        funnel_generator_service_1.FunnelGeneratorService,
        automation_compiler_service_1.AutomationCompilerService])
], FunnelController);
//# sourceMappingURL=funnel.controller.js.map