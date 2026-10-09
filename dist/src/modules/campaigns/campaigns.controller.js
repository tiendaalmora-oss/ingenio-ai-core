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
exports.CampaignsController = void 0;
const common_1 = require("@nestjs/common");
const campaigns_service_1 = require("./campaigns.service");
const admin_api_key_guard_1 = require("../../shared/guards/admin-api-key.guard");
const tenant_guard_1 = require("../../shared/guards/tenant.guard");
const tenant_id_decorator_1 = require("../../shared/decorators/tenant-id.decorator");
const create_campaign_dto_1 = require("./dto/create-campaign.dto");
let CampaignsController = class CampaignsController {
    campaignsService;
    constructor(campaignsService) {
        this.campaignsService = campaignsService;
    }
    async estimateAudience(tenantId, leadStatus, product, tags, channel) {
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId es requerido');
        const parsedTags = tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined;
        const filters = {
            leadStatus,
            product,
            tags: parsedTags,
            channel,
        };
        return this.campaignsService.estimateAudience(tenantId, filters);
    }
    async getFilterOptions(tenantId) {
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId es requerido');
        return this.campaignsService.getAvailableFilterOptions(tenantId);
    }
    async listCampaigns(tenantId) {
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId es requerido');
        return this.campaignsService.listCampaigns(tenantId);
    }
    async getCampaignDetails(tenantId, id) {
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId es requerido');
        return this.campaignsService.getCampaignDetails(tenantId, id);
    }
    async createCampaign(tenantId, body) {
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId es requerido');
        return this.campaignsService.createCampaign(tenantId, body);
    }
    async pauseCampaign(tenantId, id) {
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId es requerido');
        return this.campaignsService.pauseCampaign(tenantId, id);
    }
    async resumeCampaign(tenantId, id) {
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId es requerido');
        return this.campaignsService.resumeCampaign(tenantId, id);
    }
    async cancelCampaign(tenantId, id) {
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId es requerido');
        return this.campaignsService.cancelCampaign(tenantId, id);
    }
};
exports.CampaignsController = CampaignsController;
__decorate([
    (0, common_1.Get)('estimate'),
    __param(0, (0, tenant_id_decorator_1.TenantId)()),
    __param(1, (0, common_1.Query)('leadStatus')),
    __param(2, (0, common_1.Query)('product')),
    __param(3, (0, common_1.Query)('tags')),
    __param(4, (0, common_1.Query)('channel')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], CampaignsController.prototype, "estimateAudience", null);
__decorate([
    (0, common_1.Get)('filters'),
    __param(0, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CampaignsController.prototype, "getFilterOptions", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, tenant_id_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CampaignsController.prototype, "listCampaigns", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, tenant_id_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CampaignsController.prototype, "getCampaignDetails", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, tenant_id_decorator_1.TenantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_campaign_dto_1.CreateCampaignDto]),
    __metadata("design:returntype", Promise)
], CampaignsController.prototype, "createCampaign", null);
__decorate([
    (0, common_1.Post)(':id/pause'),
    __param(0, (0, tenant_id_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CampaignsController.prototype, "pauseCampaign", null);
__decorate([
    (0, common_1.Post)(':id/resume'),
    __param(0, (0, tenant_id_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CampaignsController.prototype, "resumeCampaign", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    __param(0, (0, tenant_id_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CampaignsController.prototype, "cancelCampaign", null);
exports.CampaignsController = CampaignsController = __decorate([
    (0, common_1.Controller)('campaigns'),
    (0, common_1.UseGuards)(admin_api_key_guard_1.AdminApiKeyGuard, tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [campaigns_service_1.CampaignsService])
], CampaignsController);
//# sourceMappingURL=campaigns.controller.js.map