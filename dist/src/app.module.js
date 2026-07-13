"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const crm_module_1 = require("./modules/crm/crm.module");
const fake_module_1 = require("./modules/fake/fake.module");
const conversation_module_1 = require("./modules/conversation/conversation.module");
const llm_orchestrator_module_1 = require("./modules/llm-orchestrator/llm-orchestrator.module");
const outbound_engine_module_1 = require("./modules/outbound-engine/outbound-engine.module");
const skill_engine_module_1 = require("./modules/skill-engine/skill-engine.module");
const database_module_1 = require("./shared/database/database.module");
const business_studio_module_1 = require("./modules/business-studio/business-studio.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            event_emitter_1.EventEmitterModule.forRoot({
                wildcard: true,
                delimiter: '.',
            }),
            database_module_1.DatabaseModule,
            crm_module_1.CrmModule,
            conversation_module_1.ConversationModule,
            llm_orchestrator_module_1.LlmOrchestratorModule,
            outbound_engine_module_1.OutboundEngineModule,
            skill_engine_module_1.SkillEngineModule,
            fake_module_1.FakeModule,
            business_studio_module_1.BusinessStudioModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map