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
var DecisionPipelineManager_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecisionPipelineManager = void 0;
const common_1 = require("@nestjs/common");
const rule_registry_service_1 = require("../registry/rule-registry.service");
const tenant_resolver_service_1 = require("../../tenant/services/tenant-resolver.service");
let DecisionPipelineManager = DecisionPipelineManager_1 = class DecisionPipelineManager {
    ruleRegistry;
    tenantResolver;
    logger = new common_1.Logger(DecisionPipelineManager_1.name);
    constructor(ruleRegistry, tenantResolver) {
        this.ruleRegistry = ruleRegistry;
        this.tenantResolver = tenantResolver;
    }
    async process(request) {
        const startTime = performance.now();
        const rules = this.ruleRegistry.getRules();
        const tenantState = { status: 'ACTIVE' };
        const ctxTenantState = {
            isActive: tenantState.status === 'ACTIVE',
            isRateLimited: false,
            features: [],
        };
        const ctx = {
            request,
            tenantState: ctxTenantState,
            trace: { steps: [], totalRulesEvaluated: 0 },
            scratchpad: new Map(),
        };
        let failureModesTriggered = 0;
        for (const rule of rules) {
            const ruleStartTime = performance.now();
            let evaluation;
            let intercepted = false;
            try {
                evaluation = await rule.evaluate(ctx);
                intercepted = evaluation.isIntercepted;
            }
            catch (err) {
                this.logger.warn(`Rule ${rule.definition.ruleId} failed: ${err.message}. FailureMode: ${rule.definition.failureMode}`);
                failureModesTriggered++;
                if (rule.definition.failureMode === 'CLOSE') {
                    intercepted = true;
                    evaluation = {
                        isIntercepted: true,
                        route: 'FALLBACK',
                        reason: `Fail-Close triggered by rule ${rule.definition.ruleId}`,
                    };
                }
                else {
                    evaluation = { isIntercepted: false };
                }
            }
            const ruleTime = performance.now() - ruleStartTime;
            const traceEntry = {
                ruleId: rule.definition.ruleId,
                evaluationTimeMs: ruleTime,
                isIntercepted: intercepted,
                metadata: evaluation.metadata,
            };
            ctx.trace.steps.push(traceEntry);
            ctx.trace.totalRulesEvaluated++;
            if (intercepted && evaluation.route) {
                const pipelineDurationMs = performance.now() - startTime;
                return {
                    route: evaluation.route,
                    reason: evaluation.reason || `Intercepted by ${rule.definition.ruleId}`,
                    ruleId: rule.definition.ruleId,
                    metrics: {
                        pipelineDurationMs,
                        cacheHits: 0,
                        failureModesTriggered,
                    },
                    trace: ctx.trace,
                };
            }
        }
        const pipelineDurationMs = performance.now() - startTime;
        return {
            route: 'NEEDS_LLM',
            reason: 'Fallthrough to default LLM route',
            ruleId: 'DEFAULT',
            metrics: {
                pipelineDurationMs,
                cacheHits: 0,
                failureModesTriggered,
            },
            trace: ctx.trace,
        };
    }
};
exports.DecisionPipelineManager = DecisionPipelineManager;
exports.DecisionPipelineManager = DecisionPipelineManager = DecisionPipelineManager_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [rule_registry_service_1.RuleRegistryService,
        tenant_resolver_service_1.TenantResolverService])
], DecisionPipelineManager);
//# sourceMappingURL=decision-pipeline.manager.js.map