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
exports.AgencyController = void 0;
const common_1 = require("@nestjs/common");
const agency_service_1 = require("./agency.service");
const admin_api_key_guard_1 = require("../../shared/guards/admin-api-key.guard");
class CreateAgencyDto {
    name;
    ownerEmail;
    plan;
}
class CreateSubaccountDto {
    name;
    plan;
}
class UpdateSubaccountStatusDto {
    status;
}
let AgencyController = class AgencyController {
    agencyService;
    constructor(agencyService) {
        this.agencyService = agencyService;
    }
    createAgency(body) {
        return this.agencyService.createAgency(body);
    }
    getOverview() {
        return this.agencyService.getOverview();
    }
    findAllAgencies() {
        return this.agencyService.findAllAgencies();
    }
    findAgency(id) {
        return this.agencyService.findAgencyById(id);
    }
    getStats(id) {
        return this.agencyService.getAgencyStats(id);
    }
    createSubaccount(agencyId, body) {
        return this.agencyService.createSubaccount(agencyId, body);
    }
    findSubaccounts(agencyId) {
        return this.agencyService.findSubaccountsByAgency(agencyId);
    }
    updateStatus(tenantId, body) {
        return this.agencyService.updateSubaccountStatus(tenantId, body.status);
    }
    deleteSubaccount(tenantId) {
        return this.agencyService.deleteSubaccount(tenantId);
    }
};
exports.AgencyController = AgencyController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateAgencyDto]),
    __metadata("design:returntype", void 0)
], AgencyController.prototype, "createAgency", null);
__decorate([
    (0, common_1.Get)('overview'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AgencyController.prototype, "getOverview", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AgencyController.prototype, "findAllAgencies", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AgencyController.prototype, "findAgency", null);
__decorate([
    (0, common_1.Get)(':id/stats'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AgencyController.prototype, "getStats", null);
__decorate([
    (0, common_1.Post)(':id/subaccounts'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateSubaccountDto]),
    __metadata("design:returntype", void 0)
], AgencyController.prototype, "createSubaccount", null);
__decorate([
    (0, common_1.Get)(':id/subaccounts'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AgencyController.prototype, "findSubaccounts", null);
__decorate([
    (0, common_1.Patch)('subaccounts/:tenantId/status'),
    __param(0, (0, common_1.Param)('tenantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateSubaccountStatusDto]),
    __metadata("design:returntype", void 0)
], AgencyController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Delete)('subaccounts/:tenantId'),
    __param(0, (0, common_1.Param)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AgencyController.prototype, "deleteSubaccount", null);
exports.AgencyController = AgencyController = __decorate([
    (0, common_1.Controller)('agency'),
    (0, common_1.UseGuards)(admin_api_key_guard_1.AdminApiKeyGuard),
    __metadata("design:paramtypes", [agency_service_1.AgencyService])
], AgencyController);
//# sourceMappingURL=agency.controller.js.map