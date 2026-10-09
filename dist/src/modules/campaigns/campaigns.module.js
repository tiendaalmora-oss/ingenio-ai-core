"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignsModule = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../../shared/database/database.module");
const outbound_engine_module_1 = require("../outbound-engine/outbound-engine.module");
const campaigns_service_1 = require("./campaigns.service");
const campaigns_controller_1 = require("./campaigns.controller");
const campaign_drip_processor_1 = require("./processors/campaign-drip.processor");
const email_sender_service_1 = require("./services/email-sender.service");
const prisma_service_1 = require("../../shared/database/prisma.service");
let CampaignsModule = class CampaignsModule {
};
exports.CampaignsModule = CampaignsModule;
exports.CampaignsModule = CampaignsModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, outbound_engine_module_1.OutboundEngineModule],
        controllers: [campaigns_controller_1.CampaignsController],
        providers: [
            prisma_service_1.PrismaService,
            campaigns_service_1.CampaignsService,
            campaign_drip_processor_1.CampaignDripProcessor,
            email_sender_service_1.EmailSenderService,
        ],
        exports: [campaigns_service_1.CampaignsService],
    })
], CampaignsModule);
//# sourceMappingURL=campaigns.module.js.map