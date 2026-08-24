import { Injectable, Inject } from '@nestjs/common';
import { IDecisionRule } from '../interfaces/decision-rule.interface';
import { DECISION_RULE_TOKEN } from '../constants/decision-engine.constants';

@Injectable()
export class RuleRegistryService {
  private sortedRules: IDecisionRule[];

  constructor(
    @Inject(DECISION_RULE_TOKEN)
    private readonly rules: IDecisionRule[],
  ) {
    this.sortedRules = [...this.rules].sort(
      (a, b) => a.definition.priority - b.definition.priority,
    );
  }

  getRules(): IDecisionRule[] {
    return this.sortedRules;
  }
}
