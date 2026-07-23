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
let BusinessStudioController = class BusinessStudioController {
    studioService;
    constructor(studioService) {
        this.studioService = studioService;
    }
    async getBundle(tenantId) {
        if (!tenantId)
            throw new common_1.BadRequestException('x-tenant-id header is required');
        return this.studioService.getBundle(tenantId);
    }
    async updateSection(section, data, tenantId) {
        if (!tenantId)
            throw new common_1.BadRequestException('x-tenant-id header is required');
        return this.studioService.updateSection(tenantId, section, data);
    }
};
exports.BusinessStudioController = BusinessStudioController;
__decorate([
    (0, common_1.Get)('bundle'),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BusinessStudioController.prototype, "getBundle", null);
__decorate([
    (0, common_1.Put)('bundle/:section'),
    __param(0, (0, common_1.Param)('section')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], BusinessStudioController.prototype, "updateSection", null);
exports.BusinessStudioController = BusinessStudioController = __decorate([
    (0, common_1.Controller)('business-studio'),
    __metadata("design:paramtypes", [business_studio_service_1.BusinessStudioService])
], BusinessStudioController);
//# sourceMappingURL=business-studio.controller.js.map