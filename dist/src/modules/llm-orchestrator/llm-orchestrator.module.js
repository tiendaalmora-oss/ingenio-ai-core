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
const llm_listener_service_1 = require("./services/llm-listener.service");
const context_builder_service_1 = require("./services/context-builder.service");
const hermes_client_service_1 = require("./services/hermes-client.service");
const kos_loader_service_1 = require("./services/kos-loader.service");
const database_module_1 = require("../../shared/database/database.module");
const funnel_engine_module_1 = require("../funnel-engine/funnel-engine.module");
const ai_provider_factory_1 = require("./providers/ai-provider.factory");
let LlmOrchestratorModule = class LlmOrchestratorModule {
};
exports.LlmOrchestratorModule = LlmOrchestratorModule;
exports.LlmOrchestratorModule = LlmOrchestratorModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, funnel_engine_module_1.FunnelEngineModule],
        providers: [
            ai_provider_factory_1.AiProviderFactory,
            {
                provide: ai_provider_factory_1.AI_PROVIDER_TOKEN,
                useFactory: (factory) => factory.create(),
                inject: [ai_provider_factory_1.AiProviderFactory],
            },
            llm_listener_service_1.LlmListenerService,
            context_builder_service_1.ContextBuilderService,
            hermes_client_service_1.HermesClientService,
            kos_loader_service_1.KosLoaderService,
        ],
    })
], LlmOrchestratorModule);
//# sourceMappingURL=llm-orchestrator.module.js.map