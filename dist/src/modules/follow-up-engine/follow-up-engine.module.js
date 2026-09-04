"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowUpEngineModule = void 0;
const common_1 = require("@nestjs/common");
const follow_up_engine_service_1 = require("./services/follow-up-engine.service");
const follow_up_listener_1 = require("./listeners/follow-up.listener");
const follow_up_debug_controller_1 = require("./follow-up-debug.controller");
const database_module_1 = require("../../shared/database/database.module");
const llm_orchestrator_module_1 = require("../llm-orchestrator/llm-orchestrator.module");
const outbound_engine_module_1 = require("../outbound-engine/outbound-engine.module");
let FollowUpEngineModule = class FollowUpEngineModule {
};
exports.FollowUpEngineModule = FollowUpEngineModule;
exports.FollowUpEngineModule = FollowUpEngineModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, llm_orchestrator_module_1.LlmOrchestratorModule, outbound_engine_module_1.OutboundEngineModule],
        controllers: [follow_up_debug_controller_1.FollowUpDebugController],
        providers: [follow_up_engine_service_1.FollowUpEngineService, follow_up_listener_1.FollowUpListenerService],
        exports: [follow_up_engine_service_1.FollowUpEngineService],
    })
], FollowUpEngineModule);
//# sourceMappingURL=follow-up-engine.module.js.map