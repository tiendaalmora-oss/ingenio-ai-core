import { EventMetadata } from '../../../shared/event-bus/interfaces/event.interface';
import { MessageRoute } from '../../../shared/event-bus';

export interface IDecisionRequest {
  readonly messageId: string;
  readonly correlationId: string;
  readonly tenantId: string;
  readonly channelId: string;
  readonly contactId: string;
  readonly messageType: string;
  readonly contentPreview: string;
  readonly metadata: EventMetadata;
}

export interface ITenantState {
  readonly isActive: boolean;
  readonly isRateLimited: boolean;
  readonly features: string[];
}

export interface DecisionTraceEntry {
  readonly ruleId: string;
  readonly evaluationTimeMs: number;
  readonly isIntercepted: boolean;
  readonly metadata?: Record<string, unknown>;
}

export interface DecisionTrace {
  steps: DecisionTraceEntry[];
  totalRulesEvaluated: number;
}

export interface DecisionMetrics {
  pipelineDurationMs: number;
  cacheHits: number;
  failureModesTriggered: number;
}

export interface DecisionContext {
  readonly request: IDecisionRequest;
  readonly tenantState: ITenantState;
  trace: DecisionTrace;
  readonly scratchpad: Map<string, unknown>;
}

export interface DecisionResult {
  readonly route: MessageRoute;
  readonly reason: string;
  readonly ruleId: string;
  readonly metrics: DecisionMetrics;
  readonly trace: DecisionTrace;
}
