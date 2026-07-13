"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessStudioModule = void 0;
const common_1 = require("@nestjs/common");
const business_studio_controller_1 = require("./business-studio.controller");
const business_studio_service_1 = require("./business-studio.service");
const database_module_1 = require("../../shared/database/database.module");
let BusinessStudioModule = class BusinessStudioModule {
};
exports.BusinessStudioModule = BusinessStudioModule;
exports.BusinessStudioModule = BusinessStudioModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule],
        controllers: [business_studio_controller_1.BusinessStudioController],
        providers: [business_studio_service_1.BusinessStudioService],
    })
], BusinessStudioModule);
//# sourceMappingURL=business-studio.module.js.map