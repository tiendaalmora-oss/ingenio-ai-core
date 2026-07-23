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
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const health_service_1 = require("./health.service");
const prisma_service_1 = require("../../shared/database/prisma.service");
let HealthController = class HealthController {
    healthService;
    prisma;
    constructor(healthService, prisma) {
        this.healthService = healthService;
        this.prisma = prisma;
    }
    async dump() {
        const [t, c, co] = await Promise.all([
            this.prisma.tenant.findMany(),
            this.prisma.contact.findMany(),
            this.prisma.conversation.findMany()
        ]);
        return { tenants: t, contacts: c, conversations: co };
    }
    async getSystemStatus() {
        return this.healthService.getSystemStatus();
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)('debug/dump'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "dump", null);
__decorate([
    (0, common_1.Get)('system-status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "getSystemStatus", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)('health'),
    __metadata("design:paramtypes", [health_service_1.HealthService,
        prisma_service_1.PrismaService])
], HealthController);
//# sourceMappingURL=health.controller.js.map