import { MessageRoute } from '../../../shared/event-bus';
import { DecisionContext } from './decision-context.interface';

export interface RuleDefinition {
  readonly ruleId: string;
  readonly version: string;
  readonly priority: number;
  readonly failureMode: 'OPEN' | 'CLOSE';
}

export interface RuleEvaluation {
  readonly isIntercepted: boolean;
  readonly route?: MessageRoute;
  readonly reason?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface IDecisionRule {
  readonly definition: RuleDefinition;
  evaluate(ctx: DecisionContext): Promise<RuleEvaluation>;
}
