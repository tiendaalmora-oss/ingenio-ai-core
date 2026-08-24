import { Injectable, Logger } from '@nestjs/common';
import { RuleRegistryService } from '../registry/rule-registry.service';
import {
  DecisionContext,
  IDecisionRequest,
  DecisionResult,
  DecisionTraceEntry,
} from '../interfaces/decision-context.interface';
import { TenantResolverService } from '../../tenant/services/tenant-resolver.service';

@Injectable()
export class DecisionPipelineManager {
  private readonly logger = new Logger(DecisionPipelineManager.name);

  constructor(
    private readonly ruleRegistry: RuleRegistryService,
    private readonly tenantResolver: TenantResolverService,
  ) {}

  async process(request: IDecisionRequest): Promise<DecisionResult> {
    const startTime = performance.now();
    const rules = this.ruleRegistry.getRules();
    
    // Construct context
    // Hardcoded for now as TenantResolverService does not have resolve()
    const tenantState = { status: 'ACTIVE' };
    // Convert to ITenantState interface required by context
    const ctxTenantState = {
      isActive: tenantState.status === 'ACTIVE',
      isRateLimited: false,
      features: [],
    };

    const ctx: DecisionContext = {
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
      } catch (err) {
        this.logger.warn(
          `Rule ${rule.definition.ruleId} failed: ${(err as Error).message}. FailureMode: ${rule.definition.failureMode}`,
        );
        failureModesTriggered++;

        if (rule.definition.failureMode === 'CLOSE') {
          // Fail-Close immediately aborts with FALLBACK
          intercepted = true;
          evaluation = {
            isIntercepted: true,
            route: 'FALLBACK' as const,
            reason: `Fail-Close triggered by rule ${rule.definition.ruleId}`,
          };
        } else {
          // Fail-Open ignores the rule and continues
          evaluation = { isIntercepted: false };
        }
      }

      const ruleTime = performance.now() - ruleStartTime;

      const traceEntry: DecisionTraceEntry = {
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

    // Default Fallthrough Route
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
}
