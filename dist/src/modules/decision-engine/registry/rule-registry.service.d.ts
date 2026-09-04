import { IDecisionRule } from '../interfaces/decision-rule.interface';
export declare class RuleRegistryService {
    private readonly rules;
    private sortedRules;
    constructor(rules: IDecisionRule[]);
    getRules(): IDecisionRule[];
}
