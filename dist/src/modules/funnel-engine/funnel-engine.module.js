"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunnelEngineModule = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const funnel_engine_service_1 = require("./funnel-engine.service");
const funnel_controller_1 = require("./funnel.controller");
const funnel_generator_service_1 = require("./funnel-generator.service");
const automation_compiler_service_1 = require("./automation-compiler.service");
const database_module_1 = require("../../shared/database/database.module");
const runtime_engine_service_1 = require("./runtime/runtime-engine.service");
const node_executor_service_1 = require("./runtime/node-executor.service");
const runtime_logger_service_1 = require("./runtime/runtime-logger.service");
let FunnelEngineModule = class FunnelEngineModule {
};
exports.FunnelEngineModule = FunnelEngineModule;
exports.FunnelEngineModule = FunnelEngineModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, event_emitter_1.EventEmitterModule.forRoot()],
        controllers: [funnel_controller_1.FunnelController],
        providers: [
            funnel_engine_service_1.FunnelEngineService,
            funnel_generator_service_1.FunnelGeneratorService,
            automation_compiler_service_1.AutomationCompilerService,
            runtime_engine_service_1.RuntimeEngineService,
            node_executor_service_1.NodeExecutorService,
            runtime_logger_service_1.RuntimeLoggerService
        ],
        exports: [funnel_engine_service_1.FunnelEngineService, runtime_engine_service_1.RuntimeEngineService]
    })
], FunnelEngineModule);
//# sourceMappingURL=funnel-engine.module.js.map