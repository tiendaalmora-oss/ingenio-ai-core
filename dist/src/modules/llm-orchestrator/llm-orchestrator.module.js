"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LlmOrchestratorModule = void 0;
const common_1 = require("@nestjs/common");
const context_builder_service_1 = require("./services/context-builder.service");
const hermes_client_service_1 = require("./services/hermes-client.service");
const llm_listener_service_1 = require("./services/llm-listener.service");
let LlmOrchestratorModule = class LlmOrchestratorModule {
};
exports.LlmOrchestratorModule = LlmOrchestratorModule;
exports.LlmOrchestratorModule = LlmOrchestratorModule = __decorate([
    (0, common_1.Module)({
        imports: [],
        providers: [context_builder_service_1.ContextBuilderService, hermes_client_service_1.HermesClientService, llm_listener_service_1.LlmListenerService],
        exports: [],
    })
], LlmOrchestratorModule);
//# sourceMappingURL=llm-orchestrator.module.js.map