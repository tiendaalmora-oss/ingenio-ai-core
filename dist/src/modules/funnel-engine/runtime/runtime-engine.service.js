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
var RuntimeEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeEngineService = void 0;
const common_1 = require("@nestjs/common");
const node_executor_service_1 = require("./node-executor.service");
const runtime_logger_service_1 = require("./runtime-logger.service");
let RuntimeEngineService = RuntimeEngineService_1 = class RuntimeEngineService {
    executor;
    runtimeLogger;
    logger = new common_1.Logger(RuntimeEngineService_1.name);
    constructor(executor, runtimeLogger) {
        this.executor = executor;
        this.runtimeLogger = runtimeLogger;
    }
    parseReactFlowToDsl(reactFlowJson) {
        const nodes = reactFlowJson.nodes || [];
        const edges = reactFlowJson.edges || [];
        const steps = nodes.map((n) => {
            const step = {
                id: n.id,
                type: n.data?.type || 'event',
                name: n.data?.label || 'Unnamed',
                description: n.data?.description
            };
            const outgoingEdges = edges.filter((e) => e.source === n.id);
            if (step.type === 'condition') {
                const trueEdge = outgoingEdges.find((e) => e.sourceHandle === 'true');
                const falseEdge = outgoingEdges.find((e) => e.sourceHandle === 'false');
                if (trueEdge)
                    step.onTrue = trueEdge.target;
                if (falseEdge)
                    step.onFalse = falseEdge.target;
            }
            else {
                if (outgoingEdges.length > 0) {
                    step.next = outgoingEdges[0].target;
                }
            }
            return step;
        });
        return { steps };
    }
    async executeFlow(dsl, context) {
        this.logger.log(`Iniciando ejecución de flujo para tenant ${context.tenantId} (Session: ${context.sessionId})`);
        const triggerSteps = dsl.steps.filter(s => s.type === 'event');
        let currentStepId = triggerSteps.length > 0 ? triggerSteps[0].id : null;
        if (!currentStepId) {
            this.logger.warn('No se encontró nodo trigger inicial en el DSL.');
            return;
        }
        const maxSteps = 50;
        let stepsExecuted = 0;
        const stepMap = new Map();
        dsl.steps.forEach(s => stepMap.set(s.id, s));
        while (currentStepId && stepsExecuted < maxSteps) {
            const step = stepMap.get(currentStepId);
            if (!step) {
                this.logger.error(`Paso ${currentStepId} no encontrado en el DSL.`);
                break;
            }
            currentStepId = await this.executor.execute(step, context);
            stepsExecuted++;
        }
        this.runtimeLogger.logStep(context.tenantId, context.sessionId, 'END', 'system', `Ejecución finalizada. Pasos ejecutados: ${stepsExecuted}`);
    }
};
exports.RuntimeEngineService = RuntimeEngineService;
exports.RuntimeEngineService = RuntimeEngineService = RuntimeEngineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [node_executor_service_1.NodeExecutorService,
        runtime_logger_service_1.RuntimeLoggerService])
], RuntimeEngineService);
//# sourceMappingURL=runtime-engine.service.js.map