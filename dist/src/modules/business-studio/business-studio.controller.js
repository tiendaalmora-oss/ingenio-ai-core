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
exports.BusinessStudioController = void 0;
const common_1 = require("@nestjs/common");
const business_studio_service_1 = require("./business-studio.service");
const bootstrap_service_1 = require("./bootstrap.service");
const admin_api_key_guard_1 = require("../../shared/guards/admin-api-key.guard");
const tenant_guard_1 = require("../../shared/guards/tenant.guard");
const tenant_id_decorator_1 = require("../../shared/decorators/tenant-id.decorator");
let BusinessStudioController = class BusinessStudioController {
    studioService;
    bootstrapService;
    constructor(studioService, bootstrapService) {
        this.studioService = studioService;
        this.bootstrapService = bootstrapService;
    }
    async getBootstrap(tenantId) {
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId is required');
        return this.bootstrapService.getBootstrap(tenantId);
    }
    async getBundle(tenantId) {
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId is required');
        return this.studioService.getBundle(tenantId);
    }
    async getBundleSection(section, tenantId) {
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId is required');
        const bundle = await this.studioService.getBundle(tenantId);
        return bundle[section] || null;
    }
    async updateSection(section, data, tenantId, expectedVersion) {
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId is required');
        return this.studioService.updateSection(tenantId, section, data, expectedVersion ? parseInt(expectedVersion, 10) : undefined);
    }
    getMenu() {
        return this.studioService.getMenu();
    }
    async getStatus(tenantId) {
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId is required');
        return this.studioService.getStatus(tenantId);
    }
    async getHealth(tenantId) {
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId is required');
        return this.studioService.getHealth(tenantId);
    }
    async getStats(tenantId) {
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId is required');
        return this.studioService.getStats(tenantId);
    }
    getSchema() {
        return this.studioService.getSchema();
    }
    async getDashboard(tenantId) {
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId is required');
        return this.studioService.getDashboard(tenantId);
    }
    async getKnowledgeBase(tenantId) {
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId is required');
        return this.studioService.getKnowledgeBase(tenantId);
    }
    async updateKnowledgeBaseSection(section, data, tenantId, expectedVersion) {
        this.validateSection(tenantId, section);
        return this.studioService.updateSection(tenantId, section, data, expectedVersion ? parseInt(expectedVersion, 10) : undefined);
    }
    async getKnowledgeBaseSection(section, tenantId) {
        this.validateSection(tenantId, section);
        return this.studioService.getSection(tenantId, section);
    }
    async getItems(section, tenantId) {
        this.validateSection(tenantId, section);
        return this.studioService.getItems(tenantId, section);
    }
    async addItem(section, data, tenantId, expectedVersion) {
        this.validateSection(tenantId, section);
        return this.studioService.addItem(tenantId, section, data, expectedVersion ? parseInt(expectedVersion, 10) : undefined);
    }
    async updateItem(section, id, data, tenantId, expectedVersion) {
        this.validateSection(tenantId, section);
        return this.studioService.updateItem(tenantId, section, id, data, expectedVersion ? parseInt(expectedVersion, 10) : undefined);
    }
    async deleteItem(section, id, tenantId, expectedVersion) {
        this.validateSection(tenantId, section);
        return this.studioService.deleteItem(tenantId, section, id, expectedVersion ? parseInt(expectedVersion, 10) : undefined);
    }
    validateSection(tenantId, section) {
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId is required');
        const validSections = [
            'identidad', 'empresa', 'enrutamiento', 'reglasBot',
            'productos', 'categorias', 'servicios', 'faqs', 'objeciones',
            'scriptsComerciales', 'promociones', 'seguimientos', 'soporte', 'politicasAtencion'
        ];
        if (!validSections.includes(section)) {
            throw new common_1.BadRequestException(`Sección '${section}' no es válida para la Knowledge Base. Opciones válidas: ${validSections.join(', ')}`);
        }
    }
};
exports.BusinessStudioController = BusinessStudioController;
__decorate([
    (0, common_1.Get)('bootstrap'),
    __param(0, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BusinessStudioController.prototype, "getBootstrap", null);
__decorate([
    (0, common_1.Get)('bundle'),
    __param(0, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BusinessStudioController.prototype, "getBundle", null);
__decorate([
    (0, common_1.Get)('bundle/:section'),
    __param(0, (0, common_1.Param)('section')),
    __param(1, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BusinessStudioController.prototype, "getBundleSection", null);
__decorate([
    (0, common_1.Put)('bundle/:section'),
    __param(0, (0, common_1.Param)('section')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_id_decorator_1.TenantId)()),
    __param(3, (0, common_1.Headers)('x-knowledge-version')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], BusinessStudioController.prototype, "updateSection", null);
__decorate([
    (0, common_1.Get)('menu'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BusinessStudioController.prototype, "getMenu", null);
__decorate([
    (0, common_1.Get)('status'),
    __param(0, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BusinessStudioController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('health'),
    __param(0, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BusinessStudioController.prototype, "getHealth", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BusinessStudioController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('schema'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BusinessStudioController.prototype, "getSchema", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    __param(0, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BusinessStudioController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('knowledge-base'),
    __param(0, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BusinessStudioController.prototype, "getKnowledgeBase", null);
__decorate([
    (0, common_1.Put)('knowledge-base/:section'),
    __param(0, (0, common_1.Param)('section')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_id_decorator_1.TenantId)()),
    __param(3, (0, common_1.Headers)('x-knowledge-version')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], BusinessStudioController.prototype, "updateKnowledgeBaseSection", null);
__decorate([
    (0, common_1.Get)('knowledge-base/:section'),
    __param(0, (0, common_1.Param)('section')),
    __param(1, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BusinessStudioController.prototype, "getKnowledgeBaseSection", null);
__decorate([
    (0, common_1.Get)('knowledge-base/:section/items'),
    __param(0, (0, common_1.Param)('section')),
    __param(1, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BusinessStudioController.prototype, "getItems", null);
__decorate([
    (0, common_1.Post)('knowledge-base/:section/items'),
    __param(0, (0, common_1.Param)('section')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_id_decorator_1.TenantId)()),
    __param(3, (0, common_1.Headers)('x-knowledge-version')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], BusinessStudioController.prototype, "addItem", null);
__decorate([
    (0, common_1.Put)('knowledge-base/:section/items/:id'),
    __param(0, (0, common_1.Param)('section')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, tenant_id_decorator_1.TenantId)()),
    __param(4, (0, common_1.Headers)('x-knowledge-version')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, String, String]),
    __metadata("design:returntype", Promise)
], BusinessStudioController.prototype, "updateItem", null);
__decorate([
    (0, common_1.Delete)('knowledge-base/:section/items/:id'),
    __param(0, (0, common_1.Param)('section')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, tenant_id_decorator_1.TenantId)()),
    __param(3, (0, common_1.Headers)('x-knowledge-version')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], BusinessStudioController.prototype, "deleteItem", null);
exports.BusinessStudioController = BusinessStudioController = __decorate([
    (0, common_1.Controller)('business-studio'),
    (0, common_1.UseGuards)(admin_api_key_guard_1.AdminApiKeyGuard, tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [business_studio_service_1.BusinessStudioService,
        bootstrap_service_1.BootstrapService])
], BusinessStudioController);
//# sourceMappingURL=business-studio.controller.js.map